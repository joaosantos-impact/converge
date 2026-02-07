'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

interface PostTrade {
  id: string;
  symbol: string;
  side: string;
  price: number | null;
  amount: number | null;
  cost: number | null;
  exchange: string | null;
  timestamp: string;
}

interface Post {
  id: string;
  user: { id: string; name: string; image: string | null } | null;
  content: string;
  isOwner: boolean;
  trades: PostTrade[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

interface FeedResponse {
  posts: Post[];
}

async function fetchFeed(): Promise<FeedResponse> {
  const res = await fetch('/api/feed');
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json();
}

/**
 * Shared feed hook — uses React Query for caching and deduplication.
 */
export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: fetchFeed,
    staleTime: 60 * 1000, // 1 min
    gcTime: 5 * 60 * 1000, // 5 min
    retry: 2,
    refetchOnWindowFocus: 'always', // feed benefits from fresh data
  });
}

/**
 * Hook to manually invalidate feed data (e.g., after creating/deleting a post).
 */
export function useInvalidateFeed() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['feed'] });
}
