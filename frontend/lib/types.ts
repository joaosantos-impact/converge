// Shared TypeScript types

export interface BalanceData {
  asset: string;
  free: number;
  locked: number;
  total: number;
  amount: number;
  price?: number;
  usdValue: number;
  exchange: string;
}

export interface TradeData {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  price: number;
  amount: number;
  cost: number;
  fee: number;
  feeCurrency: string;
  timestamp: Date;
  exchange: string;
  // P&L (only on sell trades)
  pnl: number | null;
  pnlPercent: number | null;
  costBasis: number | null;
}

export interface BalanceWithPrice extends BalanceData {
  price?: number;
  amount: number;
}

export interface AggregatedAsset {
  asset: string;
  totalAmount: number;
  totalValue: number;
  price: number;
  exchanges: string[];
  exchangeBreakdown: { exchange: string; amount: number; usdValue: number }[];
  percentOfPortfolio: number;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalUsdValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  change24h: number;
  balances: AggregatedAsset[];
  exchanges: {
    name: string;
    value: number;
    percentage: number;
  }[];
  pagination: PaginationInfo;
}

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

export interface PriceAlertData {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice?: number;
  isActive: boolean;
  isTriggered: boolean;
  exchange: string;
}
