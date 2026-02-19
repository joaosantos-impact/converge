'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

interface RankingUser {
  rank: number;
  userId: string;
  displayName: string;
  image?: string;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  followers: number;
  isFollowing: boolean;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  rankings: RankingUser[];
  participating: boolean;
  totalCount: number;
  page: number;
  perPage: number;
}

async function parseJsonSafe<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  if (!text?.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function fetchLeaderboard(period: string, page: number): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboard?period=${period}&page=${page}&perPage=20`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res, {} as Record<string, unknown>);
    const msg = (body?.message ?? body?.error) || res.statusText || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : String(msg));
  }
  return parseJsonSafe(res, {
    rankings: [],
    participating: false,
    totalCount: 0,
    page: 1,
    perPage: 20,
  });
}

/**
 * Shared leaderboard hook — uses React Query for caching.
 * Caches per period and page (max 100 users, 20 per page).
 */
export function useLeaderboard(period: 'all' | 'monthly', page: number = 1) {
  return useQuery({
    queryKey: ['leaderboard', period, page],
    queryFn: () => fetchLeaderboard(period, page),
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 10 * 60 * 1000, // 10 min
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to manually invalidate leaderboard data.
 */
export function useInvalidateLeaderboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
}
