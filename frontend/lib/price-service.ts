'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: number;
}

type PriceCallback = (prices: Map<string, PriceData>) => void;

class BinancePriceService {
  private ws: WebSocket | null = null;
  private prices: Map<string, PriceData> = new Map();
  private callbacks: Set<PriceCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private symbols: string[] = [];
  private connected = false;

  subscribe(callback: PriceCallback) {
    this.callbacks.add(callback);
    // Send current state immediately
    if (this.prices.size > 0) {
      callback(this.prices);
    }
    return () => {
      this.callbacks.delete(callback);
    };
  }

  connect(symbols: string[]) {
    this.symbols = symbols;
    
    if (this.ws) {
      this.ws.close();
    }

    if (symbols.length === 0) return;

    // Convert symbols to Binance format: BTC -> btcusdt
    const streams = symbols
      .map(s => `${s.toLowerCase()}usdt@ticker`)
      .join('/');

    const url = `wss://stream.binance.com:9443/ws/${streams}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('[Binance WS] Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.s) {
            // Individual ticker
            const symbol = data.s.replace('USDT', '');
            this.prices.set(symbol, {
              symbol,
              price: parseFloat(data.c),
              change24h: parseFloat(data.p),
              changePercent24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume24h: parseFloat(data.v),
              lastUpdate: Date.now(),
            });
            this.notify();
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('[Binance WS] Disconnected');
        // Auto reconnect after 5s
        this.reconnectTimer = setTimeout(() => {
          this.connect(this.symbols);
        }, 5000);
      };

      this.ws.onerror = () => {
        console.log('[Binance WS] Error');
      };
    } catch (error) {
      console.error('[Binance WS] Failed to connect:', error);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  private notify() {
    for (const cb of this.callbacks) {
      cb(new Map(this.prices));
    }
  }

  isConnected() {
    return this.connected;
  }

  subscriberCount() {
    return this.callbacks.size;
  }

  getPrice(symbol: string): PriceData | undefined {
    return this.prices.get(symbol);
  }
}

// Singleton
let serviceInstance: BinancePriceService | null = null;

function getService(): BinancePriceService {
  if (!serviceInstance) {
    serviceInstance = new BinancePriceService();
  }
  return serviceInstance;
}

// React hook
export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [connected, setConnected] = useState(false);
  const serviceRef = useRef<BinancePriceService | null>(null);

  // Stable key from symbols to avoid unnecessary reconnections
  const symbolsKey = useMemo(() => [...symbols].sort().join(','), [symbols]);

  useEffect(() => {
    if (!symbolsKey) return;

    const symbolsList = symbolsKey.split(',');
    const service = getService();
    serviceRef.current = service;

    service.connect(symbolsList);
    
    const unsubscribe = service.subscribe((newPrices) => {
      setPrices(newPrices);
      setConnected(service.isConnected());
    });

    // Check connection status periodically
    const interval = setInterval(() => {
      setConnected(service.isConnected());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      // Disconnect WebSocket if no more subscribers
      if (service.subscriberCount() === 0) {
        service.disconnect();
      }
    };
  }, [symbolsKey]);

  const getPrice = useCallback((symbol: string): PriceData | undefined => {
    return prices.get(symbol);
  }, [prices]);

  return { prices, connected, getPrice };
}

// Fetch initial prices from Binance REST API (for SSR/initial load)
export async function fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    const pairs = symbols.map(s => `"${s}USDT"`).join(',');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
    );
    
    if (response.ok) {
      const data = await response.json();
      for (const item of data) {
        const symbol = item.symbol.replace('USDT', '');
        prices.set(symbol, parseFloat(item.price));
      }
    }
  } catch (error) {
    console.error('Failed to fetch prices:', error);
  }
  
  return prices;
}
