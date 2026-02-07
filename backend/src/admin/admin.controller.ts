import {
  Controller,
  Get,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStats() {
    const [totalUsers, totalTrades, totalExchangeAccounts, blogPosts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.trade.count(),
        this.prisma.exchangeAccount.count(),
        this.prisma.blogPost.count(),
      ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const growth: Record<string, number> = {};
    recentUsers.forEach((u) => {
      const day = u.createdAt.toISOString().split('T')[0];
      growth[day] = (growth[day] || 0) + 1;
    });

    const growthData = Object.entries(growth).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      totalUsers,
      totalTrades,
      totalExchangeAccounts,
      blogPosts,
      newUsersLast30d: recentUsers.length,
      growthData,
    };
  }
}
