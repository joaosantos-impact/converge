import { Injectable, Logger } from '@nestjs/common';
import { SyncService } from './sync.service';
import type { AddJobResult } from './sync-queue.service';

/**
 * Fallback implementation when Redis is not available.
 * Starts sync in background and returns immediately so the frontend does not block.
 */
@Injectable()
export class SyncQueueDirectService {
  private readonly logger = new Logger(SyncQueueDirectService.name);

  constructor(private readonly syncService: SyncService) {}

  async addJob(userId: string, skipCooldown = false): Promise<AddJobResult> {
    this.logger.debug(`Direct sync (no Redis) for user ${userId} — starting in background`);
    try {
      if (!skipCooldown) {
        const status = await this.syncService.getSyncStatus(userId);
        if (!status.canSync && status.nextSyncAt) {
          const retryAfter = Math.max(
            0,
            status.nextSyncAt.getTime() - Date.now(),
          );
          return {
            error: `Aguarda antes de sincronizar novamente.`,
            statusCode: 429,
            retryAfter,
          };
        }
      }

      // Run sync in background; response returns immediately so UI does not block
      this.syncService
        .triggerSync(userId, { skipCooldown })
        .catch((err) =>
          this.logger.error(`Background sync failed for user ${userId}:`, err),
        );

      return { useDirect: true, success: true, status: 'started' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg, statusCode: 500 };
    }
  }

  async getJobStatus(_userId: string): Promise<'queued' | 'active' | null> {
    return null;
  }

  isQueueMode(): boolean {
    return false;
  }
}
