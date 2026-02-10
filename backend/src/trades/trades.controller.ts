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
    @Query('year') yearParam?: string,
    @Query('symbol') symbolParam?: string,
    @Query('search') searchParam?: string,
    @Query('side') sideParam?: string,
    @Query('exchange') exchangeParam?: string,
    @Query('marketType') marketTypeParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    // year: filter by calendar year (e.g. 2024). Takes precedence over days.
    // days=0 means "all time" when year not set
    const yearFilter = yearParam && yearParam !== 'all' ? parseInt(yearParam, 10) : null;
    const rawDays = yearFilter == null && daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : 0;
    const days = isNaN(rawDays) ? 0 : Math.max(0, rawDays);
    const raw = (symbolParam || searchParam || '').trim().toUpperCase();
    const symbolFilter = raw && raw !== 'ALL' ? raw : null;
    const sideFilter = sideParam === 'buy' || sideParam === 'sell' ? sideParam : null;
    const exchangeFilter = exchangeParam && exchangeParam !== 'all' ? exchangeParam : null;
    const marketTypeFilter = marketTypeParam === 'spot' || marketTypeParam === 'future' ? marketTypeParam : null;
    const rawPage = parseInt(pageParam || '1', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const rawLimit = parseInt(limitParam || '20', 10);
    const limit = Math.min(
      Math.max(1, isNaN(rawLimit) ? 20 : rawLimit),
      100000,
    );

    this.logger.debug(`getTrades: days=${days}, year=${yearFilter ?? 'none'}, page=${page}, limit=${limit}, side=${sideFilter}, exchange=${exchangeFilter}, marketType=${marketTypeFilter}, symbol=${symbolFilter}`);

    return this.tradesService.getTrades(user.id, {
      days,
      yearFilter,
      symbolFilter,
      sideFilter,
      exchangeFilter,
      marketTypeFilter,
      page,
      limit,
    });
  }
}
