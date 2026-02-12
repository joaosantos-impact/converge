'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { useTrades } from '@/hooks/use-trades';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/animations';
import { AssetIcon } from '@/components/AssetIcon';
import { IntegrationIcon, hasIcon } from '@/components/IntegrationIcons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  D3BarChart,
  D3LineChart,
} from '@/components/charts';
import { getAvailableYears } from '@/lib/date-utils';
import { buildAssetPriceMap, feeToUsd, processFIFO } from '@/lib/fifo';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#00ffa3', BNB: '#f3ba2f',
  XRP: '#23292f', ADA: '#0033ad', AVAX: '#e84142', DOGE: '#c2a633',
  DOT: '#e6007a', MATIC: '#8247e5', LINK: '#2a5ada', UNI: '#ff007a',
  POL: '#8247e5', PEPE: '#3c9936', AEVO: '#6b4ce6', SAND: '#00adef',
  EPIC: '#6366f1', GRT: '#5942cc', EUR: '#002395',
};

function getAssetColor(asset: string, index?: number): string {
  return ASSET_COLORS[asset] ?? ['#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444'][(index ?? 0) % 6];
}

function getBaseAsset(symbol: string): string {
  return symbol.split('/')[0]?.split(':')[0] ?? symbol;
}

export default function AnalyticsPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Fetch ALL trades (like taxes page) for correct FIFO-based P&L
  const { data: tradesData, isLoading } = useTrades(0, undefined, 100000, {
    page: 1,
    marketType: 'all',
  });
  const allTrades = useMemo(() => tradesData?.trades ?? [], [tradesData?.trades]);

  const { sales, priceMap } = useMemo(() => {
    const { sales: s } = processFIFO(allTrades);
    const pm = buildAssetPriceMap(allTrades);
    return { sales: s, priceMap: pm };
  }, [allTrades]);

  const tradesByYear = useMemo(() => {
    if (selectedYear === 'all') return allTrades;
    const y = selectedYear as number;
    return allTrades.filter((t) => new Date(t.timestamp as unknown as string).getFullYear() === y);
  }, [allTrades, selectedYear]);

  const salesInPeriod = useMemo(() => {
    if (selectedYear === 'all') return sales;
    const y = selectedYear as number;
    return sales.filter((s) => s.date.getFullYear() === y);
  }, [sales, selectedYear]);

  const volumeByAsset = useMemo(() => {
    const map = new Map<string, number>();
    tradesByYear.forEach((t) => {
      const base = getBaseAsset(t.symbol);
      map.set(base, (map.get(base) ?? 0) + t.cost);
    });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([asset, vol]) => ({ label: asset, value: total > 0 ? (vol / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
      .map((d, i) => ({ ...d, color: getAssetColor(d.label, i) }));
  }, [tradesByYear]);

  const stats = useMemo(() => {
    const buys = tradesByYear.filter((t) => t.side === 'buy').length;
    const sells = tradesByYear.filter((t) => t.side === 'sell').length;
    const uniqueAssets = new Set(tradesByYear.map((t) => getBaseAsset(t.symbol))).size;
    const totalVolume = tradesByYear.reduce((s, t) => s + t.cost, 0);
    const totalFees = tradesByYear.reduce((s, t) => s + feeToUsd(t, priceMap), 0);
    const totalPnl = salesInPeriod.reduce((s, sale) => s + sale.realizedPnL, 0);
    return {
      totalTrades: tradesByYear.length,
      totalVolume,
      totalFees,
      buys,
      sells,
      totalPnl,
      uniqueAssets,
    };
  }, [tradesByYear, salesInPeriod, priceMap]);

  const bestAssetByPnl = useMemo((): { asset: string; pnl: number } | null => {
    const map = new Map<string, number>();
    salesInPeriod.forEach((s) => {
      map.set(s.baseAsset, (map.get(s.baseAsset) ?? 0) + s.realizedPnL);
    });
    let best: { asset: string; pnl: number } | null = null;
    map.forEach((pnl, asset) => {
      if (!best || pnl > best.pnl) best = { asset, pnl };
    });
    return best;
  }, [salesInPeriod]);

  const pnlByAsset = useMemo(() => {
    const map = new Map<string, number>();
    salesInPeriod.forEach((s) => {
      map.set(s.baseAsset, (map.get(s.baseAsset) ?? 0) + s.realizedPnL);
    });
    return Array.from(map.entries())
      .map(([asset, pnl]) => ({ label: asset, value: pnl }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [salesInPeriod]);

  const topExchangeByVolume = useMemo((): { exchange: string; volume: number } | null => {
    const volumeByExchange = new Map<string, number>();
    tradesByYear.forEach((t) => {
      const ex = t.exchange || 'Desconhecida';
      volumeByExchange.set(ex, (volumeByExchange.get(ex) ?? 0) + t.cost);
    });
    let top: { exchange: string; volume: number } | null = null;
    volumeByExchange.forEach((vol, ex) => {
      if (!top || vol > top.volume) top = { exchange: ex, volume: vol };
    });
    return top;
  }, [tradesByYear]);

  const volumeByExchange = useMemo(() => {
    const map = new Map<string, number>();
    tradesByYear.forEach((t) => {
      const ex = t.exchange || 'Desconhecida';
      map.set(ex, (map.get(ex) ?? 0) + t.cost);
    });
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];
    return Array.from(map.entries())
      .map(([exchange, volume]) => ({ label: exchange, value: volume }))
      .sort((a, b) => b.value - a.value)
      .map((d, i) => ({ ...d, color: colors[i % colors.length] }));
  }, [tradesByYear]);

  const isAllYears = selectedYear === 'all';

  /** P&L (FIFO) e volume por período: por ano quando "Todos", por mês quando ano específico */
  const tradesByPeriod = useMemo(() => {
    if (isAllYears) {
      const byYear = new Map<number, { volumeCompra: number; volumeVenda: number; pnl: number }>();
      allTrades.forEach((t) => {
        const y = new Date(t.timestamp as unknown as string).getFullYear();
        const entry = byYear.get(y) ?? { volumeCompra: 0, volumeVenda: 0, pnl: 0 };
        if (t.side === 'buy') entry.volumeCompra += t.cost;
        else entry.volumeVenda += t.cost;
        byYear.set(y, entry);
      });
      sales.forEach((s) => {
        const y = s.date.getFullYear();
        const entry = byYear.get(y) ?? { volumeCompra: 0, volumeVenda: 0, pnl: 0 };
        entry.pnl += s.realizedPnL;
        byYear.set(y, entry);
      });
      const yearsSorted = Array.from(byYear.keys()).sort((a, b) => a - b);
      return yearsSorted.map((y) => {
        const e = byYear.get(y)!;
        return { x: String(y), volumeCompra: e.volumeCompra, volumeVenda: e.volumeVenda, pnl: e.pnl };
      });
    } else {
      const year = selectedYear as number;
      const byMonth = new Map<string, { volumeCompra: number; volumeVenda: number; pnl: number }>();
      for (const m of MONTH_NAMES) byMonth.set(m, { volumeCompra: 0, volumeVenda: 0, pnl: 0 });
      allTrades
        .filter((t) => new Date(t.timestamp as unknown as string).getFullYear() === year)
        .forEach((t) => {
          const month = new Date(t.timestamp as unknown as string).getMonth();
          const key = MONTH_NAMES[month];
          const entry = byMonth.get(key)!;
          if (t.side === 'buy') entry.volumeCompra += t.cost;
          else entry.volumeVenda += t.cost;
          byMonth.set(key, entry);
        });
      sales
        .filter((s) => s.date.getFullYear() === year)
        .forEach((s) => {
          const key = MONTH_NAMES[s.date.getMonth()];
          const entry = byMonth.get(key)!;
          entry.pnl += s.realizedPnL;
        });
      return MONTH_NAMES.map((m) => {
        const e = byMonth.get(m)!;
        return { x: m, volumeCompra: e.volumeCompra, volumeVenda: e.volumeVenda, pnl: e.pnl };
      });
    }
  }, [allTrades, sales, selectedYear, isAllYears]);

  useEffect(() => {
    if (isPending) return;
    if (!session) router.push('/sign-in');
  }, [session, isPending, router]);

  if (isPending || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Estatísticas de Trades</h1>
            <p className="text-sm text-muted-foreground">
              Análise temporal das tuas operações (spot e futuros)
            </p>
          </div>
          <Select
            value={selectedYear === 'all' ? 'all' : String(selectedYear)}
            onValueChange={(v) => setSelectedYear(v === 'all' ? 'all' : parseInt(v, 10))}
          >
            <SelectTrigger className="min-w-[160px] h-9 [&_[data-slot=select-value]]:line-clamp-none">
              <SelectValue placeholder="Ano: Selecionar" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ano: Todos os anos</SelectItem>
              {getAvailableYears().map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {/* Stats cards */}
      <FadeIn delay={0.05}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-border bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Trades</p>
            <p className="text-xl font-semibold font-display mt-0.5">{stats.totalTrades}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume</p>
            <p className="text-xl font-semibold font-display mt-0.5">{formatValue(stats.totalVolume)}</p>
          </div>
          <div className="border border-border bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">P&L Total</p>
            <p className={`text-xl font-semibold font-display mt-0.5 ${stats.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}{formatValue(stats.totalPnl)}
            </p>
          </div>
          <div className="border border-border bg-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Fees</p>
            <p className="text-xl font-semibold font-display mt-0.5">{formatValue(stats.totalFees)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.buys} compras · {stats.sells} vendas</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="grid gap-3 sm:grid-cols-2">
          {bestAssetByPnl ? (
            <div className="border border-border bg-card p-4 flex items-center gap-4">
              <AssetIcon symbol={bestAssetByPnl.asset} size={48} />
              <div>
                <p className="text-sm font-medium">Asset com mais lucro</p>
                <p className={`text-xs ${bestAssetByPnl.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {bestAssetByPnl.asset} em {selectedYear === 'all' ? 'todo o período' : selectedYear}: {bestAssetByPnl.pnl >= 0 ? '+' : ''}{formatValue(bestAssetByPnl.pnl)}
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-card p-4 min-h-[72px]" />
          )}
          {topExchangeByVolume ? (
            <div className="border border-border bg-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden rounded">
                {hasIcon(topExchangeByVolume.exchange.toLowerCase()) ? (
                  <IntegrationIcon id={topExchangeByVolume.exchange.toLowerCase()} size={48} />
                ) : (
                  <div className="w-12 h-12 bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                    {topExchangeByVolume.exchange.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Exchange mais utilizada</p>
                <p className="text-xs text-muted-foreground">
                  {topExchangeByVolume.exchange} em {selectedYear === 'all' ? 'todo o período' : selectedYear}: {formatValue(topExchangeByVolume.volume)} de volume
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-card p-4 min-h-[72px]" />
          )}
        </div>
      </FadeIn>

      {/* Charts row 1: Volume por Asset + Volume por Exchange */}
      <FadeIn delay={0.1}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium">Volume por Asset (%)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Distribuição do volume de trading</p>
            </div>
            <div className="p-4">
              {volumeByAsset.length > 0 ? (
                <D3BarChart
                  data={volumeByAsset}
                  height={280}
                  horizontal
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  showMax
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem trades neste período
                </div>
              )}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium">Volume por Exchange</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Volume de trading em cada exchange</p>
            </div>
            <div className="p-4">
              {volumeByExchange.length > 0 ? (
                <D3BarChart
                  data={volumeByExchange}
                  height={280}
                  formatValue={formatValue}
                  showMax
                  horizontal
                  wide
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem trades neste período
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* P&L por Asset */}
      <FadeIn delay={0.11}>
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium">P&L por Asset</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Lucro ou prejuízo por ativo no período</p>
          </div>
          <div className="p-4">
            {pnlByAsset.length > 0 ? (
              <D3BarChart
                data={pnlByAsset}
                height={280}
                formatValue={formatValue}
                showMax={false}
                diverging
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem trades neste período
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* P&L por período */}
      <FadeIn delay={0.12}>
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium">{isAllYears ? 'P&L por ano' : 'P&L por mês'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isAllYears ? 'Lucro ou prejuízo por ano' : `Lucro ou prejuízo em ${selectedYear}`}
            </p>
          </div>
          <div className="p-4">
            {tradesByPeriod.some((d) => d.pnl !== 0) ? (
              <D3BarChart
                data={tradesByPeriod.map((d) => ({ label: d.x, value: d.pnl }))}
                height={280}
                formatValue={formatValue}
                showMax={false}
                diverging
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de P&L neste período
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Volume de Venda e Compra por período */}
      <FadeIn delay={0.15}>
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium">{isAllYears ? 'Volume de Venda e Compra por ano' : 'Volume de Venda e Compra por mês'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isAllYears ? 'Valor por ano' : `Valor em ${selectedYear}`}
              </p>
            </div>
            {(() => {
              const maxVolume = Math.max(
                ...tradesByPeriod.flatMap((d) => [d.volumeVenda, d.volumeCompra]),
                0
              );
              return maxVolume > 0 ? (
                <span className="text-[10px] text-muted-foreground">Max {formatValue(maxVolume)}</span>
              ) : null;
            })()}
          </div>
          <div className="p-4">
            {tradesByPeriod.some((d) => d.volumeVenda > 0 || d.volumeCompra > 0) ? (
              <>
                <D3LineChart
                  data={tradesByPeriod}
                  seriesKeys={['volumeVenda', 'volumeCompra']}
                  seriesLabels={{ volumeVenda: 'Venda', volumeCompra: 'Compra' }}
                  seriesColors={{ volumeVenda: '#8b5cf6', volumeCompra: '#3b82f6' }}
                  height={280}
                  formatValue={formatValue}
                  formatLabel={(x) => x}
                  showArea
                  showCrosshair
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
                  <div className="flex items-center gap-1.5">
<span className="w-2.5 h-2.5 shrink-0 rounded-none bg-[#8b5cf6]" aria-hidden />
                  <span className="text-[10px] text-muted-foreground">Venda</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 shrink-0 rounded-none bg-[#3b82f6]" aria-hidden />
                    <span className="text-[10px] text-muted-foreground">Compra</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
