import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { SyncService } from './sync.service';

export const SYNC_QUEUE_NAME = 'sync';

export interface AddJobResult {
  jobId?: string;
  useDirect?: boolean;
  success?: unknown;
  status?: 'started';
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

@Injectable()
export class SyncQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(SyncQueueService.name);
  private readonly redisAvailable: boolean;

  constructor(
    @InjectQueue(SYNC_QUEUE_NAME) private readonly queue: Queue,
    private readonly syncService: SyncService,
  ) {
    this.redisAvailable = true;
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  /**
   * Add a sync job for a user. When Redis is available, enqueues and returns jobId.
   * When Redis is not available, runs sync directly and returns result.
   */
  async addJob(userId: string, skipCooldown = false): Promise<AddJobResult> {
    const jobId = `sync:${userId}`;

    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'waiting' || state === 'delayed' || state === 'active') {
          return {
            jobId: existing.id ?? jobId,
            error: 'Sync já em curso ou na fila.',
            statusCode: 429,
          };
        }
      }
    } catch {
      // Job doesn't exist, ok to add
    }

    await this.queue.add(
      'sync-user',
      { userId, skipCooldown },
      {
        jobId,
        removeOnComplete: { count: 100 },
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );

    return { jobId };
  }

  isQueueMode(): boolean {
    return true;
  }

  /**
   * Get job status for a user. Returns 'queued', 'active', or null.
   */
  async getJobStatus(userId: string): Promise<'queued' | 'active' | null> {
    const jobId = `sync:${userId}`;
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) return null;
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') return 'queued';
      if (state === 'active') return 'active';
      return null;
    } catch {
      return null;
    }
  }
}
