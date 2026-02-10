'use client';

import { useQuery } from '@tanstack/react-query';

export interface AssetStats {
  asset: string;
  totalAmount: number;
  totalValue: number;
  totalBuyCost: number;
  totalSellRevenue: number;
  avgCost: number;
  pnl: number;
  pnlPercent: number;
  exchanges: string[];
  exchangeBreakdown: { exchange: string; amount: number; usdValue: number }[];
  tradeCount: number;
}

async function fetchAssetStats(asset: string): Promise<AssetStats> {
  const res = await fetch(`/api/portfolio/asset/${encodeURIComponent(asset)}`);
  if (!res.ok) throw new Error('Failed to fetch asset stats');
  return res.json();
}

export function useAssetStats(asset: string | undefined | null) {
  return useQuery({
    queryKey: ['assetStats', asset ?? ''],
    queryFn: () => fetchAssetStats(asset!),
    enabled: !!asset,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
