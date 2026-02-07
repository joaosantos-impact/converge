import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { z } from 'zod';

const querySchema = z.object({
  symbol: z.string().min(1).max(10).default('BTC'),
  interval: z.enum(['1h', '4h', '1d', '1w']).default('1d'),
  days: z.coerce.number().int().min(1).max(365).default(90),
});

@Controller('api/prices')
export class PricesController {
  private readonly logger = new Logger(PricesController.name);

  @Get('history')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getHistory(
    @Query('symbol') symbol?: string,
    @Query('interval') interval?: string,
    @Query('days') days?: string,
    @Res() res?: Response,
  ) {
    const parsed = querySchema.safeParse({
      symbol: symbol || undefined,
      interval: interval || undefined,
      days: days || undefined,
    });

    if (!parsed.success) {
      throw new HttpException(
        parsed.error.issues[0]?.message || 'Parâmetros inválidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { symbol: sym, interval: intv, days: d } = parsed.data;
    const pair = `${sym.toUpperCase()}USDT`;
    const startTime = Date.now() - d * 24 * 60 * 60 * 1000;
    const limit = Math.min(
      d * (intv === '1h' ? 24 : intv === '4h' ? 6 : 1),
      1000,
    );

    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${intv}&startTime=${startTime}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new HttpException(
          'Erro ao obter dados da Binance',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const klines = await response.json();
      const data = (klines as number[][]).map((k) => ({
        timestamp: new Date(k[0]).toISOString(),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      }));

      res!.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res!.json(data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching price history:', error);
      throw new HttpException(
        'Erro ao obter histórico de preços',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
