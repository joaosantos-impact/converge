'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Auto-sync hook — lightweight client-side sync coordinator.
 *
 * - The HEAVY sync work is done server-side by the cron job (/api/cron/sync)
 *   which runs every 8 hours and syncs all users automatically.
 *
 * - This hook shows sync status to the user (when server cron or manual sync is running)
 *   and exposes triggerSync() for the manual "Sincronizar" button.
 *
 * - No auto-trigger on tab visibility change or initial load — sync only via
 *   manual button, cron, or when adding a new integration.
 */

const STALE_RUNNING_MS = 10 * 60 * 1000; // 10 min — if "running" older than this, treat as not syncing
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
      const rawRunning = data.lastSync?.status === 'running';
      const startedAt = data.lastSync?.startedAt ? new Date(data.lastSync.startedAt).getTime() : 0;
      const isRunning = rawRunning && Date.now() - startedAt < STALE_RUNNING_MS;
      setState((prev) => {
        const wasSyncing = prev.syncing;
        const next = {
          ...prev,
          lastSyncAt: syncDate ?? prev.lastSyncAt,
          syncing: isRunning ?? prev.syncing,
          canSync: typeof data.canSync === 'boolean' ? data.canSync : prev.canSync,
        };
        // When sync finished (was syncing, now not), refresh data if completed and allow another trigger
        if (wasSyncing && !isRunning) {
          if (data.lastSync?.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            queryClient.invalidateQueries({ queryKey: ['trades'] });
            queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
          }
          syncingRef.current = false;
        }
        return next;
      });
    } catch {
      // Silently fail — status check is non-critical
    }
  }, [queryClient]);

  // Manual trigger — with Redis returns immediately (queued); without Redis returns "started" and sync runs in background
  const triggerSync = useCallback(async (): Promise<{ ok: boolean; started?: boolean; error?: string }> => {
    if (syncingRef.current) return { ok: false, error: 'Sync já em curso' };
    syncingRef.current = true;
    setState((prev) => ({ ...prev, syncing: true, error: null }));
    let body: { status?: string; error?: string; message?: string } = {};
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      body = await res.json().catch(() => ({}));
      if (!mountedRef.current) return { ok: false };
      if (res.ok) {
        const started = body?.status === 'started' || body?.status === 'queued';
        if (started) {
          // Sync runs in background; keep syncing true, polling will detect completion and invalidate
          setTimeout(checkStatus, 2000);
          return { ok: true, started: true };
        }
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
      // When sync runs in background (started/queued), keep syncingRef true until polling sees completion
      const isBackground = body?.status === 'started' || body?.status === 'queued';
      if (!isBackground) syncingRef.current = false;
    }
  }, [queryClient, checkStatus]);

  // Setup: runs once on mount, stable dependencies
  useEffect(() => {
    mountedRef.current = true;

    // Check status immediately (important when just added integration so we show "syncing" soon)
    checkStatus();
    // After adding an integration, backend starts sync in background; extra check at 1.5s to catch "running" quickly
    const fastCheck = pollFastUntilRef.current > Date.now() ? setTimeout(checkStatus, 1500) : null;

    // When tab becomes visible, refresh status (no auto-sync)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus();
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
        if (fastCheck) clearTimeout(fastCheck);
        clearTimeout(switchTimer);
        clearInterval(interval);
        if (slowInterval) clearInterval(slowInterval);
        mountedRef.current = false;
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    return () => {
      if (fastCheck) clearTimeout(fastCheck);
      mountedRef.current = false;
      clearInterval(interval);
      if (slowInterval) clearInterval(slowInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkStatus]);

  return { ...state, triggerSync };
}
