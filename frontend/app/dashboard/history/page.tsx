'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { useTrades } from '@/hooks/use-trades';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';
import { PerformanceChart } from '@/components/PerformanceChart';

const PER_PAGE = 20;

export default function HistoryPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterExchange, setFilterExchange] = useState<string>('all');
  const [days, setDays] = useState('90');
  const [chartExpanded, setChartExpanded] = useState(true);
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [filterType, filterExchange, debouncedSearch, days]);

  // Fetch trades from backend with server-side filters + pagination
  const { data: tradesData, isLoading: initialLoading, isFetching: fetching } = useTrades(
    parseInt(days),
    undefined,
    PER_PAGE,
    {
      search: debouncedSearch || undefined,
      side: filterType !== 'all' ? filterType : undefined,
      exchange: filterExchange !== 'all' ? filterExchange : undefined,
      page,
    },
  );

  // Also fetch ALL trades (no filter, high limit) for chart + stats — cached separately
  const { data: allTradesData } = useTrades(parseInt(days), undefined, 10000, {
    page: 1,
  });

  const trades = tradesData?.trades || [];
  const totalPages = tradesData?.totalPages || 1;
  const totalTrades = tradesData?.total || 0;
  const exchanges = tradesData?.exchanges || [];
  const stats = allTradesData?.stats;

  // Build cumulative invested capital for the chart
  // Buys add to invested capital, sells subtract — always shows data when there are trades
  const chartData = useMemo(() => {
    const allTrades = allTradesData?.trades || [];
    if (allTrades.length === 0) return [];

    // allTrades come from backend most-recent-first, reverse for chronological
    const chronological = [...allTrades].reverse();
    let cumulativeInvested = 0;
    const points: Array<{ timestamp: string; value: number }> = [];

    for (const t of chronological) {
      if (t.side === 'buy') {
        cumulativeInvested += t.cost;
      } else if (t.side === 'sell') {
        cumulativeInvested -= t.cost;
      }
      points.push({
        timestamp: new Date(t.timestamp).toISOString(),
        value: Math.max(0, cumulativeInvested),
      });
    }

    // Deduplicate by day for cleaner chart
    const byDay = new Map<string, { timestamp: string; value: number }>();
    for (const p of points) {
      const dayKey = p.timestamp.slice(0, 10);
      byDay.set(dayKey, p); // keep latest value per day
    }
    return Array.from(byDay.values());
  }, [allTradesData]);

  // Map days to chart time range
  const chartTimeRange = useMemo(() => {
    const d = parseInt(days);
    if (d === 0) return 'all' as const;
    if (d <= 30) return '30d' as const;
    if (d <= 90) return '90d' as const;
    if (d <= 365) return '1y' as const;
    return 'all' as const;
  }, [days]);

  // Stats from all trades
  const buyCount = stats?.totalTrades
    ? stats.totalTrades - (stats.profitableTrades || 0) - (stats.losingTrades || 0)
    : (allTradesData?.trades || []).filter(t => t.side === 'buy').length;
  const sellCount = (stats?.profitableTrades || 0) + (stats?.losingTrades || 0);
  const totalVolume = stats?.totalVolume || 0;
  const winRate = stats?.winRate !== undefined ? stats.winRate.toFixed(0) : '—';
  const totalPnl = useMemo(() => {
    const allTrades = allTradesData?.trades || [];
    return allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  }, [allTradesData]);
  const pnlWins = stats?.profitableTrades || 0;
  const pnlLosses = stats?.losingTrades || 0;

  // Group current page trades by date
  interface GroupedTrades {
    date: string;
    trades: typeof trades;
  }

  const groupedTrades: GroupedTrades[] = useMemo(() => {
    return trades.reduce((groups, trade) => {
      const date = new Date(trade.timestamp).toLocaleDateString('pt-PT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const existing = groups.find(g => g.date === date);
      if (existing) existing.trades.push(trade);
      else groups.push({ date, trades: [trade] });
      return groups;
    }, [] as GroupedTrades[]);
  }, [trades]);

  const exportCSV = () => {
    const allTrades = allTradesData?.trades || [];
    const headers = ['Data', 'Tipo', 'Par', 'Exchange', 'Quantidade', 'Preço', 'Total', 'P&L', 'P&L %'];
    const rows = allTrades.map(t => [
      new Date(t.timestamp).toISOString(), t.side, t.symbol, t.exchange || '',
      t.amount.toString(), t.price.toString(), t.cost.toString(),
      t.pnl?.toFixed(2) || '', t.pnlPercent?.toFixed(2) || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades-${days}d.csv`;
    link.click();
    toast.success('CSV exportado');
  };

  // Pagination helpers
  const getPageNumbers = () => {
    const pages: (number | 'dots')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('dots');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('dots');
      pages.push(totalPages);
    }
    return pages;
  };

  if (isPending || initialLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-medium tracking-tight">Trades</h1>
              <p className="text-xs text-muted-foreground">{totalTrades} trades</p>
            </div>
            {fetching && (
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
            )}
          </div>
          <Button onClick={exportCSV} size="sm" variant="outline" className="h-8 text-xs" aria-label="Exportar trades para CSV">Exportar CSV</Button>
        </div>
      </FadeIn>

      {/* Stats bar */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="px-4 py-3 bg-card border border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total</p>
            <p className="text-lg font-medium mt-0.5 font-display">{allTradesData?.total || 0}</p>
            <p className="text-[10px] text-muted-foreground">{buyCount}C · {sellCount}V</p>
          </div>
          <div className="px-4 py-3 bg-card border border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">P&L Realizado</p>
            <p className={`text-lg font-medium mt-0.5 font-display ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalPnl >= 0 ? '+' : ''}{formatValue(totalPnl)}
            </p>
          </div>
          <div className="px-4 py-3 bg-card border border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Win Rate</p>
            <p className="text-lg font-medium mt-0.5 font-display">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">{pnlWins}W/{pnlLosses}L</p>
          </div>
          <div className="px-4 py-3 bg-card border border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Volume</p>
            <p className="text-lg font-medium mt-0.5 font-display">{formatValue(totalVolume)}</p>
          </div>
        </div>
      </FadeIn>

      {/* P&L Performance Chart — same style as dashboard */}
      <FadeIn delay={0.1}>
        {chartData.length > 0 && (
          <div className="border border-border bg-card">
            <button
              onClick={() => setChartExpanded(!chartExpanded)}
              aria-expanded={chartExpanded}
              aria-label="Expandir/fechar gráfico P&L"
              className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <p className="text-xs font-medium">Capital Investido</p>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatValue(chartData.length > 0 ? chartData[chartData.length - 1].value : 0)}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${chartExpanded ? '' : '-rotate-90'}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {chartExpanded && (
              <div className="px-2 pb-2">
                <PerformanceChart
                  data={chartData}
                  timeRange={chartTimeRange}
                  height={220}
                />
              </div>
            )}
          </div>
        )}
      </FadeIn>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <Input placeholder="Procurar par..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'buy' | 'sell')}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="buy">Compras</SelectItem>
            <SelectItem value="sell">Vendas</SelectItem>
          </SelectContent>
        </Select>
        {exchanges.length > 0 && (
          <Select value={filterExchange} onValueChange={setFilterExchange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {exchanges.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem>
            <SelectItem value="730">2 anos</SelectItem>
            <SelectItem value="0">Desde sempre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trades list */}
      <FadeIn delay={0.15}>
        {groupedTrades.length === 0 ? (
          <div className="p-12 border border-border bg-card text-center">
            <p className="text-muted-foreground text-sm">Sem trades encontradas</p>
          </div>
        ) : (
          <div className={`space-y-5 transition-opacity ${fetching ? 'opacity-70' : ''}`}>
            {groupedTrades.map((group) => (
              <div key={group.date}>
                <p className="text-[10px] font-medium text-muted-foreground mb-2 capitalize">{group.date}</p>
                <div className="border border-border divide-y divide-border">
                  {group.trades.map((trade, i) => (
                    <div key={trade.id || i} className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 transition-colors">
                      <div className={`w-0.5 h-10 shrink-0 ${trade.side === 'buy' ? 'bg-foreground' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{trade.symbol}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 ${trade.side === 'buy' ? 'bg-muted text-foreground' : 'bg-red-500/10 text-red-500'}`}>
                            {trade.side === 'buy' ? 'COMPRA' : 'VENDA'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(trade.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          {trade.exchange && ` · ${trade.exchange}`}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs">{trade.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                        <p className="text-[10px] text-muted-foreground">@ {formatValue(trade.price)}</p>
                      </div>
                      <div className="text-right min-w-16">
                        <p className="text-xs font-medium">{formatValue(trade.cost)}</p>
                        {trade.fee > 0 && <p className="text-[9px] text-muted-foreground">fee {formatValue(trade.fee)}</p>}
                      </div>
                      {trade.pnl !== null && trade.pnl !== undefined && (
                        <div className="text-right min-w-20 hidden sm:block">
                          <p className={`text-xs font-medium ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{formatValue(trade.pnl)}
                          </p>
                          {trade.pnlPercent !== null && trade.pnlPercent !== undefined && (
                            <p className={`text-[9px] ${trade.pnlPercent >= 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                              {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </FadeIn>

      {/* Pagination */}
      {totalPages > 1 && (
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, totalTrades)} de {totalTrades}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                aria-label="Primeira página"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </Button>
              {getPageNumbers().map((p, i) =>
                p === 'dots' ? (
                  <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                aria-label="Próxima página"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Última página"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
              </Button>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
