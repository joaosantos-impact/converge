import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SYNC_QUEUE_SERVICE } from './sync.constants';
import type { SyncQueueService as SyncQueueServiceType } from './sync-queue.service';

@Controller('api/sync')
@UseGuards(AuthGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    @Inject(SYNC_QUEUE_SERVICE)
    private readonly queueService: SyncQueueServiceType,
  ) {}

  @Get()
  async getStatus(@CurrentUser() user: any) {
    const status = await this.syncService.getSyncStatus(user.id);
    const jobStatus = await this.queueService.getJobStatus(user.id);
    if (jobStatus) {
      const lastSync = status.lastSync
        ? { ...status.lastSync, status: 'running' as const }
        : {
            startedAt: new Date(),
            finishedAt: null,
            status: 'running' as const,
            synced: 0,
            failed: 0,
          };
      return { ...status, jobStatus, canSync: false, lastSync };
    }
    return status;
  }

  @Post()
  async triggerSync(@CurrentUser() user: any) {
    try {
      const result = await this.queueService.addJob(user.id, false);

      if (result.statusCode === 429 || result.error) {
        throw new HttpException(
          {
            error: result.error || 'Aguarda antes de sincronizar novamente.',
            retryAfter: (result as { retryAfter?: number }).retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (result.useDirect && result.success) {
        return result.success;
      }

      return { jobId: result.jobId, status: 'queued' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error syncing exchanges:', error);
      throw new HttpException(
        'Erro ao sincronizar exchanges',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
