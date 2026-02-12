/**
 * Shared FIFO (First In First Out) logic for P&L calculations.
 * Used by both taxes and analytics pages to ensure consistent numbers.
 */

import type { TradeData } from '@/lib/types';

const STABLECOINS = new Set([
  'USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'FRAX', 'EUR',
]);

export function buildAssetPriceMap(trades: TradeData[]): Map<string, number> {
  const m = new Map<string, number>();
  const byTime = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  for (const t of byTime) {
    const parts = t.symbol.split('/');
    const base = parts[0]?.toUpperCase();
    const quote = parts[1]?.split(':')[0]?.toUpperCase();
    if (base && quote && STABLECOINS.has(quote) && !m.has(base)) {
      m.set(base, t.price);
    }
  }
  return m;
}

export function feeToUsd(trade: TradeData, priceMap: Map<string, number>): number {
  const fee = trade.fee || 0;
  if (fee <= 0) return 0;
  const fc = (trade.feeCurrency || 'USDT').toUpperCase();
  if (STABLECOINS.has(fc)) return fee;
  const price = priceMap.get(fc);
  if (price != null) return fee * price;
  const [base, quote] = (trade.symbol || '').split('/');
  const baseNorm = base?.toUpperCase();
  const quoteNorm = quote?.split(':')[0]?.toUpperCase();
  if (baseNorm === fc && quoteNorm && STABLECOINS.has(quoteNorm)) {
    return fee * trade.price;
  }
  return 0;
}

export interface BuyLot {
  date: Date;
  amount: number;
  pricePerUnit: number;
  totalCost: number;
  exchange: string;
  symbol: string;
}

export interface SaleEvent {
  date: Date;
  symbol: string;
  baseAsset: string;
  amount: number;
  revenue: number;
  fee: number;
  exchange: string;
  costBasis: number;
  realizedPnL: number;
  holdingDays: number;
  isTaxFree: boolean;
  taxFreePortion: number;
  taxablePortion: number;
  lots: Array<{
    buyDate: Date;
    amount: number;
    costBasis: number;
    holdingDays: number;
    isTaxFree: boolean;
    pnl: number;
  }>;
}

/**
 * Process all trades chronologically using FIFO to build:
 * 1. Per-asset buy lot queues (for unrealized P&L)
 * 2. Per-sale event breakdown (for realized P&L with holding period)
 */
export function processFIFO(allTrades: TradeData[]): {
  lotQueues: Map<string, BuyLot[]>;
  sales: SaleEvent[];
} {
  const priceMap = buildAssetPriceMap(allTrades);
  const chronological = [...allTrades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const lotQueues = new Map<string, BuyLot[]>();
  const sales: SaleEvent[] = [];

  for (const trade of chronological) {
    const baseAsset = trade.symbol.split('/')[0];

    if (trade.side === 'buy') {
      if (!lotQueues.has(baseAsset)) lotQueues.set(baseAsset, []);
      lotQueues.get(baseAsset)!.push({
        date: new Date(trade.timestamp),
        amount: trade.amount,
        pricePerUnit: trade.price,
        totalCost: trade.cost,
        exchange: trade.exchange,
        symbol: trade.symbol,
      });
    } else if (trade.side === 'sell') {
      const lots = lotQueues.get(baseAsset) || [];
      let remaining = trade.amount;
      let totalCostBasis = 0;
      const matchedLots: SaleEvent['lots'] = [];
      const sellDate = new Date(trade.timestamp);

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const consumed = Math.min(remaining, lot.amount);
        const lotCost = consumed * lot.pricePerUnit;
        const holdingDays = Math.floor(
          (sellDate.getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isTaxFree = holdingDays >= 365;
        const lotRevenue = (consumed / trade.amount) * trade.cost;
        const lotPnl = lotRevenue - lotCost;

        matchedLots.push({
          buyDate: lot.date,
          amount: consumed,
          costBasis: lotCost,
          holdingDays,
          isTaxFree,
          pnl: lotPnl,
        });

        totalCostBasis += lotCost;
        lot.amount -= consumed;
        remaining -= consumed;

        if (lot.amount <= 0.00000001) lots.shift();
      }

      const revenue = trade.cost;
      const feeUsd = feeToUsd(trade, priceMap);
      const realizedPnL = revenue - totalCostBasis - feeUsd;

      let taxFreePnL = 0;
      let taxablePnL = 0;
      for (const ml of matchedLots) {
        if (ml.isTaxFree) taxFreePnL += ml.pnl;
        else taxablePnL += ml.pnl;
      }
      const grossPnL = taxFreePnL + taxablePnL;
      if (Math.abs(grossPnL) > 1e-10) {
        const factor = realizedPnL / grossPnL;
        taxFreePnL *= factor;
        taxablePnL *= factor;
      } else {
        taxFreePnL = -feeUsd / 2;
        taxablePnL = -feeUsd / 2;
      }

      const totalMatchedAmount = matchedLots.reduce((s, l) => s + l.amount, 0);
      const weightedDays =
        totalMatchedAmount > 0
          ? matchedLots.reduce((s, l) => s + l.holdingDays * l.amount, 0) / totalMatchedAmount
          : 0;

      const allTaxFree = matchedLots.length > 0 && matchedLots.every((l) => l.isTaxFree);

      sales.push({
        date: sellDate,
        symbol: trade.symbol,
        baseAsset,
        amount: trade.amount,
        revenue,
        fee: feeUsd,
        exchange: trade.exchange,
        costBasis: totalCostBasis,
        realizedPnL,
        holdingDays: Math.round(weightedDays),
        isTaxFree: allTaxFree,
        taxFreePortion: taxFreePnL,
        taxablePortion: taxablePnL,
        lots: matchedLots,
      });
    }
  }

  return { lotQueues, sales };
}
