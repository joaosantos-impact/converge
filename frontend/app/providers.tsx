'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, createContext, useContext, useEffect, useCallback, useRef } from 'react';

// Currency context
type Currency = 'USD' | 'EUR' | 'BTC';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatValue: (usdValue: number) => string;
  /** For very small values (e.g. PEPE price) — avoids rounding to 0,00 € */
  formatPrice: (usdValue: number) => string;
  /** For chart axes — uses scientific notation (×10ⁿ) when value &lt; 0.01 */
  formatChartValue: (usdValue: number) => string;
  rates: { EUR: number; BTC: number };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default fallback so useCurrency never throws (safe during SSR / hot-reload)
const defaultFormatPrice = (v: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(v * 0.92);

const formatChartValueDefault = (v: number) =>
  Math.abs(v) < 0.01 && v !== 0 ? v.toExponential(2) : defaultFormatPrice(v);

const DEFAULT_CURRENCY_CONTEXT: CurrencyContextType = {
  currency: 'EUR',
  setCurrency: () => {},
  formatValue: (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v * 0.92),
  formatPrice: defaultFormatPrice,
  formatChartValue: formatChartValueDefault,
  rates: { EUR: 0.92, BTC: 0.000015 },
};

export function useCurrency() {
  const context = useContext(CurrencyContext);
  return context ?? DEFAULT_CURRENCY_CONTEXT;
}

// Fallback rates (used until live rates load)
const DEFAULT_RATES = { EUR: 0.92, BTC: 0.000015 };
const RATES_CACHE_KEY = 'converge-exchange-rates';
const RATES_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // SSR-safe localStorage read
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('preferred-currency') as Currency;
    if (saved && ['USD', 'EUR', 'BTC'].includes(saved)) setCurrency(saved);

    // Load cached rates immediately (prevents stale display)
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const { rates: cachedRates, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < RATES_REFRESH_MS * 6) {
          setRates(cachedRates);
        }
      }
    } catch { /* ignore parse errors */ }

    // Fetch live rates
    const fetchRates = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      try {
        // CoinGecko free API — no key needed, 30 req/min
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=eur,btc,usd',
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error('Rate fetch failed');
        const data = await res.json();

        // USDT → EUR rate, BTC → USD rate to derive USD → BTC
        const eurRate = data?.tether?.eur ?? DEFAULT_RATES.EUR;
        const btcPriceUsd = data?.bitcoin?.usd ?? (1 / DEFAULT_RATES.BTC);
        const btcRate = btcPriceUsd > 0 ? 1 / btcPriceUsd : DEFAULT_RATES.BTC;

        const newRates = { EUR: eurRate, BTC: btcRate };
        setRates(newRates);
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates: newRates, timestamp: Date.now() }));
      } catch {
        // Silently fall back to cached/default rates
        fetchedRef.current = false;
      }
    };

    fetchRates();

    // Refresh rates periodically
    const interval = setInterval(() => {
      fetchedRef.current = false;
      fetchRates();
    }, RATES_REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  const handleSetCurrency = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-currency', newCurrency);
    }
  }, []);

  const formatValue = useCallback((usdValue: number): string => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(usdValue);
    } else if (currency === 'EUR') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(usdValue * rates.EUR);
    } else {
      const btcValue = usdValue * rates.BTC;
      return `₿${btcValue.toFixed(btcValue < 0.0001 ? 8 : 4)}`;
    }
  }, [currency, rates]);

  const formatPrice = useCallback((usdValue: number): string => {
    const abs = Math.abs(usdValue);
    const eurAbs = abs * rates.EUR;
    // Use exponential for tiny values that would show as 0,00 €
    if (abs > 0 && eurAbs < 0.0001) {
      const exp = (usdValue * (currency === 'EUR' ? rates.EUR : currency === 'USD' ? 1 : rates.BTC)).toExponential(2);
      return currency === 'EUR' ? `${exp} €` : currency === 'USD' ? `$${exp}` : `₿${exp}`;
    }
    const needExtraDecimals = abs > 0 && abs < 0.01;
    const decimals = needExtraDecimals ? Math.min(8, Math.max(2, Math.ceil(-Math.log10(abs)))) : 2;

    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: 8,
      }).format(usdValue);
    } else if (currency === 'EUR') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: 8,
      }).format(usdValue * rates.EUR);
    } else {
      const btcValue = usdValue * rates.BTC;
      return `₿${btcValue.toFixed(btcValue < 0.0001 ? 8 : 4)}`;
    }
  }, [currency, rates]);

  const formatChartValue = useCallback((usdValue: number): string => {
    const abs = Math.abs(usdValue);
    if (abs > 0 && abs < 0.01) {
      return usdValue.toExponential(2);
    }
    return formatValue(usdValue);
  }, [formatValue]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatValue, formatPrice, formatChartValue, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchInterval: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <CurrencyProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
