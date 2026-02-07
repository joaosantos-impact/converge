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
}

async function fetchLeaderboard(period: string): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboard?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

/**
 * Shared leaderboard hook — uses React Query for caching.
 * Caches per period (all, monthly).
 */
export function useLeaderboard(period: 'all' | 'monthly') {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => fetchLeaderboard(period),
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 10 * 60 * 1000, // 10 min
    retry: 2,
    refetchOnWindowFocus: false, // avoid unnecessary refetches
  });
}

/**
 * Hook to manually invalidate leaderboard data.
 */
export function useInvalidateLeaderboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
}
