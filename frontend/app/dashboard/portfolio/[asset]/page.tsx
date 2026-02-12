'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { useAssetStats } from '@/hooks/use-asset-stats';
import { useTrades } from '@/hooks/use-trades';
import { useLivePrices } from '@/lib/price-service';
import type { TradeData } from '@/lib/types';

import { PremiumChart } from '@/components/PremiumChart';
import { AssetIcon } from '@/components/AssetIcon';
import { IntegrationIcon, hasIcon } from '@/components/IntegrationIcons';

interface ExchangeBreakdown {
  exchange: string;
  amount: number;
  usdValue: number;
  percent: number;
}

interface PricePoint {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

const TIME_RANGE_CONFIG: Record<TimeRange, { days: number; interval: string; label: string }> = {
  '7d': { days: 7, interval: '1h', label: '7D' },
  '30d': { days: 30, interval: '4h', label: '1M' },
  '90d': { days: 90, interval: '1d', label: '3M' },
  '1y': { days: 365, interval: '1d', label: '1A' },
  'all': { days: 2922, interval: '1d', label: 'Max' }, // 8 years
};

export default function AssetDetailPage() {
  const params = useParams();
  const asset = (params.asset as string)?.toUpperCase();
  const { data: session, isPending } = useSession();
  const { formatValue, formatPrice, formatChartValue } = useCurrency();
  const router = useRouter();
  
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');

  const { data: assetStats, isLoading: assetStatsLoading } = useAssetStats(asset);
  const { data: tradesData, isLoading: tradesLoading } = useTrades(2922, asset, 10000);
  const loading = assetStatsLoading || tradesLoading;

  const { prices: livePrices } = useLivePrices(asset ? [asset] : []);
  const liveData = livePrices.get(asset);
  const livePrice = liveData?.price;

  const trades = useMemo(() => (tradesData?.trades || []) as TradeData[], [tradesData?.trades]);

  const {
    totalAmount = 0,
    totalValue = 0,
    totalBuyCost = 0,
    avgCost = 0,
    pnl = 0,
    pnlPercent = 0,
  } = assetStats ?? {};

  const exchanges: ExchangeBreakdown[] = useMemo(() => {
    const breakdown = assetStats?.exchangeBreakdown ?? [];
    const totalVal = assetStats?.totalValue ?? 0;
    return breakdown
      .map((eb) => ({
        exchange: eb.exchange || 'Desconhecido',
        amount: eb.amount,
        usdValue: eb.usdValue,
        percent: totalVal > 0 ? (eb.usdValue / totalVal) * 100 : 0,
      }))
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [assetStats?.exchangeBreakdown, assetStats?.totalValue]);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  // Fetch price history when asset or time range changes
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!asset || isPending || !session) return;
    fetchPriceHistory();
  }, [asset, timeRange, session, isPending]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const fetchPriceHistory = async () => {
    setChartLoading(true);
    try {
      const config = TIME_RANGE_CONFIG[timeRange];
      const res = await fetch(`/api/prices/history?symbol=${asset}&interval=${config.interval}&days=${config.days}`);
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setChartLoading(false);
    }
  };

  // Trade markers for PremiumChart — inclui cost e amount para tooltip
  const chartMarkers = useMemo(() => {
    if (!priceHistory.length || !trades.length) return [];
    
    const chartStart = new Date(priceHistory[0].timestamp).getTime();
    const chartEnd = new Date(priceHistory[priceHistory.length - 1].timestamp).getTime();
    
    const markers: Array<{ timestamp: string; value: number; type: 'buy' | 'sell'; label?: string; cost?: number; amount?: number }> = [];
    
    for (const trade of trades) {
      const tradeTime = new Date(trade.timestamp).getTime();
      if (tradeTime < chartStart || tradeTime > chartEnd) continue;

      markers.push({
        timestamp: typeof trade.timestamp === 'string' ? trade.timestamp : new Date(trade.timestamp).toISOString(),
        value: trade.price,
        type: trade.side === 'buy' ? 'buy' : 'sell',
        label: `${trade.side === 'buy' ? 'C' : 'V'} ${trade.amount.toFixed(4)}`,
        cost: trade.cost,
        amount: trade.amount,
      });
    }
    
    return markers;
  }, [priceHistory, trades]);

  // Preço máximo no período (para mostrar no header)
  const maxPriceInPeriod = useMemo(() => {
    if (!priceHistory.length) return 0;
    return Math.max(...priceHistory.map((p) => p.close));
  }, [priceHistory]);

  const pricePerUnit = totalAmount > 0 ? totalValue / totalAmount : 0;

