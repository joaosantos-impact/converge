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
const POLL_FAST_MS = 2 * 1000; // When pollFast (e.g. just added integration), poll every 2s
const POLL_FAST_DURATION_MS = 90 * 1000; // … for 90s so we pick up "running" quickly

interface SyncState {
  lastSyncAt: Date | null;
  syncing: boolean;
  error: string | null;
  /** When false, sync button should be disabled (e.g. cooldown). From GET /api/sync */
  canSync: boolean;
}

export function useAutoSync(options?: { pollFast?: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SyncState>({
    lastSyncAt: null,
    syncing: false,
    error: null,
    canSync: true, // assume true until first status fetch
  });

  const mountedRef = useRef(true);
  const syncingRef = useRef(false);
  const lastSyncRef = useRef<Date | null>(null);
  const pollFastUntilRef = useRef<number>(0);

  if (options?.pollFast && pollFastUntilRef.current <= Date.now()) {
    pollFastUntilRef.current = Date.now() + POLL_FAST_DURATION_MS;
  }

  // Keep ref in sync with state so callbacks can read latest value
  // without being in the dependency array
  lastSyncRef.current = state.lastSyncAt;

  // Check the latest sync status from the server
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync');
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json();

      const syncDate = data.lastSync?.startedAt ? new Date(data.lastSync.startedAt) : null;
      const isRunning = data.lastSync?.status === 'running';
      setState(prev => ({
        ...prev,
        lastSyncAt: syncDate ?? prev.lastSyncAt,
        syncing: isRunning ?? prev.syncing,
        canSync: typeof data.canSync === 'boolean' ? data.canSync : prev.canSync,
      }));
    } catch {
      // Silently fail — status check is non-critical
    }
  }, []);

  // Manual trigger — call from Sync buttons; blocks until sync completes
  const triggerSync = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (syncingRef.current) return { ok: false, error: 'Sync já em curso' };
    syncingRef.current = true;
    setState((prev) => ({ ...prev, syncing: true, error: null }));
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!mountedRef.current) return { ok: false };
      if (res.ok) {
        setState((prev) => ({ ...prev, syncing: false, lastSyncAt: new Date(), canSync: false }));
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
        return { ok: true };
      }
      if (res.status === 429) {
        setState((prev) => ({ ...prev, syncing: false, canSync: false }));
        checkStatus();
        return { ok: false, error: body?.error || 'Aguarda antes de sincronizar novamente' };
      }
      const errMsg = body?.message || body?.error || `Erro ${res.status}`;
      setState((prev) => ({ ...prev, syncing: false, error: errMsg }));
      return { ok: false, error: errMsg };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erro de rede';
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, syncing: false, error: errMsg }));
      }
      return { ok: false, error: errMsg };
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

    // Check status immediately (important when just added integration so we show "syncing" soon)
    checkStatus();

    // After initial status check, trigger sync if stale (with delay to not block UI)
    const initialTimer = setTimeout(() => {
      syncIfStale();
    }, 3000);

    // When tab becomes visible after being hidden, sync if stale
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
        setTimeout(syncIfStale, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic status check — when pollFast (e.g. just added integration), poll every 2s for 90s then 15s
    const intervalMs = pollFastUntilRef.current > Date.now() ? POLL_FAST_MS : CHECK_INTERVAL_MS;
    const interval = setInterval(checkStatus, intervalMs);
    let slowInterval: ReturnType<typeof setInterval> | null = null;
    if (pollFastUntilRef.current > Date.now()) {
      const switchTimer = setTimeout(() => {
        clearInterval(interval);
        slowInterval = setInterval(checkStatus, CHECK_INTERVAL_MS);
      }, POLL_FAST_DURATION_MS);
      return () => {
        clearTimeout(initialTimer);
        clearTimeout(switchTimer);
        clearInterval(interval);
        if (slowInterval) clearInterval(slowInterval);
        mountedRef.current = false;
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (slowInterval) clearInterval(slowInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkStatus, syncIfStale]);

  return { ...state, triggerSync };
}
