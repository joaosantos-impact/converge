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

const BINANCE_KLINES_LIMIT = 1000;
const MAX_DAYS = 2555; // ~7 years (Binance spot BTCUSDT from ~2017)

const querySchema = z.object({
  symbol: z.string().min(1).max(10).default('BTC'),
  interval: z.enum(['1h', '4h', '1d', '1w']).default('1d'),
  days: z.coerce.number().int().min(1).max(MAX_DAYS).default(90),
});

interface KlineRow {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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

    const { symbol: sym, days: d } = parsed.data;
    // For long ranges Binance only allows 1000 candles per request; use 1d and chunk
    const useChunked = d > 1000;
    const intv = useChunked ? '1d' : parsed.data.interval;
    const pair = `${sym.toUpperCase()}USDT`;

    try {
      const data = useChunked
        ? await this.fetchHistoryChunked(pair, intv, d)
        : await this.fetchHistorySingle(pair, intv, d);

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

  private async fetchHistorySingle(
    pair: string,
    intv: string,
    d: number,
  ): Promise<KlineRow[]> {
    const startTime = Date.now() - d * 24 * 60 * 60 * 1000;
    const limit = Math.min(
      d * (intv === '1h' ? 24 : intv === '4h' ? 6 : intv === '1d' ? 1 : 1),
      BINANCE_KLINES_LIMIT,
    );
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${intv}&startTime=${startTime}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpException(
        'Erro ao obter dados da Binance',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const klines = (await response.json()) as number[][];
    return klines.map((k) => this.mapKline(k));
  }

  private async fetchHistoryChunked(
    pair: string,
    intv: string,
    d: number,
  ): Promise<KlineRow[]> {
    const dayMs = 24 * 60 * 60 * 1000;
    const endTime = Date.now();
    let startTime = endTime - d * dayMs;
    const all: KlineRow[] = [];
    const seen = new Set<string>();

    while (startTime < endTime) {
      const limit = BINANCE_KLINES_LIMIT;
      const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${intv}&startTime=${startTime}&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new HttpException(
          'Erro ao obter dados da Binance',
          HttpStatus.BAD_GATEWAY,
        );
      }
      const klines = (await response.json()) as number[][];
      if (klines.length === 0) break;
      for (const k of klines) {
        const ts = String(k[0]);
        if (!seen.has(ts)) {
          seen.add(ts);
          all.push(this.mapKline(k));
        }
      }
      const lastOpen = klines[klines.length - 1][0] as number;
      startTime = lastOpen + dayMs;
      if (klines.length < limit) break;
    }

    return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private mapKline(k: number[]): KlineRow {
    return {
      timestamp: new Date(k[0]).toISOString(),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    };
  }
}
