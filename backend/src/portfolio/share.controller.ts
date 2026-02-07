import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/portfolio/share')
export class ShareController {
  private readonly logger = new Logger(ShareController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  async createShare(@CurrentUser() user: any) {
    let profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      const shareToken = crypto.randomBytes(16).toString('hex');
      profile = await this.prisma.userProfile.create({
        data: {
          userId: user.id,
          isPublic: true,
          shareToken,
        },
      });
    } else if (!profile.shareToken) {
      const shareToken = crypto.randomBytes(16).toString('hex');
      profile = await this.prisma.userProfile.update({
        where: { id: profile.id },
        data: { shareToken },
      });
    }

    const shareUrl = `${process.env.BETTER_AUTH_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${profile.shareToken}`;

    return { shareToken: profile.shareToken, shareUrl };
  }

  @Delete()
  @UseGuards(AuthGuard)
  async revokeShare(@CurrentUser() user: any) {
    await this.prisma.userProfile.updateMany({
      where: { userId: user.id },
      data: { shareToken: null },
    });

    return { success: true };
  }

  @Get(':token')
  async getSharedPortfolio(@Param('token') token: string, @Res() res: Response) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { shareToken: token },
    });

    if (!profile || !profile.shareToken) {
      throw new HttpException(
        'Portfolio não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: profile.userId },
      select: { name: true, image: true },
    });

    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId: profile.userId, isActive: true },
      select: { id: true, exchange: true },
    });

    const accountIds = accounts.map((a) => a.id);
    const accountMap = new Map(accounts.map((a) => [a.id, a.exchange]));

    // With upsert model, balances are always current
    const allBalances = await this.prisma.balance.findMany({
      where: { exchangeAccountId: { in: accountIds } },
      select: {
        asset: true,
        total: true,
        usdValue: true,
        exchangeAccountId: true,
      },
    });

    let totalValue = 0;
    const balancesData = allBalances
      .filter((b) => b.total > 0.0001 && b.usdValue > 0.01)
      .map((b) => {
        totalValue += b.usdValue;
        return {
          asset: b.asset,
          amount: b.total,
          usdValue: b.usdValue,
          exchange: accountMap.get(b.exchangeAccountId) || '',
        };
      })
      .sort((a, b) => b.usdValue - a.usdValue);

    const balancesWithPercent = balancesData.map((b) => ({
      ...b,
      percent: totalValue > 0 ? (b.usdValue / totalValue) * 100 : 0,
    }));

    // Allocation
    const assetMap = new Map<
      string,
      { asset: string; usdValue: number; percent: number }
    >();
    for (const b of balancesWithPercent) {
      const existing = assetMap.get(b.asset);
      if (existing) {
        existing.usdValue += b.usdValue;
        existing.percent += b.percent;
      } else {
        assetMap.set(b.asset, {
          asset: b.asset,
          usdValue: b.usdValue,
          percent: b.percent,
        });
      }
    }
    const allocation = Array.from(assetMap.values()).sort(
      (a, b) => b.usdValue - a.usdValue,
    );

    // Trade activity
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const trades = await this.prisma.trade.findMany({
      where: {
        exchangeAccount: { userId: profile.userId },
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
      select: { symbol: true, side: true, cost: true, timestamp: true },
    });

    const dailyVolume = new Map<
      string,
      { date: string; buys: number; sells: number; volume: number }
    >();
    for (const t of trades) {
      const date = new Date(t.timestamp).toISOString().slice(0, 10);
      const existing = dailyVolume.get(date) || {
        date,
        buys: 0,
        sells: 0,
        volume: 0,
      };
      if (t.side === 'buy') existing.buys += t.cost;
      else existing.sells += t.cost;
      existing.volume += t.cost;
      dailyVolume.set(date, existing);
    }
    const tradeActivity = Array.from(dailyVolume.values());

    const showValues = profile.showBalance;

    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600',
    );

    return res.json({
      user: {
        name: profile.displayName || user?.name || 'Anónimo',
        image: user?.image,
      },
      portfolio: {
        totalValue: showValues ? totalValue : null,
        balances: showValues
          ? balancesWithPercent
          : balancesWithPercent.map((b) => ({
              asset: b.asset,
              exchange: b.exchange,
              percent: b.percent,
            })),
        allocation,
        showValues,
        assetCount: balancesData.length,
        exchangeCount: new Set(balancesData.map((b) => b.exchange)).size,
      },
      stats: {
        totalPnlPercent: profile.showPerformance
          ? profile.totalPnlPercent
          : null,
        monthlyPnlPercent: profile.showPerformance
          ? profile.monthlyPnlPercent
          : null,
        totalTrades: profile.totalTrades,
        winRate: profile.showPerformance ? profile.winRate : null,
      },
      tradeActivity: profile.showPerformance ? tradeActivity : [],
      memberSince: profile.createdAt,
    });
  }
}
