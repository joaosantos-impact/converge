'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PortfolioSummary } from '@/lib/types';

interface PortfolioParams {
  page?: number;
  perPage?: number;
  search?: string;
}

async function fetchPortfolio(params: PortfolioParams = {}): Promise<PortfolioSummary> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.perPage) searchParams.set('perPage', String(params.perPage));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const res = await fetch(`/api/portfolio${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}

/**
 * Shared portfolio hook with server-side pagination + search.
 * The query key includes pagination params so each page is cached independently.
 */
export function usePortfolio(params: PortfolioParams = {}) {
  return useQuery({
    queryKey: ['portfolio', params.page ?? 1, params.perPage ?? 20, params.search ?? ''],
    queryFn: () => fetchPortfolio(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: 'always',
    placeholderData: (prev) => prev, // Keep previous data while loading next page
  });
}

/**
 * Hook to manually invalidate all portfolio queries (e.g., after sync).
 */
export function useInvalidatePortfolio() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['portfolio'] });
}
