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
  stats?: {
    totalPnl: number;
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
  symbol?: string;
  search?: string;
  side?: string;
  exchange?: string;
  page?: number;
  limit?: number;
}

async function fetchTrades(params: TradesParams = {}): Promise<TradesResponse> {
  const sp = new URLSearchParams();
  if (params.days !== undefined && params.days !== null) sp.set('days', String(params.days));
  if (params.symbol) sp.set('symbol', params.symbol);
  if (params.search) sp.set('search', params.search);
  if (params.side && params.side !== 'all') sp.set('side', params.side);
  if (params.exchange && params.exchange !== 'all') sp.set('exchange', params.exchange);
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
    queryKey: ['trades', days, symbol, limit, params?.search, params?.side, params?.exchange, params?.page],
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
