import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalBuyCost: number;
  totalSellRevenue: number;
  totalPnl: number;
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
      yearFilter: number | null;
      symbolFilter: string | null;
      sideFilter: string | null;
      exchangeFilter: string | null;
      marketTypeFilter: string | null;
      page: number;
      limit: number;
    },
  ) {
    const { days, yearFilter, symbolFilter, sideFilter, exchangeFilter, marketTypeFilter, page, limit } = opts;

    // Check cache (keyed without page/side/exchange filters — those are applied post-cache)
    const cacheKey = `v3:${userId}:${days}:${yearFilter ?? 'all'}:${symbolFilter || 'all'}:${marketTypeFilter || 'all'}`;
    const cached = this.statsCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < STATS_CACHE_TTL_MS) {
      return this.applyFiltersAndPaginate(cached.tradesWithPnl, cached.stats, {
        sideFilter,
        exchangeFilter,
        marketTypeFilter,
        page,
        limit,
      });
    }

    const accountIds = await this.prisma.exchangeAccount.findMany({
      where: { userId },
      select: { id: true, exchange: true },
    });

    if (accountIds.length === 0) {
      this.logger.debug(`getTrades: no exchange accounts for user ${userId}`);
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
    const exchangeNames = [...new Set(accountIds.map((a) => a.exchange.toLowerCase()))];

    // Load delisted symbols for user's exchanges
    const delisted = await this.prisma.delistedSymbol.findMany({
      where: { exchange: { in: exchangeNames } },
      select: { exchange: true, symbol: true, marketType: true },
    });
    const delistedSet = new Set(
      delisted.map((d) => `${d.exchange}:${d.symbol}:${d.marketType}`),
    );

    const where: any = {
      exchangeAccountId: { in: ids },
    };

    if (yearFilter != null) {
      const yearStart = new Date(Date.UTC(yearFilter, 0, 1, 0, 0, 0, 0));
      const yearEnd = new Date(Date.UTC(yearFilter + 1, 0, 1, 0, 0, 0, 0));
      where.timestamp = { gte: yearStart, lt: yearEnd };
    } else if (days > 0) {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.timestamp = { gte: startDate };
    }

    if (symbolFilter) {
      where.OR = [
        { symbol: { startsWith: `${symbolFilter}/` } },
        { symbol: { equals: symbolFilter } },
      ];
    }

    if (marketTypeFilter) {
      where.marketType = marketTypeFilter;
    }

    // Taxes/FIFO need full history. 10k was truncating recent trades (e.g. 2025 sales).
    const MAX_TRADES_FOR_PNL = 100000;
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
          marketType: true,
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

    // Build price map for fee conversion (fee can be in PEPE, BNB, etc.)
    const fiatForPrices = trades.filter(
      (t) => t.marketType === 'spot' && TradesService.isCostInUsd(t.symbol),
    );
    const priceMap = TradesService.buildPriceMap(fiatForPrices);

    const symbolPositions = new Map<
      string,
      { position: number; totalCost: number; avgPrice: number }
    >();

    const tradesWithPnl = trades.map((t) => {
      const symbol = t.symbol;
      const useForPnl = t.marketType === 'spot' && TradesService.isCostInUsd(symbol);
      const feeUsd = TradesService.feeToUsd(
        t.fee ?? 0,
        t.feeCurrency ?? 'USDT',
        symbol,
        t.price,
        priceMap,
      );
      const pos = symbolPositions.get(symbol) || {
        position: 0,
        totalCost: 0,
        avgPrice: 0,
      };

      let pnl: number | null = null;
      let pnlPercent: number | null = null;
      let costBasis: number | null = null;

      if (useForPnl) {
        if (t.side === 'buy') {
          pos.totalCost += t.cost + feeUsd;
          pos.position += t.amount;
          pos.avgPrice = pos.position > 0 ? pos.totalCost / pos.position : 0;
        } else if (t.side === 'sell' && pos.position > 0) {
          costBasis = pos.avgPrice * t.amount;
          pnl = t.cost - feeUsd - costBasis;
          pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

          pos.position -= t.amount;
          if (pos.position > 0) {
            pos.totalCost = pos.avgPrice * pos.position;
          } else {
            pos.totalCost = 0;
            pos.avgPrice = 0;
          }
        }
      }

      symbolPositions.set(symbol, pos);

      const exchangeName = accountMap.get(t.exchangeAccountId) || '';
      const isDelisted = delistedSet.has(
        `${exchangeName.toLowerCase()}:${t.symbol}:${t.marketType}`,
      );
      return {
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        type: t.type,
        marketType: t.marketType,
        price: t.price,
        amount: t.amount,
        cost: t.cost,
        fee: t.fee,
        feeCurrency: t.feeCurrency,
        timestamp: t.timestamp,
        exchange: exchangeName,
        pnl,
        pnlPercent,
        costBasis,
        isDelisted,
      };
    });

    const stats = this.calculateStats(tradesWithPnl);

    // P&L simples: soma vendas + valor posição - soma compras (spot, moedas fiat)
    const fiatTrades = trades.filter(
      (t) => t.marketType === 'spot' && TradesService.isCostInUsd(t.symbol),
    );
    let totalBuyCost = 0;
    let totalSellRevenue = 0;
    let totalFeesUsd = 0;
    for (const t of fiatTrades) {
      const feeUsd = TradesService.feeToUsd(
        t.fee ?? 0,
        t.feeCurrency ?? 'USDT',
        t.symbol,
        t.price,
        priceMap,
      );
      totalFeesUsd += feeUsd;
      if (t.side === 'buy') totalBuyCost += t.cost + feeUsd;
      else totalSellRevenue += t.cost - feeUsd;
    }

    const assets = new Set<string>();
    for (const t of trades) {
      const base = t.symbol.split('/')[0]?.split(':')[0]?.trim();
      if (base) assets.add(base);
    }
    const assetList = Array.from(assets);
    const balances = assetList.length > 0
      ? await this.prisma.balance.findMany({
          where: {
            exchangeAccountId: { in: ids },
            asset: { in: assetList },
            total: { gt: 0 },
          },
          select: { usdValue: true },
        })
      : [];
    const totalValue = balances.reduce((s, b) => s + b.usdValue, 0);
    const totalPnl = totalSellRevenue + totalValue - totalBuyCost;

    stats.totalBuyCost = totalBuyCost;
    stats.totalSellRevenue = totalSellRevenue;
    stats.totalPnl = totalPnl;
    stats.totalFees = totalFeesUsd;
    tradesWithPnl.reverse(); // Most recent first

    if (total === 0 && trades.length === 0) {
      this.logger.debug(
        `getTrades: 0 trades for user ${userId} (accounts: ${ids.length}, days=${days}, symbolFilter=${symbolFilter || 'none'}, marketType=${marketTypeFilter || 'all'})`,
      );
    }

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

    const truncated = total > trades.length;
    if (truncated) {
      this.logger.warn(
        `getTrades: ${total} trades in DB but only ${trades.length} fetched (cap). Recent trades may be missing.`,
      );
    }

    return this.applyFiltersAndPaginate(tradesWithPnl, stats, {
      sideFilter,
      exchangeFilter,
      marketTypeFilter,
      page,
      limit,
      truncated: truncated ? total : undefined,
    });
  }

  private applyFiltersAndPaginate(
    allTrades: any[],
    stats: TradingStats,
    opts: {
      sideFilter: string | null;
      exchangeFilter: string | null;
      marketTypeFilter: string | null;
      page: number;
      limit: number;
      truncated?: number;
    },
  ) {
    const { sideFilter, exchangeFilter, marketTypeFilter, page, limit } = opts;

    // Collect unique exchanges before filtering
    const exchanges = [...new Set(allTrades.map((t) => t.exchange).filter(Boolean))];

    // Apply side, exchange and marketType filters
    let filtered = allTrades;
    if (sideFilter) {
      filtered = filtered.filter((t) => t.side === sideFilter);
    }
    if (exchangeFilter) {
      filtered = filtered.filter((t) => t.exchange === exchangeFilter);
    }
    if (marketTypeFilter) {
      filtered = filtered.filter((t) => t.marketType === marketTypeFilter);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedTrades = filtered.slice(offset, offset + limit);

    const result: any = {
      trades: paginatedTrades,
      stats,
      total,
      page: safePage,
      limit,
      totalPages,
      exchanges,
    };
    if (opts.truncated !== undefined) {
      result.truncated = opts.truncated;
    }
    return result;
  }

  private emptyStats(): TradingStats {
    return {
      totalTrades: 0,
      totalVolume: 0,
      totalFees: 0,
      totalBuyCost: 0,
      totalSellRevenue: 0,
      totalPnl: 0,
      winRate: 0,
      profitableTrades: 0,
      losingTrades: 0,
      bestTrade: 0,
      worstTrade: 0,
      averageProfit: 0,
    };
  }

  private static readonly USD_QUOTES = ['USDT', 'USD', 'USDC', 'BUSD', 'DAI', 'TUSD', 'EUR'];
  private static readonly STABLECOINS = new Set([
    'USDT', 'USD', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'FRAX', 'EUR',
  ]);

  private static isCostInUsd(symbol: string): boolean {
    const quote = symbol.split('/')[1];
    return quote ? TradesService.USD_QUOTES.includes(quote.toUpperCase()) : false;
  }

  /** Build asset -> USD price map from fiat-pair trades (most recent price per asset) */
  private static buildPriceMap(trades: { symbol: string; price: number }[]): Map<string, number> {
    const m = new Map<string, number>();
    const byTime = [...trades].reverse();
    for (const t of byTime) {
      const parts = t.symbol.split('/');
      const base = parts[0]?.toUpperCase();
      const quote = parts[1]?.split(':')[0]?.toUpperCase();
      if (base && quote && TradesService.STABLECOINS.has(quote) && !m.has(base)) {
        m.set(base, t.price);
      }
    }
    return m;
  }

  /** Convert fee to USD — fee can be in PEPE, BNB, USDT, etc. */
  private static feeToUsd(
    fee: number,
    feeCurrency: string,
    symbol: string,
    price: number,
    priceMap: Map<string, number>,
  ): number {
    if (!fee || fee <= 0) return 0;
    const fc = (feeCurrency || 'USDT').toUpperCase();
    if (TradesService.STABLECOINS.has(fc)) return fee;
    const p = priceMap.get(fc);
    if (p != null) return fee * p;
    const base = symbol.split('/')[0]?.toUpperCase();
    if (base === fc) return fee * price;
    return 0;
  }

  /**
   * Asset stats — SIMPLE:
   * - totalBuyCost = sum of all buy costs + fees (USD pairs only)
   * - totalSellRevenue = sum of all sell costs - fees (USD pairs only)
   * - P&L = totalSellRevenue + positionValue - totalBuyCost
   * - avgCost = totalBuyCost / totalAmountBought (for avg per unit)
   */
  async getAssetStats(
    userId: string,
    asset: string,
  ): Promise<{
    totalBuyCost: number;
    totalSellRevenue: number;
    totalAmountBought: number;
    tradeCount: number;
  }> {
    const accountIds = await this.prisma.exchangeAccount.findMany({
      where: { userId },
      select: { id: true },
    });
    if (accountIds.length === 0) {
      return { totalBuyCost: 0, totalSellRevenue: 0, totalAmountBought: 0, tradeCount: 0 };
    }

    const ids = accountIds.map((a) => a.id);
    const where = {
      exchangeAccountId: { in: ids },
      marketType: 'spot',
      OR: [
        { symbol: { startsWith: `${asset}/` } },
        { symbol: { equals: asset } },
      ],
    };

    const allTrades = await this.prisma.trade.findMany({
      where,
      select: { symbol: true, side: true, amount: true, cost: true, fee: true, feeCurrency: true, price: true },
    });

    const trades = allTrades.filter((t) => TradesService.isCostInUsd(t.symbol));
    const assetPriceMap = TradesService.buildPriceMap(trades);
    let totalBuyCost = 0;
    let totalSellRevenue = 0;
    let totalAmountBought = 0;

    for (const t of trades) {
      const feeUsd = TradesService.feeToUsd(
        t.fee ?? 0,
        t.feeCurrency ?? 'USDT',
        t.symbol,
        t.price,
        assetPriceMap,
      );
      if (t.side === 'buy') {
        totalBuyCost += t.cost + feeUsd;
        totalAmountBought += t.amount;
      } else {
        totalSellRevenue += t.cost - feeUsd;
      }
    }

    return {
      totalBuyCost,
      totalSellRevenue,
      totalAmountBought,
      tradeCount: allTrades.length,
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
      totalBuyCost: 0,
      totalSellRevenue: 0,
      totalPnl: 0,
      winRate: totalSells > 0 ? (profitableTrades / totalSells) * 100 : 0,
      profitableTrades,
      losingTrades,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      averageProfit: totalSells > 0 ? totalPnl / totalSells : 0,
    };
  }
}
