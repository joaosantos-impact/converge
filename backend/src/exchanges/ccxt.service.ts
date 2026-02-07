import { Injectable, Logger } from '@nestjs/common';
import ccxt from 'ccxt';
import { EncryptionService } from './encryption.service';

export type SupportedExchange =
  | 'binance'
  | 'bybit'
  | 'mexc'
  | 'kraken'
  | 'okx';

export interface ExchangeConfig {
  apiKey: string;
  secret: string;
  password?: string;
  options?: Record<string, any>;
}

export const SUPPORTED_EXCHANGES: Array<{
  id: SupportedExchange;
  name: string;
  icon: string;
}> = [
  { id: 'binance', name: 'Binance', icon: '🟡' },
  { id: 'bybit', name: 'Bybit', icon: '🟠' },
  { id: 'mexc', name: 'MEXC', icon: '🔵' },
  { id: 'kraken', name: 'Kraken', icon: '🟣' },
  { id: 'okx', name: 'OKX', icon: '⚫' },
];

@Injectable()
export class CcxtService {
  private readonly logger = new Logger(CcxtService.name);

  constructor(private readonly encryption: EncryptionService) {}

  createExchange(
    exchangeName: SupportedExchange,
    config: ExchangeConfig,
  ): any {
    const ExchangeClass = (ccxt as any)[exchangeName];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeName} is not supported`);
    }

    return new ExchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
        ...config.options,
      },
    });
  }

  createExchangeFromAccount(account: {
    exchange: string;
    apiKey: string;
    apiSecret: string;
    apiPassphrase?: string | null;
  }): any {
    const exchangeName = account.exchange as SupportedExchange;
    const apiKey = this.encryption.decrypt(account.apiKey);
    const apiSecret = this.encryption.decrypt(account.apiSecret);
    const password = account.apiPassphrase
      ? this.encryption.decrypt(account.apiPassphrase)
      : undefined;

    return this.createExchange(exchangeName, {
      apiKey,
      secret: apiSecret,
      password,
    });
  }

  async fetchBalance(
    exchange: any,
  ): Promise<
    Array<{ asset: string; free: number; locked: number; total: number }>
  > {
    try {
      const balance = await exchange.fetchBalance();

      return Object.entries(balance.total)
        .filter(([, amount]) => amount && (amount as number) > 0)
        .map(([asset, total]) => ({
          asset,
          free: (balance.free[asset] as number) || 0,
          locked: (balance.used[asset] as number) || 0,
          total: (total as number) || 0,
        }));
    } catch (error) {
      this.logger.error('Error fetching balance:', error);
      throw error;
    }
  }

  async fetchAllTickers(exchange: any): Promise<Map<string, number>> {
    const tickerMap = new Map<string, number>();

    try {
      const tickers = await exchange.fetchTickers();
      for (const [symbol, ticker] of Object.entries(tickers)) {
        const t = ticker as any;
        if (t.last && t.last > 0) {
          tickerMap.set(symbol, t.last);
        }
      }
    } catch (error) {
      this.logger.error('Failed to fetch all tickers:', error);
    }

    return tickerMap;
  }

  getUsdValueFromTickers(
    tickerMap: Map<string, number>,
    asset: string,
    amount: number,
  ): number {
    if (amount === 0) return 0;

    if (
      ['USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'FDUSD'].includes(asset)
    ) {
      return amount;
    }

    const usdtPrice = tickerMap.get(`${asset}/USDT`);
    if (usdtPrice) return usdtPrice * amount;

    const usdcPrice = tickerMap.get(`${asset}/USDC`);
    if (usdcPrice) return usdcPrice * amount;

    const btcPrice = tickerMap.get(`${asset}/BTC`);
    const btcUsdtPrice = tickerMap.get('BTC/USDT');
    if (btcPrice && btcUsdtPrice) return btcPrice * btcUsdtPrice * amount;

    const ethPrice = tickerMap.get(`${asset}/ETH`);
    const ethUsdtPrice = tickerMap.get('ETH/USDT');
    if (ethPrice && ethUsdtPrice) return ethPrice * ethUsdtPrice * amount;

    return 0;
  }

  async fetchTrades(
    exchange: any,
    symbol: string,
    since?: number,
    limit = 100,
  ) {
    try {
      const trades = await exchange.fetchMyTrades(symbol, since, limit);

      return trades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        type: trade.type || 'unknown',
        price: trade.price,
        amount: trade.amount,
        cost: trade.cost,
        fee: trade.fee?.cost || 0,
        feeCurrency: trade.fee?.currency || 'USDT',
        timestamp: new Date(trade.timestamp),
      }));
    } catch (error) {
      this.logger.error(`Error fetching trades for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchAllTrades(exchange: any, assets: string[], since?: number) {
    const allTrades: Array<{
      id: string;
      symbol: string;
      side: string;
      type: string;
      price: number;
      amount: number;
      cost: number;
      fee: number;
      feeCurrency: string;
      timestamp: Date;
    }> = [];

    const quoteCurrencies = ['USDT', 'USDC', 'BTC', 'ETH'];
    const stablecoins = new Set([
      'USDT',
      'USDC',
      'USD',
      'BUSD',
      'DAI',
      'TUSD',
      'FDUSD',
    ]);

    const symbolsToFetch: string[] = [];
    for (const asset of assets) {
      if (stablecoins.has(asset)) continue;
      for (const quote of quoteCurrencies) {
        if (asset === quote) continue;
        const symbol = `${asset}/${quote}`;
        if (exchange.markets && exchange.markets[symbol]) {
          symbolsToFetch.push(symbol);
        }
      }
    }

    const BATCH_SIZE = 3;
    for (let i = 0; i < symbolsToFetch.length; i += BATCH_SIZE) {
      const batch = symbolsToFetch.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((symbol) => this.fetchTrades(exchange, symbol, since, 500)),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allTrades.push(...result.value);
        }
      }
    }

    return allTrades;
  }
}
