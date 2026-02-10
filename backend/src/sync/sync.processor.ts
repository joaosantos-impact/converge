import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SyncService } from './sync.service';
import { SYNC_QUEUE_NAME } from './sync-queue.service';

interface SyncJobData {
  userId: string;
  skipCooldown: boolean;
}

@Processor(SYNC_QUEUE_NAME, {
  concurrency: 3,
})
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {
    super();
  }

  async process(job: Job<SyncJobData>): Promise<unknown> {
    const { userId, skipCooldown } = job.data;
    this.logger.log(`Processing sync job for user ${userId}`);
    const result = await this.syncService.triggerSync(userId, {
      skipCooldown,
    });
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error((result as { error: string }).error);
    }
    return result;
  }
}