  // Price change over chart period
  const firstPrice = priceHistory.length > 0 ? priceHistory[0].close : 0;
  const lastPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].close : 0;
  const periodChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  if (isPending || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/dashboard/portfolio" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Portfolio
      </Link>

      {/* Header with live price */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AssetIcon symbol={asset} size={48} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium tracking-tight">{asset}</h1>
              <span className="text-[10px] px-2 py-0.5 border border-border text-muted-foreground uppercase tracking-wider">
                {asset}/USDT
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xl font-medium">
                {livePrice ? formatValue(livePrice) : formatValue(pricePerUnit)}
              </span>
              {liveData && (
                <span className={`text-sm ${liveData.changePercent24h >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                  {liveData.changePercent24h >= 0 ? '+' : ''}{liveData.changePercent24h.toFixed(2)}%
                  <span className="text-muted-foreground ml-1 text-xs">24h</span>
                </span>
              )}
              {liveData && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-foreground animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium">Preço</p>
            {!chartLoading && priceHistory.length > 0 && (
              <div className="flex items-center gap-3">
                <span className={`text-xs ${periodChange >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                  {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  Max {formatChartValue(maxPriceInPeriod)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Legend: line = dourado, markers = verde/vermelho */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                Preço
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                Compra
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Venda
              </div>
            </div>
            {/* Time range */}
            <div className="flex gap-1">
              {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  aria-pressed={timeRange === range}
                  aria-label={`Período ${TIME_RANGE_CONFIG[range].label}`}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === range ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TIME_RANGE_CONFIG[range].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4">
          {chartLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
            </div>
          ) : (
            <PremiumChart
              data={priceHistory.map(p => ({ timestamp: p.timestamp, value: p.close }))}
              height={340}
              formatValue={formatChartValue}
              markers={chartMarkers}
              timeRange={timeRange}
              hideMaxInChart
            />
          )}
        </div>
      </div>

      {/* Position stats — compact bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="px-4 py-3 border border-border bg-card">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Posição</p>
          <p className="text-lg font-medium mt-1 leading-tight">{formatValue(totalValue)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset}</p>
        </div>
        <div className="px-4 py-3 border border-border bg-card">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Total Investido</p>
          <p className="text-lg font-medium mt-1 leading-tight">{formatValue(totalBuyCost)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">avg {formatValue(avgCost)}/un</p>
        </div>
        <div className="px-4 py-3 border border-border bg-card">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">P&L</p>
          <p className={`text-lg font-medium mt-1 leading-tight ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {pnl >= 0 ? '+' : ''}{formatValue(pnl)}
          </p>
          <p className={`text-[10px] mt-0.5 ${pnlPercent >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}% ROI
          </p>
        </div>
        <div className="px-4 py-3 border border-border bg-card">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Exchanges</p>
          <p className="text-lg font-medium mt-1 leading-tight">{exchanges.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{trades.length} trades</p>
        </div>
      </div>

      {/* Bottom: Exchange breakdown + Trades side by side */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Exchange breakdown */}
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium">Distribuição</p>
          </div>
          <div className="divide-y divide-border">
            {exchanges.map((ex) => {
              const exchangeId = ex.exchange.toLowerCase();
              return (
              <div key={ex.exchange} className="flex items-center gap-3 px-4 py-3">
                {hasIcon(exchangeId) ? (
                  <IntegrationIcon id={exchangeId} size={28} className="shrink-0" />
                ) : (
                  <div className="w-7 h-7 bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                    {ex.exchange.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium capitalize">{ex.exchange}</p>
                    <p className="text-xs font-medium">{formatValue(ex.usdValue)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 h-1 bg-muted max-w-24">
                        <div className="h-full bg-foreground/40" style={{ width: `${ex.percent}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ex.percent.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {ex.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </p>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Recent trades */}
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-medium">Trades</p>
            <Link href={`/dashboard/history?asset=${asset}`} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {trades.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Sem trades</div>
            ) : (
              trades.slice(0, 20).map((trade, i) => (
                <div key={trade.id || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="w-0.5 h-8 shrink-0 bg-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-foreground">
                        {trade.side === 'buy' ? 'COMPRA' : 'VENDA'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{trade.exchange}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(trade.timestamp).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs">{trade.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                    <p className="text-[10px] text-muted-foreground">@ {formatPrice(trade.price)}</p>
                  </div>
                  <div className="text-right min-w-16">
                    {trade.pnl !== null ? (
                      <p className={`text-xs font-medium ${trade.pnl >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{formatValue(trade.pnl)}
                      </p>
                    ) : (
                      <p className="text-xs font-medium">{formatValue(trade.cost)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
