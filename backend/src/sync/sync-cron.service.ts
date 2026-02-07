import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';

const isConnectionError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /connection terminated|connection timeout|ECONNRESET|socket hang up|Connection terminated/i.test(msg) ||
    (err as { cause?: Error })?.cause?.message?.includes('Connection terminated') === true
  );
};

@Injectable()
export class SyncCronService {
  private readonly logger = new Logger(SyncCronService.name);
  private isRunning = false;

  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Runs every 5 minutes. Syncs all users with active exchange accounts.
   * Prevents overlapping runs with an in-memory lock.
   * Retries once on DB connection errors (e.g. Neon idle disconnect).
   */
  @Cron('*/5 * * * *')
  async handleCron() {
    if (this.isRunning) {
      this.logger.log('[CRON] Sync already running, skipping.');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.logger.log('[CRON] Starting background sync for all users...');

    const runOnce = async (): Promise<void> => {
      const result = await this.syncService.syncAllUsers();
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[CRON] Completed in ${elapsed}ms — users: ${result.users}, synced: ${result.synced}, failed: ${result.failed}`,
      );
    };

    try {
      await runOnce();
    } catch (error) {
      if (isConnectionError(error) && this.isRunning) {
        this.logger.warn('[CRON] Connection error, reconnecting and retrying once...');
        try {
          await this.prisma.$disconnect();
          await this.prisma.$connect();
          await new Promise((r) => setTimeout(r, 1000));
          await runOnce();
        } catch (retryErr) {
          this.logger.error('[CRON] Fatal error after retry:', retryErr);
        }
      } else {
        this.logger.error('[CRON] Fatal error:', error);
      }
    } finally {
      this.isRunning = false;
    }
  }
}
