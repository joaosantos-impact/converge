import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';

@Controller('api/sync')
@UseGuards(AuthGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Get()
  async getStatus(@CurrentUser() user: any) {
    return this.syncService.getSyncStatus(user.id);
  }

  @Post()
  async triggerSync(@CurrentUser() user: any) {
    try {
      const result = await this.syncService.triggerSync(user.id);

      if (result.statusCode === 429) {
        throw new HttpException(
          { error: result.error, retryAfter: result.retryAfter },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return result;
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
