import { Injectable, Logger } from '@nestjs/common';
import { SyncService } from './sync.service';
import type { AddJobResult } from './sync-queue.service';

/**
 * Fallback implementation when Redis is not available.
 * Runs sync directly instead of enqueueing.
 */
@Injectable()
export class SyncQueueDirectService {
  private readonly logger = new Logger(SyncQueueDirectService.name);

  constructor(private readonly syncService: SyncService) {}

  async addJob(userId: string, skipCooldown = false): Promise<AddJobResult> {
    this.logger.debug(`Direct sync (no Redis) for user ${userId}`);
    try {
      const result = await this.syncService.triggerSync(userId, {
        skipCooldown,
      });
      if (
        result &&
        typeof result === 'object' &&
        'error' in result &&
        'statusCode' in result
      ) {
        return {
          error: (result as { error: string }).error,
          statusCode: (result as { statusCode: number }).statusCode,
        };
      }
      return { useDirect: true, success: result };
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
