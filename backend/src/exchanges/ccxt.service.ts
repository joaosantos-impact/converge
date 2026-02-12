import { Injectable, Logger } from '@nestjs/common';
import ccxt from 'ccxt';
import { EncryptionService } from './encryption.service';

export type SupportedExchange =
  | 'binance'
  | 'bybit'
  | 'mexc'
  | 'kraken'
  | 'okx'
  | 'kucoin'
  | 'coinbase';

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
  { id: 'kucoin', name: 'KuCoin', icon: '🟢' },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵' },
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

  createExchangeFromAccount(
    account: {
      exchange: string;
      apiKey: string;
      apiSecret: string;
      apiPassphrase?: string | null;
    },
    marketType: 'spot' | 'future' | 'swap' = 'spot',
  ): any {
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
      options: { defaultType: marketType },
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

  private mapTrade(trade: any) {
    return {
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
    };
  }

  /**
   * Fetch trades for a symbol with pagination — continues until all trades are retrieved.
   * Binance limits to 1000/request; without this we'd miss trades (e.g. recent ADA sells).
   *
   * Binance: the `since` param only returns ~3 months. For full history (2020+), we must use
   * fromId=0 to start from oldest trades, then paginate forward. See CCXT example:
   * https://github.com/ccxt/ccxt/blob/master/examples/py/binance-fetch-all-my-trades-paginate-by-id.py
   */
  async fetchTrades(
    exchange: any,
    symbol: string,
    since?: number,
    limit = 1000,
    opts?: { marketType?: string; onDelisted?: (symbol: string, exchangeId: string, marketType: string) => void },
  ): Promise<
    Array<{
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
    }>
  > {
    const LIMIT_PER_REQUEST = 1000;
    const MAX_PAGES = 200; // 200 * 1000 = 200k trades per symbol; Binance full history can be large
    const allTrades: Array<ReturnType<typeof this.mapTrade>> = [];
    const seenIds = new Set<string>();
    const isBinance = (exchange?.id || exchange?.name || '').toLowerCase().startsWith('binance');
    let currentSince = since;
    let fromId: string | undefined;

    // Binance: `since` only returns ~3 months. For full history (e.g. since > 6 months ago),
    // use fromId=0 to start from oldest trades, then paginate forward.
    const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
    const useBinanceFromIdStart =
      isBinance && since != null && since < Date.now() - SIX_MONTHS_MS;
    if (useBinanceFromIdStart) {
      fromId = '0';
    }

    let page = 0;
    try {
      while (page < MAX_PAGES) {
        page++;
        const params = fromId != null ? { fromId } : {};
        const trades = await exchange.fetchMyTrades(
          symbol,
          fromId != null ? undefined : currentSince,
          LIMIT_PER_REQUEST,
          Object.keys(params).length ? params : undefined,
        );
        const mapped = trades.map((t: any) => this.mapTrade(t));

        for (const t of mapped) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            allTrades.push(t);
          }
        }

        if (mapped.length < LIMIT_PER_REQUEST) break;

        const last = mapped[mapped.length - 1];
        if (isBinance && last.id) {
          fromId = String(last.id);
        } else {
          currentSince = last.timestamp.getTime() + 1;
          fromId = undefined;
        }
      }
      if (page >= MAX_PAGES && allTrades.length > 0) {
        this.logger.warn(
          `fetchTrades ${symbol}: hit max pages (${MAX_PAGES}), got ${allTrades.length} trades`,
        );
      }
      return allTrades;
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      const isDelistedOrBadSymbol =
        err?.name === 'BadSymbol' ||
        err?.constructor?.name === 'BadSymbol' ||
        (typeof err?.message === 'string' && err.message.includes('does not have market symbol'));
      if (isDelistedOrBadSymbol) {
        this.logger.debug(
          `Skipping ${symbol} (delisted or not available): ${err?.message || error}`,
        );
        const exchangeId = exchange?.id || exchange?.name || 'unknown';
        const marketType = opts?.marketType || 'spot';
        opts?.onDelisted?.(symbol, exchangeId, marketType);
        return [];
      }
      this.logger.error(`Error fetching trades for ${symbol}:`, error);
      throw error;
    }
  }

  private static readonly BASE_QUOTES = new Set(['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']);

  private static isBinance(exchange: any): boolean {
    const id = (exchange?.id || exchange?.name || '').toLowerCase();
    return id.startsWith('binance');
  }

  /**
   * Extract unique base assets from an exchange's loaded markets.
   * Only includes assets with tradeable quote pairs (USDT, USDC, etc.) to keep sync feasible.
   * BUSD only for Binance (Binance-specific stablecoin).
   */
  getBaseAssetsFromMarkets(exchange: any, marketType: 'spot' | 'future' = 'spot'): string[] {
    const assets = new Set<string>();
    const markets = exchange?.markets || {};
    const stablecoins = new Set([
      'USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'EUR',
    ]);
    const quotes = new Set(CcxtService.BASE_QUOTES);
    if (CcxtService.isBinance(exchange)) quotes.add('BUSD');

    for (const market of Object.values(markets) as any[]) {
      if (!market?.base) continue;
      const isFuture = market.future === true || market.swap === true;
      if (marketType === 'spot' && isFuture) continue;
      if (marketType === 'future' && !isFuture) continue;
      if (stablecoins.has(market.base)) continue;
      const quote = market.quote || (market.symbol?.split('/')?.[1]?.split(':')?.[0]);
      if (!quote || !quotes.has(quote)) continue;
      assets.add(market.base);
    }

    return Array.from(assets);
  }

  /**
   * Build symbol list for the given market type.
   * Spot: BTC/USDT. Futures: BTC/USDT:USDT (perpetual) or exchange-specific.
   * BUSD only for Binance (Binance-specific stablecoin).
   */
  private buildSymbolsForMarket(
    exchange: any,
    assets: string[],
    marketType: 'spot' | 'future',
  ): string[] {
    const symbolsToFetch: string[] = [];
    const quoteCurrencies = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR'];
    if (CcxtService.isBinance(exchange)) quoteCurrencies.push('BUSD');
    const stablecoins = new Set([
      'USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'EUR',
    ]);

    for (const asset of assets) {
      if (stablecoins.has(asset)) continue;
      for (const quote of quoteCurrencies) {
        if (asset === quote) continue;
        if (marketType === 'spot') {
          const symbol = `${asset}/${quote}`;
          if (exchange.markets?.[symbol]) symbolsToFetch.push(symbol);
        } else {
          // Futures: try perpetual format BASE/QUOTE:SETTLE (e.g. BTC/USDT:USDT)
          const symbol = `${asset}/${quote}:${quote}`;
          if (exchange.markets?.[symbol]) symbolsToFetch.push(symbol);
          if (!exchange.markets?.[symbol]) {
            const alt = `${asset}/${quote}`;
            if (exchange.markets?.[alt]) symbolsToFetch.push(alt);
          }
        }
      }
    }
    return symbolsToFetch;
  }

  async fetchAllTrades(
    exchange: any,
    assets: string[],
    since?: number,
    marketType: 'spot' | 'future' = 'spot',
    onDelisted?: (symbol: string, exchangeId: string, marketType: string) => void,
  ) {
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
      marketType: 'spot' | 'future';
    }> = [];

    const symbolsToFetch = this.buildSymbolsForMarket(exchange, assets, marketType);

    // Conservative throttling for all exchanges to avoid 429 (Binance, Kraken, etc.)
    const BATCH_SIZE = 2;
    const BATCH_DELAY_MS = 550;

    for (let i = 0; i < symbolsToFetch.length; i += BATCH_SIZE) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
      const batch = symbolsToFetch.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((symbol) =>
          this.fetchTrades(exchange, symbol, since, 1000, {
            marketType,
            onDelisted,
          }),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allTrades.push(
            ...result.value.map((t: any) => ({ ...t, marketType })),
          );
        } else if (result.status === 'rejected') {
          const err = result.reason as Error & { message?: string };
          const is429 = err?.message?.includes('429') || err?.message?.includes('Too Many Requests');
          if (is429) {
            this.logger.warn(`Rate limit (429) on ${exchange?.id || exchange?.name || 'exchange'}, waiting 65s`);
            await new Promise((r) => setTimeout(r, 65_000));
          }
          throw result.reason;
        }
      }
    }

    return allTrades;
  }
}
