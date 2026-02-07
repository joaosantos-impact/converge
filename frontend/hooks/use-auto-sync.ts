'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Auto-sync hook — lightweight client-side sync coordinator.
 *
 * Architecture:
 * - The HEAVY sync work is done server-side by the Vercel Cron job (/api/cron/sync)
 *   which runs every 5 minutes and syncs all users automatically.
 *
 * - This client hook serves two purposes:
 *   1. Shows sync status to the user (when server cron is running)
 *   2. Triggers a manual sync when the user returns to the app after being away
 *      (in case the cron hasn't caught their latest trades yet)
 *
 * - On tab visibility change: checks if a sync happened recently.
 *   If not (>5 min), triggers one sync. This ensures the user always sees
 *   fresh data when they open the dashboard, without polling aggressively.
 */

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 15 * 1000; // Check sync status every 15s (faster to detect cron/running sync)

interface SyncState {
  lastSyncAt: Date | null;
  syncing: boolean;
  error: string | null;
}

export function useAutoSync() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncState>({
    lastSyncAt: null,
    syncing: false,
    error: null,
  });

  const mountedRef = useRef(true);
  const syncingRef = useRef(false);
  const lastSyncRef = useRef<Date | null>(null);

  // Keep ref in sync with state so callbacks can read latest value
  // without being in the dependency array
  lastSyncRef.current = state.lastSyncAt;

  // Check the latest sync status from the server
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json();

      if (data.lastSync?.startedAt) {
        const syncDate = new Date(data.lastSync.startedAt);
        setState(prev => ({
          ...prev,
          lastSyncAt: syncDate,
          syncing: data.lastSync.status === 'running',
        }));
      }
    } catch {
      // Silently fail — status check is non-critical
    }
  }, []);

  // Manual trigger — call from Sync buttons; blocks until sync completes
  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (syncingRef.current) return false;
    syncingRef.current = true;
    setState((prev) => ({ ...prev, syncing: true, error: null }));
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!mountedRef.current) return false;
      if (res.ok) {
        setState((prev) => ({ ...prev, syncing: false, lastSyncAt: new Date() }));
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
        return true;
      }
      if (res.status === 429) {
        setState((prev) => ({ ...prev, syncing: false }));
        checkStatus();
        return false;
      }
      setState((prev) => ({ ...prev, syncing: false, error: 'Sync failed' }));
      return false;
    } catch {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, syncing: false, error: 'Network error' }));
      }
      return false;
    } finally {
      syncingRef.current = false;
    }
  }, [queryClient, checkStatus]);

  // Trigger a sync only if data is stale — reads from ref, not state
  const syncIfStale = useCallback(async () => {
    if (syncingRef.current) return;

    const lastSync = lastSyncRef.current;
    const timeSinceSync = lastSync
      ? Date.now() - lastSync.getTime()
      : Infinity;

    if (timeSinceSync < STALE_THRESHOLD_MS) return; // Still fresh

    syncingRef.current = true;
    setState(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const res = await fetch('/api/sync', { method: 'POST' });

      if (!mountedRef.current) return;

      if (res.ok) {
        setState(prev => ({
          ...prev,
          syncing: false,
          lastSyncAt: new Date(),
        }));
      } else if (res.status === 429) {
        // Rate limited — server cron probably already synced
        setState(prev => ({ ...prev, syncing: false }));
        checkStatus();
      } else {
        setState(prev => ({ ...prev, syncing: false, error: 'Sync failed' }));
      }
    } catch {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, syncing: false, error: 'Network error' }));
      }
    } finally {
      syncingRef.current = false;
    }
  }, [checkStatus]);

  // Setup: runs once on mount, stable dependencies
  useEffect(() => {
    mountedRef.current = true;

    // Check status immediately
    checkStatus();

    // After initial status check, trigger sync if stale (with delay to not block UI)
    const initialTimer = setTimeout(() => {
      syncIfStale();
    }, 3000);

    // Periodic status check (every 60s) — just reads status, doesn't trigger sync
    const interval = setInterval(checkStatus, CHECK_INTERVAL_MS);

    // When tab becomes visible after being hidden, sync if stale
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
        setTimeout(syncIfStale, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkStatus, syncIfStale]);

  return { ...state, triggerSync };
}
