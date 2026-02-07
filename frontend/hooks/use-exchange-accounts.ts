'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface ExchangeAccount {
  id: string;
  name: string;
  exchange: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncTradeCount: number;
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExchangeAccountDetails {
  id: string;
  name: string;
  exchange: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncTradeCount: number;
  createdAt: string;
  updatedAt: string;
  apiKeyPreview: string;
  apiSecretPreview: string;
  hasPassphrase: boolean;
  apiPassphrasePreview: string | null;
}

async function fetchExchangeAccounts(): Promise<ExchangeAccount[]> {
  const res = await fetch('/api/exchange-accounts');
  if (!res.ok) throw new Error('Failed to fetch exchange accounts');
  return res.json();
}

async function fetchAccountDetails(id: string): Promise<ExchangeAccountDetails> {
  const res = await fetch(`/api/exchange-accounts/details?id=${id}`);
  if (!res.ok) throw new Error('Failed to fetch account details');
  return res.json();
}

/**
 * Shared exchange accounts hook — uses React Query for caching.
 * Used in dashboard, exchanges, and integrations pages.
 */
export function useExchangeAccounts() {
  return useQuery({
    queryKey: ['exchange-accounts'],
    queryFn: fetchExchangeAccounts,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch details of a single exchange account (with masked credentials).
 */
export function useExchangeAccountDetails(id: string | null) {
  return useQuery({
    queryKey: ['exchange-account-details', id],
    queryFn: () => fetchAccountDetails(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to manually invalidate exchange accounts (e.g., after adding/removing).
 */
export function useInvalidateExchangeAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
}
