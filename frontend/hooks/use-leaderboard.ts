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

async function fetchLeaderboard(period: string, page: number): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboard?period=${period}&page=${page}&perPage=20`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
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
