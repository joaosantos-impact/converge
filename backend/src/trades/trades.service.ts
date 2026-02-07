import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  winRate: number;
  profitableTrades: number;
  losingTrades: number;
  bestTrade: number;
  worstTrade: number;
  averageProfit: number;
}

interface StatsCache {
  stats: TradingStats;
  tradesWithPnl: any[];
  total: number;
  timestamp: number;
  days: number;
  symbol: string | null;
}

const STATS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class TradesService {
  private readonly logger = new Logger(TradesService.name);
  private readonly statsCache = new Map<string, StatsCache>();

  constructor(private readonly prisma: PrismaService) {}

  async getTrades(
    userId: string,
    opts: {
      days: number;
      symbolFilter: string | null;
      sideFilter: string | null;
      exchangeFilter: string | null;
      page: number;
      limit: number;
    },
  ) {
    const { days, symbolFilter, sideFilter, exchangeFilter, page, limit } = opts;

    // Check cache (keyed without page/side/exchange filters — those are applied post-cache)
    const cacheKey = `${userId}:${days}:${symbolFilter || 'all'}`;
    const cached = this.statsCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < STATS_CACHE_TTL_MS) {
      return this.applyFiltersAndPaginate(cached.tradesWithPnl, cached.stats, {
        sideFilter,
        exchangeFilter,
        page,
        limit,
      });
    }

    const accountIds = await this.prisma.exchangeAccount.findMany({
      where: { userId },
      select: { id: true, exchange: true },
    });

    if (accountIds.length === 0) {
      return {
        trades: [],
        stats: this.emptyStats(),
        total: 0,
        page,
        limit,
        totalPages: 0,
        exchanges: [],
      };
    }

    const accountMap = new Map(accountIds.map((a) => [a.id, a.exchange]));
    const ids = accountIds.map((a) => a.id);

    const where: any = {
      exchangeAccountId: { in: ids },
    };

    // days=0 means "all time" — no date filter
    if (days > 0) {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.timestamp = { gte: startDate };
    }

    if (symbolFilter) {
      where.symbol = { contains: symbolFilter };
    }

    const MAX_TRADES_FOR_PNL = 10000;
    const [total, trades] = await Promise.all([
      this.prisma.trade.count({ where }),
      this.prisma.trade.findMany({
        where,
        select: {
          id: true,
          exchangeAccountId: true,
          symbol: true,
          side: true,
          type: true,
          price: true,
          amount: true,
          cost: true,
          fee: true,
          feeCurrency: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
        take: MAX_TRADES_FOR_PNL,
      }),
    ]);

    // Calculate P&L using average cost basis
    const symbolPositions = new Map<
      string,
      { position: number; totalCost: number; avgPrice: number }
    >();

    const tradesWithPnl = trades.map((t) => {
      const symbol = t.symbol;
      const pos = symbolPositions.get(symbol) || {
        position: 0,
        totalCost: 0,
        avgPrice: 0,
      };

      let pnl: number | null = null;
      let pnlPercent: number | null = null;
      let costBasis: number | null = null;

      if (t.side === 'buy') {
        pos.totalCost += t.cost;
        pos.position += t.amount;
        pos.avgPrice = pos.position > 0 ? pos.totalCost / pos.position : 0;
      } else if (t.side === 'sell' && pos.position > 0) {
        costBasis = pos.avgPrice * t.amount;
        pnl = t.cost - costBasis - t.fee;
        pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        pos.position -= t.amount;
        if (pos.position > 0) {
          pos.totalCost = pos.avgPrice * pos.position;
        } else {
          pos.totalCost = 0;
          pos.avgPrice = 0;
        }
      }

      symbolPositions.set(symbol, pos);

      return {
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        type: t.type,
        price: t.price,
        amount: t.amount,
        cost: t.cost,
        fee: t.fee,
        feeCurrency: t.feeCurrency,
        timestamp: t.timestamp,
        exchange: accountMap.get(t.exchangeAccountId) || '',
        pnl,
        pnlPercent,
        costBasis,
      };
    });

    const stats = this.calculateStats(tradesWithPnl);
    tradesWithPnl.reverse(); // Most recent first

    // Store in cache
    this.statsCache.set(cacheKey, {
      stats,
      tradesWithPnl,
      total,
      timestamp: now,
      days,
      symbol: symbolFilter,
    });

    // Evict old entries
    if (this.statsCache.size > 100) {
      const oldest = [...this.statsCache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      );
      for (let i = 0; i < 50; i++) {
        this.statsCache.delete(oldest[i][0]);
      }
    }

    return this.applyFiltersAndPaginate(tradesWithPnl, stats, {
      sideFilter,
      exchangeFilter,
      page,
      limit,
    });
  }

  private applyFiltersAndPaginate(
    allTrades: any[],
    stats: TradingStats,
    opts: {
      sideFilter: string | null;
      exchangeFilter: string | null;
      page: number;
      limit: number;
    },
  ) {
    const { sideFilter, exchangeFilter, page, limit } = opts;

    // Collect unique exchanges before filtering
    const exchanges = [...new Set(allTrades.map((t) => t.exchange).filter(Boolean))];

    // Apply side and exchange filters
    let filtered = allTrades;
    if (sideFilter) {
      filtered = filtered.filter((t) => t.side === sideFilter);
    }
    if (exchangeFilter) {
      filtered = filtered.filter((t) => t.exchange === exchangeFilter);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedTrades = filtered.slice(offset, offset + limit);

    return {
      trades: paginatedTrades,
      stats,
      total,
      page: safePage,
      limit,
      totalPages,
      exchanges,
    };
  }

  private emptyStats(): TradingStats {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalFees: 0,
      winRate: 0,
      profitableTrades: 0,
      losingTrades: 0,
      bestTrade: 0,
      worstTrade: 0,
      averageProfit: 0,
    };
  }

  private calculateStats(trades: any[]): TradingStats {
    if (trades.length === 0) return this.emptyStats();

    let totalVolume = 0;
    let totalFees = 0;
    let profitableTrades = 0;
    let losingTrades = 0;
    let totalPnl = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;

    for (const t of trades) {
      totalVolume += t.cost;
      totalFees += t.fee;

      if (t.pnl !== null) {
        if (t.pnl > 0) profitableTrades++;
        else losingTrades++;
        totalPnl += t.pnl;
        if (t.pnl > bestTrade) bestTrade = t.pnl;
        if (t.pnl < worstTrade) worstTrade = t.pnl;
      }
    }

    const totalSells = profitableTrades + losingTrades;

    return {
      totalTrades: trades.length,
      totalVolume,
      totalFees,
      winRate: totalSells > 0 ? (profitableTrades / totalSells) * 100 : 0,
      profitableTrades,
      losingTrades,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      averageProfit: totalSells > 0 ? totalPnl / totalSells : 0,
    };
  }
}
