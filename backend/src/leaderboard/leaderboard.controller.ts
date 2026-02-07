import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const participateSchema = z.object({ participate: z.boolean() });

const CACHE_TTL_MS = 5 * 60 * 1000;

@Controller('api/leaderboard')
export class LeaderboardController {
  private readonly logger = new Logger(LeaderboardController.name);
  private readonly rankingsCache = new Map<string, { data: any; timestamp: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getRankings(
    @Req() req: Request,
    @Query('period') period?: string,
    @Query('limit') limitParam?: string,
  ) {
    const effectivePeriod = period || 'all';
    const limit = parseInt(limitParam || '50');

    // Try to get current user (optional auth)
    let userId: string | null = null;
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
          else headers.set(key, value);
        }
      }
      const session = await this.authService.getSession(headers);
      userId = session?.user?.id || null;
    } catch {}

    const cacheKey = `${effectivePeriod}:${limit}`;
    let rankingsBase = this.getCached(cacheKey);

    if (!rankingsBase) {
      const profiles = await this.prisma.userProfile.findMany({
        where: { isPublic: true },
        orderBy: effectivePeriod === 'monthly'
          ? { monthlyPnlPercent: 'desc' }
          : { totalPnlPercent: 'desc' },
        take: limit,
      });

      const userIds = profiles.map((p) => p.userId);

      const [users, followerCounts] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, image: true },
        }),
        userIds.length > 0
          ? this.prisma.follow.groupBy({
              by: ['followingId'],
              where: { followingId: { in: userIds } },
              _count: true,
            })
          : Promise.resolve([]),
      ]);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const followerMap = new Map(
        followerCounts.map((f) => [f.followingId, f._count]),
      );

      rankingsBase = profiles.map((profile, index) => {
        const user = userMap.get(profile.userId);
        return {
          rank: index + 1,
          userId: profile.userId,
          displayName: profile.displayName || user?.name || 'Anónimo',
          image: user?.image,
          bio: profile.bio,
          pnlPercent:
            effectivePeriod === 'monthly'
              ? profile.monthlyPnlPercent
              : profile.totalPnlPercent,
          totalTrades: profile.totalTrades,
          winRate: profile.winRate,
          showBalance: profile.showBalance,
          followers: followerMap.get(profile.userId) || 0,
        };
      });

      this.setCache(cacheKey, rankingsBase);
    }

    let participating = false;
    let followingSet = new Set<string>();

    if (userId) {
      const rankedUserIds = rankingsBase.map((r: any) => r.userId);

      const [profile, following] = await Promise.all([
        this.prisma.userProfile.findUnique({
          where: { userId },
          select: { isPublic: true },
        }),
        rankedUserIds.length > 0
          ? this.prisma.follow.findMany({
              where: { followerId: userId, followingId: { in: rankedUserIds } },
              select: { followingId: true },
            })
          : Promise.resolve([]),
      ]);

      participating = profile?.isPublic ?? false;
      followingSet = new Set(following.map((f) => f.followingId));
    }

    const rankings = rankingsBase.map((r: any) => ({
      ...r,
      isFollowing: followingSet.has(r.userId),
      isCurrentUser: r.userId === userId,
    }));

    return { rankings, period: effectivePeriod, participating };
  }

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async toggleParticipation(@CurrentUser() user: any, @Body() body: any) {
    const parsed = participateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        isPublic: parsed.data.participate,
        displayName: user.name || user.email?.split('@')[0] || 'Trader',
      },
      update: { isPublic: parsed.data.participate },
    });

    this.rankingsCache.clear();
    return { participating: profile.isPublic };
  }

  private getCached(key: string): any | null {
    const entry = this.rankingsCache.get(key);
    if (!entry || Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.rankingsCache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any) {
    this.rankingsCache.set(key, { data, timestamp: Date.now() });
  }
}
