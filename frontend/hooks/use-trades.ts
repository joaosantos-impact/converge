'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TradeData } from '@/lib/types';

export interface TradesResponse {
  trades: TradeData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  exchanges: string[];
  /** When set, backend truncated: user has more trades than fetched (recent trades may be missing) */
  truncated?: number;
  stats?: {
    totalPnl: number;
    totalBuyCost: number;
    totalSellRevenue: number;
    totalFees: number;
    wins: number;
    losses: number;
    winRate: number;
    totalTrades: number;
    totalVolume: number;
    profitableTrades: number;
    losingTrades: number;
  };
}

interface TradesParams {
  days?: number;
  year?: number | 'all';
  symbol?: string;
  search?: string;
  side?: string;
  exchange?: string;
  marketType?: 'spot' | 'future' | 'all';
  page?: number;
  limit?: number;
}

async function fetchTrades(params: TradesParams = {}): Promise<TradesResponse> {
  const sp = new URLSearchParams();
  if (params.days !== undefined && params.days !== null) sp.set('days', String(params.days));
  if (params.year !== undefined && params.year !== null && params.year !== 'all') sp.set('year', String(params.year));
  if (params.symbol) sp.set('symbol', params.symbol);
  if (params.search) sp.set('search', params.search);
  if (params.side && params.side !== 'all') sp.set('side', params.side);
  if (params.exchange && params.exchange !== 'all') sp.set('exchange', params.exchange);
  if (params.marketType && params.marketType !== 'all') sp.set('marketType', params.marketType);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));

  const res = await fetch(`/api/trades?${sp}`);
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

/**
 * Shared trades hook with server-side pagination + filters.
 */
export function useTrades(days: number = 90, symbol?: string, limit?: number, params?: Omit<TradesParams, 'days' | 'symbol' | 'limit'>) {
  const fullParams: TradesParams = { days, symbol, limit, ...params };
  return useQuery({
    queryKey: ['trades', days, params?.year, symbol, limit, params?.search, params?.side, params?.exchange, params?.marketType, params?.page],
    queryFn: () => fetchTrades(fullParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

/**
 * Hook to manually invalidate trades data (e.g., after sync).
 */
export function useInvalidateTrades() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['trades'] });
}
