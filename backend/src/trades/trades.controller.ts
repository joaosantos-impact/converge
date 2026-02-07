import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TradesService } from './trades.service';

@Controller('api/trades')
@UseGuards(AuthGuard)
export class TradesController {
  private readonly logger = new Logger(TradesController.name);

  constructor(private readonly tradesService: TradesService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getTrades(
    @CurrentUser() user: any,
    @Query('days') daysParam?: string,
    @Query('symbol') symbolParam?: string,
    @Query('search') searchParam?: string,
    @Query('side') sideParam?: string,
    @Query('exchange') exchangeParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    // days=0 means "all time" (no date filter)
    const rawDays = daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : 30;
    const days = isNaN(rawDays) ? 30 : Math.max(0, rawDays);
    const symbolFilter = (symbolParam || searchParam || '').toUpperCase() || null;
    const sideFilter = sideParam === 'buy' || sideParam === 'sell' ? sideParam : null;
    const exchangeFilter = exchangeParam && exchangeParam !== 'all' ? exchangeParam : null;
    const rawPage = parseInt(pageParam || '1', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const rawLimit = parseInt(limitParam || '20', 10);
    const limit = Math.min(
      Math.max(1, isNaN(rawLimit) ? 20 : rawLimit),
      10000,
    );

    this.logger.debug(`getTrades: days=${days}, page=${page}, limit=${limit}, side=${sideFilter}, exchange=${exchangeFilter}, symbol=${symbolFilter}`);

    return this.tradesService.getTrades(user.id, {
      days,
      symbolFilter,
      sideFilter,
      exchangeFilter,
      page,
      limit,
    });
  }
}
