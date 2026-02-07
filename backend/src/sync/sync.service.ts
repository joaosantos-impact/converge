import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CcxtService } from '../exchanges/ccxt.service';

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ccxt: CcxtService,
  ) {}

  /**
   * Check sync status for a user.
   */
  async getSyncStatus(userId: string) {
    const lastSync = await this.prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });

    const canSync =
      !lastSync ||
      Date.now() - lastSync.startedAt.getTime() >= SYNC_COOLDOWN_MS;

    const nextSyncAt = lastSync
      ? new Date(lastSync.startedAt.getTime() + SYNC_COOLDOWN_MS)
      : null;

    return {
      lastSync: lastSync
        ? {
            startedAt: lastSync.startedAt,
            finishedAt: lastSync.finishedAt,
            status: lastSync.status,
            synced: lastSync.synced,
            failed: lastSync.failed,
          }
        : null,
      canSync,
      nextSyncAt,
      cooldownMs: SYNC_COOLDOWN_MS,
    };
  }

  /**
   * Manual sync trigger for a user.
   */
  async triggerSync(userId: string) {
    // Rate limit check
    const recentSync = await this.prisma.syncLog.findFirst({
      where: {
        userId,
        startedAt: { gte: new Date(Date.now() - SYNC_COOLDOWN_MS) },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (recentSync) {
      const waitMs = Math.max(
        0,
        SYNC_COOLDOWN_MS -
          (Date.now() - recentSync.startedAt.getTime()),
      );
      if (waitMs > 0) {
        const waitMin = Math.max(1, Math.ceil(waitMs / 60000));
        return {
          error: `Aguarda ${waitMin} minuto${waitMin > 1 ? 's' : ''} antes de sincronizar novamente.`,
          retryAfter: waitMs,
          statusCode: 429,
        };
      }
    }

    const syncLog = await this.prisma.syncLog.create({
      data: { userId, status: 'running' },
    });

    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId, isActive: true },
    });

    if (accounts.length === 0) {
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          synced: 0,
          failed: 0,
        },
      });
      return { success: true, synced: 0, failed: 0, totalValue: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        await this.syncAccount(account);
        successful++;
      } catch (err) {
        this.logger.error(`Sync failed for ${account.name}:`, err);
        failed++;
      }
    }

    // Create portfolio snapshot
    const totalUsdValue = await this.calculateTotalValue(userId);

    const previousSnapshot = await this.prisma.portfolioSnapshot.findFirst({
      where: {
        userId,
        timestamp: { lte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'desc' },
    });

    const totalPnl = previousSnapshot
      ? totalUsdValue - previousSnapshot.totalUsdValue
      : 0;
    const totalPnlPercent =
      previousSnapshot && previousSnapshot.totalUsdValue > 0
        ? ((totalUsdValue - previousSnapshot.totalUsdValue) /
            previousSnapshot.totalUsdValue) *
          100
        : 0;

    await this.prisma.portfolioSnapshot.create({
      data: { userId, totalUsdValue, totalPnl, totalPnlPercent },
    });

    await this.prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        synced: successful,
        failed,
      },
    });

    // Fire-and-forget cleanup
    this.cleanupUserData(userId).catch((err) =>
      this.logger.error(`Cleanup failed for user ${userId}:`, err),
    );

    return {
      success: true,
      synced: successful,
      failed,
      totalValue: totalUsdValue,
    };
  }

  /**
   * Sync a single exchange account.
   * Uses UPSERT for balances (one row per asset per account).
   */
  async syncAccount(account: any) {
    const exchange = this.ccxt.createExchangeFromAccount(account);

    try {
      await exchange.loadMarkets();
    } catch (marketError) {
      this.logger.error(
        `Failed to load markets for ${account.exchange}:`,
        marketError,
      );
      throw new Error(
        `Cannot connect to ${account.exchange}: market data unavailable`,
      );
    }

    // 1. Fetch ALL tickers in a single API call
    const tickerMap = await this.ccxt.fetchAllTickers(exchange);

    // 2. Fetch and UPSERT balances (fix: no more duplicates)
    const balances = await this.ccxt.fetchBalance(exchange);

    if (balances.length > 0) {
      for (const balance of balances) {
        const usdValue = this.ccxt.getUsdValueFromTickers(
          tickerMap,
          balance.asset,
          balance.total,
        );

        await this.prisma.balance.upsert({
          where: {
            exchangeAccountId_asset: {
              exchangeAccountId: account.id,
              asset: balance.asset,
            },
          },
          update: {
            free: balance.free,
            locked: balance.locked,
            total: balance.total,
            usdValue,
          },
          create: {
            exchangeAccountId: account.id,
            asset: balance.asset,
            free: balance.free,
            locked: balance.locked,
            total: balance.total,
            usdValue,
          },
        });
      }

      // Remove balances for assets that no longer exist on the exchange
      const currentAssets = balances.map((b) => b.asset);
      await this.prisma.balance.deleteMany({
        where: {
          exchangeAccountId: account.id,
          asset: { notIn: currentAssets },
        },
      });
    }

    this.logger.log(
      `Synced ${balances.length} balances from ${account.name} (${account.exchange})`,
    );

    // 3. Incremental trade sync
    const lastTrade = await this.prisma.trade.findFirst({
      where: { exchangeAccountId: account.id },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    // First sync: fetch up to 5 years of trade history for comprehensive tax/FIFO tracking
    // Incremental syncs: only fetch from last known trade
    const sinceTime = lastTrade
      ? lastTrade.timestamp.getTime() + 1
      : Date.now() - 5 * 365 * 24 * 60 * 60 * 1000;

    // Include assets from current balances AND previously traded assets (to capture sells of sold-out positions)
    const balanceAssets = balances.map((b) => b.asset);
    const previouslyTradedAssets = await this.prisma.trade.findMany({
      where: { exchangeAccountId: account.id },
      select: { symbol: true },
      distinct: ['symbol'],
    });
    const tradedBaseAssets = previouslyTradedAssets.map((t) => t.symbol.split('/')[0]).filter(Boolean);
    const assets = [...new Set([...balanceAssets, ...tradedBaseAssets])];

    try {
      const trades = await this.ccxt.fetchAllTrades(
        exchange,
        assets,
        sinceTime,
      );

      if (trades.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < trades.length; i += CHUNK_SIZE) {
          const chunk = trades.slice(i, i + CHUNK_SIZE);
          await Promise.all(
            chunk.map((trade) =>
              this.prisma.trade.upsert({
                where: {
                  exchangeAccountId_exchangeTradeId: {
                    exchangeAccountId: account.id,
                    exchangeTradeId: trade.id,
                  },
                },
                update: {},
                create: {
                  exchangeAccountId: account.id,
                  exchangeTradeId: trade.id,
                  symbol: trade.symbol,
                  side: trade.side,
                  type: trade.type,
                  price: trade.price,
                  amount: trade.amount,
                  cost: trade.cost,
                  fee: trade.fee,
                  feeCurrency: trade.feeCurrency,
                  timestamp: trade.timestamp,
                },
              }),
            ),
          );
        }
        this.logger.log(
          `Synced ${trades.length} new trades from ${account.name}`,
        );
      }

      await this.prisma.exchangeAccount.update({
        where: { id: account.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncTradeCount: trades.length,
        },
      });
    } catch (tradeError) {
      this.logger.error(
        `Error syncing trades for ${account.name}:`,
        tradeError,
      );
      await this.prisma.exchangeAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      });
    }
  }

  /**
   * Calculate total portfolio value from current balances.
   */
  async calculateTotalValue(userId: string): Promise<number> {
    const balances = await this.prisma.balance.findMany({
      where: {
        exchangeAccount: { userId },
      },
      select: { usdValue: true },
    });

    return balances.reduce((sum, b) => sum + b.usdValue, 0);
  }

  /**
   * Sync all users (used by cron job).
   */
  async syncAllUsers(): Promise<{
    users: number;
    synced: number;
    failed: number;
  }> {
    const usersWithAccounts = await this.prisma.exchangeAccount.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = usersWithAccounts.map((u) => u.userId);
    this.logger.log(
      `[CRON] Found ${userIds.length} users with active accounts`,
    );

    let totalSynced = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.syncUserForCron(userId);
        totalSynced += result.synced;
        totalFailed += result.failed;
      } catch (error) {
        this.logger.error(`[CRON] Failed to sync user ${userId}:`, error);
        totalFailed++;
      }
    }

    await this.globalCleanup();

    return { users: userIds.length, synced: totalSynced, failed: totalFailed };
  }

  private async syncUserForCron(
    userId: string,
  ): Promise<{ synced: number; failed: number }> {
    const accounts = await this.prisma.exchangeAccount.findMany({
      where: { userId, isActive: true },
    });

    let synced = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        await this.syncAccount(account);
        synced++;
      } catch {
        failed++;
      }
    }

    if (synced > 0) {
      const totalUsdValue = await this.calculateTotalValue(userId);

      const prevSnapshot = await this.prisma.portfolioSnapshot.findFirst({
        where: {
          userId,
          timestamp: { lte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      const totalPnl = prevSnapshot
        ? totalUsdValue - prevSnapshot.totalUsdValue
        : 0;
      const totalPnlPercent =
        prevSnapshot && prevSnapshot.totalUsdValue > 0
          ? ((totalUsdValue - prevSnapshot.totalUsdValue) /
              prevSnapshot.totalUsdValue) *
            100
          : 0;

      await this.prisma.portfolioSnapshot.create({
        data: { userId, totalUsdValue, totalPnl, totalPnlPercent },
      });

      await this.prisma.syncLog.create({
        data: {
          userId,
          status: 'completed',
          finishedAt: new Date(),
          synced,
          failed,
        },
      });
    }

    return { synced, failed };
  }

  private async cleanupUserData(userId: string) {
    // Trim old sync logs (keep last 50)
    const syncLogs = await this.prisma.syncLog.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      skip: 50,
      select: { id: true },
    });

    if (syncLogs.length > 0) {
      await this.prisma.syncLog.deleteMany({
        where: { id: { in: syncLogs.map((l) => l.id) } },
      });
    }
  }

  private async globalCleanup() {
    // Aggregate old snapshots (>7 days: keep 1 per day)
    const snapshotCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldSnapshots = await this.prisma.portfolioSnapshot.findMany({
      where: { timestamp: { lt: snapshotCutoff } },
      orderBy: { timestamp: 'asc' },
      select: { id: true, userId: true, timestamp: true },
    });

    if (oldSnapshots.length > 0) {
      const byUserDay = new Map<string, string[]>();
      for (const snap of oldSnapshots) {
        const key = `${snap.userId}:${snap.timestamp.toISOString().slice(0, 10)}`;
        const ids = byUserDay.get(key) || [];
        ids.push(snap.id);
        byUserDay.set(key, ids);
      }

      const idsToDelete: string[] = [];
      for (const [, ids] of byUserDay) {
        if (ids.length <= 1) continue;
        idsToDelete.push(...ids.slice(0, -1));
      }

      if (idsToDelete.length > 0) {
        await this.prisma.portfolioSnapshot.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        this.logger.log(
          `[CRON] Aggregated ${idsToDelete.length} old snapshots`,
        );
      }
    }

    // Trim old sync logs (keep last 20 per user)
    const allUsers = await this.prisma.syncLog.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of allUsers) {
      const oldLogs = await this.prisma.syncLog.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip: 20,
        select: { id: true },
      });
      if (oldLogs.length > 0) {
        await this.prisma.syncLog.deleteMany({
          where: { id: { in: oldLogs.map((l) => l.id) } },
        });
      }
    }
  }
}
