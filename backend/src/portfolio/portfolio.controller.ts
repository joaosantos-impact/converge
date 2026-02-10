import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TradesService } from '../trades/trades.service';

const rangeSchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).default('7d'),
});

@Controller('api/portfolio')
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tradesService: TradesService,
  ) {}

  /**
   * Asset stats with P&L computed in backend.
   * P&L = (valor atual + total vendas) - total compras
   */
  @Get('asset/:asset')
  @UseGuards(AuthGuard)
  async getAssetStats(
    @CurrentUser() user: any,
    @Param('asset') assetParam: string,
    @Res() res: Response,
  ) {
    const asset = (assetParam || '').trim().toUpperCase();
    if (!asset) {
      throw new HttpException('Asset inválido', HttpStatus.BAD_REQUEST);
    }

    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, exchange: true },
    });

    if (accounts.length === 0) {
      return res.json({
        asset,
        totalAmount: 0,
        totalValue: 0,
        totalBuyCost: 0,
        totalSellRevenue: 0,
        avgCost: 0,
        pnl: 0,
        pnlPercent: 0,
        exchanges: [],
        exchangeBreakdown: [],
        tradeCount: 0,
      });
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a.exchange]));
    const accountIds = accounts.map((a) => a.id);

    const [balances, assetStats] = await Promise.all([
      this.prisma.balance.findMany({
        where: {
          exchangeAccountId: { in: accountIds },
          asset,
          total: { gt: 0 },
        },
        select: { asset: true, total: true, usdValue: true, exchangeAccountId: true },
      }),
      this.tradesService.getAssetStats(user.id, asset),
    ]);

    const totalAmount = balances.reduce((s, b) => s + b.total, 0);
    const totalValue = balances.reduce((s, b) => s + b.usdValue, 0);

    const exchangeBreakdown = balances.map((b) => ({
      exchange: accountMap.get(b.exchangeAccountId) || '',
      amount: b.total,
      usdValue: b.usdValue,
    }));

    const exchanges = [...new Set(exchangeBreakdown.map((e) => e.exchange).filter(Boolean))];

    const { totalBuyCost, totalSellRevenue, totalAmountBought, tradeCount } = assetStats;

    // P&L = soma vendas + valor posição atual - soma compras
    const pnl = totalSellRevenue + totalValue - totalBuyCost;

    // Custo base = média (total compras / total unidades compradas)
    const avgCost = totalAmountBought > 0 ? totalBuyCost / totalAmountBought : 0;
    const costBasisForRoi = totalBuyCost > 0 ? totalBuyCost : 1;
    const pnlPercent = costBasisForRoi > 0 ? (pnl / costBasisForRoi) * 100 : 0;

    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

    return res.json({
      asset,
      totalAmount,
      totalValue,
      totalBuyCost,
      totalSellRevenue,
      avgCost,
      pnl,
      pnlPercent,
      exchanges,
      exchangeBreakdown,
      tradeCount,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  async getPortfolio(
    @CurrentUser() user: any,
    @Query('page') pageParam: string,
    @Query('perPage') perPageParam: string,
    @Query('search') searchParam: string,
    @Res() res: Response,
  ) {
    const userId = user.id;
    const page = Math.max(1, parseInt(pageParam) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(perPageParam) || 20));
    const search = (searchParam || '').trim().toLowerCase();

    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, exchange: true },
    });

    if (accounts.length === 0) {
      return res.json({
        totalValue: 0,
        totalUsdValue: 0,
        change24h: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        balances: [],
        exchanges: [],
        pagination: { page: 1, perPage, total: 0, totalPages: 0 },
      });
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a.exchange]));
    const accountIds = accounts.map((a) => a.id);

    // Fetch all balances for this user
    const allBalances = await this.prisma.balance.findMany({
      where: { exchangeAccountId: { in: accountIds } },
      select: {
        asset: true,
        free: true,
        locked: true,
        total: true,
        usdValue: true,
        exchangeAccountId: true,
      },
    });

    // Filter dust and map to response shape
    const rawBalances = allBalances
      .filter((b) => b.total > 0.0001)
      .map((b) => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked,
        total: b.total,
        amount: b.total,
        usdValue: b.usdValue,
        price: b.total > 0 ? b.usdValue / b.total : 0,
        exchange: accountMap.get(b.exchangeAccountId) || '',
      }));

    // Aggregate same asset across exchanges (keep per-exchange detail)
    const aggregateMap = new Map<
      string,
      {
        asset: string;
        totalAmount: number;
        totalValue: number;
        price: number;
        exchanges: string[];
        exchangeBreakdown: { exchange: string; amount: number; usdValue: number }[];
        percentOfPortfolio: number;
      }
    >();

    for (const b of rawBalances) {
      const existing = aggregateMap.get(b.asset);
      if (existing) {
        existing.totalAmount += b.amount;
        existing.totalValue += b.usdValue;
        if (b.exchange && !existing.exchanges.includes(b.exchange)) {
          existing.exchanges.push(b.exchange);
        }
        // Add to exchange breakdown
        const exEntry = existing.exchangeBreakdown.find((e) => e.exchange === b.exchange);
        if (exEntry) {
          exEntry.amount += b.amount;
          exEntry.usdValue += b.usdValue;
        } else {
          existing.exchangeBreakdown.push({ exchange: b.exchange, amount: b.amount, usdValue: b.usdValue });
        }
      } else {
        aggregateMap.set(b.asset, {
          asset: b.asset,
          totalAmount: b.amount,
          totalValue: b.usdValue,
          price: b.price,
          exchanges: b.exchange ? [b.exchange] : [],
          exchangeBreakdown: [{ exchange: b.exchange, amount: b.amount, usdValue: b.usdValue }],
          percentOfPortfolio: 0,
        });
      }
    }

    const totalValue = rawBalances.reduce((sum, b) => sum + b.usdValue, 0);

    // Calculate percentages and prices
    const aggregated = Array.from(aggregateMap.values());
    for (const a of aggregated) {
      a.price = a.totalAmount > 0 ? a.totalValue / a.totalAmount : 0;
      a.percentOfPortfolio = totalValue > 0 ? (a.totalValue / totalValue) * 100 : 0;
    }

    // Sort by value descending
    aggregated.sort((a, b) => b.totalValue - a.totalValue);

    // Apply search filter
    const filtered = search
      ? aggregated.filter((a) => a.asset.toLowerCase().includes(search))
      : aggregated;

    // Paginate
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * perPage;
    const balances = filtered.slice(offset, offset + perPage);

    // Exchange breakdown (always from full data, not paginated)
    const exchangeBreakdownMap = new Map<string, number>();
    rawBalances.forEach((b) => {
      exchangeBreakdownMap.set(
        b.exchange,
        (exchangeBreakdownMap.get(b.exchange) || 0) + b.usdValue,
      );
    });
    const exchanges = Array.from(exchangeBreakdownMap.entries()).map(
      ([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }),
    );

    // 24h P&L from snapshot
    const previousSnapshot = await this.prisma.portfolioSnapshot.findFirst({
      where: {
        userId,
        timestamp: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const change24h = previousSnapshot
      ? totalValue - previousSnapshot.totalUsdValue
      : 0;
    const totalPnlPercent =
      previousSnapshot && previousSnapshot.totalUsdValue > 0
        ? ((totalValue - previousSnapshot.totalUsdValue) /
            previousSnapshot.totalUsdValue) *
          100
        : 0;

    res.setHeader(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60',
    );

    return res.json({
      totalValue,
      totalUsdValue: totalValue,
      change24h,
      totalPnl: change24h,
      totalPnlPercent,
      balances,
      exchanges,
      pagination: {
        page: safePage,
        perPage,
        total,
        totalPages,
      },
    });
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getHistory(
    @CurrentUser() user: any,
    @Query('range') rangeParam: string,
    @Res() res: Response,
  ) {
    const parsed = rangeSchema.safeParse({ range: rangeParam || '7d' });
    if (!parsed.success) {
      throw new HttpException(
        'Parâmetro de range inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { range } = parsed.data;
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: {
        userId: user.id,
        timestamp: { gte: startDate },
      },
      select: { totalUsdValue: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    if (snapshots.length === 0) {
      return res.json([]);
    }

    let dataPoints = snapshots.map((s) => ({
      timestamp: s.timestamp.toISOString(),
      value: s.totalUsdValue,
    }));

    if (dataPoints.length > 200) {
      dataPoints = this.downsample(dataPoints, 200);
    }

    res.setHeader(
      'Cache-Control',
      'private, max-age=60, stale-while-revalidate=120',
    );

    return res.json(dataPoints);
  }

  /**
   * LTTB downsampling algorithm.
   */
  private downsample(
    data: { timestamp: string; value: number }[],
    targetCount: number,
  ): { timestamp: string; value: number }[] {
    if (data.length <= targetCount) return data;

    const result: { timestamp: string; value: number }[] = [];
    result.push(data[0]);

    const bucketSize = (data.length - 2) / (targetCount - 2);
    let prevIndex = 0;

    for (let i = 1; i < targetCount - 1; i++) {
      const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
      const bucketEnd = Math.min(
        Math.floor(i * bucketSize) + 1,
        data.length - 1,
      );

      const nextBucketStart = Math.floor(i * bucketSize) + 1;
      const nextBucketEnd = Math.min(
        Math.floor((i + 1) * bucketSize) + 1,
        data.length - 1,
      );
      let avgX = 0,
        avgY = 0,
        count = 0;
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += j;
        avgY += data[j].value;
        count++;
      }
      if (count > 0) {
        avgX /= count;
        avgY /= count;
      }

      let maxArea = -1;
      let maxIndex = bucketStart;
      const prevY = data[prevIndex].value;

      for (let j = bucketStart; j < bucketEnd; j++) {
        const area = Math.abs(
          (prevIndex - avgX) * (data[j].value - prevY) -
            (prevIndex - j) * (avgY - prevY),
        );
        if (area > maxArea) {
          maxArea = area;
          maxIndex = j;
        }
      }

      result.push(data[maxIndex]);
      prevIndex = maxIndex;
    }

    result.push(data[data.length - 1]);
    return result;
  }
}
