'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
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
import { useAutoSync } from '@/hooks/use-auto-sync';
import { useExchangeAccounts } from '@/hooks/use-exchange-accounts';
import { AssetIcon } from '@/components/AssetIcon';
import { AssetFilterCombobox } from '@/components/AssetFilterCombobox';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';
import { getAvailableYears } from '@/lib/date-utils';
import { buildAssetPriceMap, feeToUsd, processFIFO } from '@/lib/fifo';

const PER_PAGE = 20;

/** Compact quantity for table: 159445203 → "159.4M"; smaller values stay readable */
function formatQuantityCompact(amount: number): { display: string; full: string } {
  const full = amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  if (amount >= 1e9) return { display: `${(amount / 1e9).toFixed(1)}B`, full };
  if (amount >= 1e6) return { display: `${(amount / 1e6).toFixed(1)}M`, full };
  if (amount >= 1e5) return { display: `${(amount / 1e3).toFixed(0)}K`, full };
  return { display: full, full };
}

/** Compact price for table: max 4 decimals to keep column narrow */
function formatPriceCompact(price: number, formatPrice: (v: number) => string): { display: string; full: string } {
  const full = formatPrice(price);
  const abs = Math.abs(price);
  if (abs > 0 && abs < 1e-4) {
    return { display: price.toExponential(2), full };
  }
  const maxDecimals = abs >= 100 ? 2 : 4;
  const suffix = full.includes('€') ? ' €' : full.includes('$') ? ' $' : '';
  const display = price.toLocaleString(undefined, {
    minimumFractionDigits: abs < 1 && abs > 0 ? Math.min(2, maxDecimals) : 0,
    maximumFractionDigits: maxDecimals,
  }) + suffix;
  return { display, full };
}

export interface TradeHistoryViewProps {
  /** Locked market type — this page shows only spot or only futures */
  marketType: 'spot' | 'future';
  /** Page title (e.g. "Spot", "Futuros") */
  title: string;
  /** Custom empty state message */
  emptyMessage?: string;
}

export function TradeHistoryView({ marketType, title, emptyMessage = 'Sem operações encontradas' }: TradeHistoryViewProps) {
  const searchParams = useSearchParams();
  const { isPending } = useSession();
  const { formatValue, formatPrice } = useCurrency();
  const { syncing } = useAutoSync();
  const { data: accounts = [] } = useExchangeAccounts();
  const showSyncing = syncing && accounts.length > 0;
  const [filterAsset, setFilterAsset] = useState<string>(() => searchParams.get('asset') || 'all');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterExchange, setFilterExchange] = useState<string>('all');
  const availableYears = useMemo(() => getAvailableYears(), []);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const assetFromUrl = searchParams.get('asset');
    if (assetFromUrl) {
      queueMicrotask(() => setFilterAsset(assetFromUrl));
    }
  }, [searchParams]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination on filter change is intentional
  useEffect(() => { setPage(1); }, [filterType, filterExchange, filterAsset, selectedYear]);

  const tradesParams = {
    days: 0,
    year: selectedYear,
    search: filterAsset !== 'all' ? filterAsset : undefined,
    side: filterType !== 'all' ? filterType : undefined,
    exchange: filterExchange !== 'all' ? filterExchange : undefined,
    marketType,
  };

  const { data: tradesData, isLoading: initialLoading, isFetching: fetching } = useTrades(
    0,
    undefined,
    PER_PAGE,
    { ...tradesParams, page },
  );

  const { data: allTradesData } = useTrades(0, undefined, 10000, {
    ...tradesParams,
    page: 1,
  });

  const { data: tradesForAssets } = useTrades(0, undefined, 5000, {
    ...tradesParams,
    page: 1,
  });

  const trades = useMemo(() => tradesData?.trades || [], [tradesData]);
  const totalPages = tradesData?.totalPages || 1;
  const totalTrades = tradesData?.total || 0;
  const exchanges = useMemo(() => {
    const fromTrades = tradesData?.exchanges || [];
    if (fromTrades.length > 0) return fromTrades;
    return [...new Set(accounts.map((a) => a.exchange).filter(Boolean))];
  }, [tradesData?.exchanges, accounts]);
  const stats = allTradesData?.stats;

  const availableAssets = useMemo(() => {
    const allTrades = tradesForAssets?.trades || [];
    const set = new Set<string>();
    allTrades.forEach((t) => {
      const base = t.symbol.split('/')[0]?.split(':')[0]?.trim() || t.symbol;
      if (base) set.add(base);
    });
    return Array.from(set).sort();
  }, [tradesForAssets]);

  const buyCount = stats?.totalTrades
    ? stats.totalTrades - (stats.profitableTrades || 0) - (stats.losingTrades || 0)
    : (allTradesData?.trades || []).filter(t => t.side === 'buy').length;
  const sellCount = (stats?.profitableTrades || 0) + (stats?.losingTrades || 0);
  const totalVolume = stats?.totalVolume || 0;

  const { totalPnl, totalFees, priceMap } = useMemo(() => {
    const allTrades = allTradesData?.trades || [];
    const pm = buildAssetPriceMap(allTrades);
    const fees = allTrades.reduce((s, t) => s + feeToUsd(t, pm), 0);
    const { sales } = processFIFO(allTrades);
    const year = selectedYear === 'all' ? null : selectedYear;
    const salesInPeriod = year == null
      ? sales
      : sales.filter((s) => s.date.getFullYear() === year);
    const pnl = salesInPeriod.reduce((s, sale) => s + sale.realizedPnL, 0);
    return { totalPnl: pnl, totalFees: fees, priceMap: pm };
  }, [allTradesData?.trades, selectedYear]);

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
    link.download = `${title.toLowerCase()}-${selectedYear === 'all' ? 'todos' : selectedYear}.csv`;
    link.click();
    toast.success('CSV exportado');
  };

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

  const showFutureBadge = marketType === 'spot'; // Hide redundant badge on futures page

  if (isPending || initialLoading || (showSyncing && groupedTrades.length === 0)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="h-[400px] flex flex-col items-center justify-center gap-4 border border-border bg-card">
          <div className="w-10 h-10 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
          <p className="text-sm font-medium">{showSyncing ? 'Sincronizando...' : `A carregar ${title}`}</p>
          {showSyncing && (
            <p className="text-xs text-muted-foreground">A primeira sync pode demorar mais</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-medium tracking-tight">{title}</h1>
            {fetching && (
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 h-9">
            <Select
              value={selectedYear === 'all' ? 'all' : String(selectedYear)}
              onValueChange={(v) => setSelectedYear(v === 'all' ? 'all' : parseInt(v, 10))}
            >
              <SelectTrigger className="min-w-[120px] h-9 [&_[data-slot=select-value]]:line-clamp-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportCSV} size="sm" variant="outline" className="h-9 text-xs" aria-label={`Exportar ${title} para CSV`}>
              Exportar CSV
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex flex-wrap items-center gap-2">
          <AssetFilterCombobox
            value={filterAsset}
            onValueChange={setFilterAsset}
            options={availableAssets}
            placeholder="Asset: Todos"
          />
          {exchanges.length > 0 && (
            <Select value={filterExchange} onValueChange={setFilterExchange}>
              <SelectTrigger className="min-w-[130px] h-9"><SelectValue placeholder="Exchange" /></SelectTrigger>
              <SelectContent className="!max-h-56 overflow-y-auto">
                <SelectItem value="all">Exchange: Todas</SelectItem>
                {exchanges.map((ex) => (
                  <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'buy' | 'sell')}>
            <SelectTrigger className="min-w-[140px] h-9"><SelectValue placeholder={marketType === 'future' ? 'Long/Short' : 'Tipo de operação'} /></SelectTrigger>
            <SelectContent className="!max-h-56 overflow-y-auto">
              <SelectItem value="all">{marketType === 'future' ? 'Long/Short: Todos' : 'Tipo: Todas'}</SelectItem>
              <SelectItem value="buy">{marketType === 'future' ? 'Long' : 'Tipo: Compras'}</SelectItem>
              <SelectItem value="sell">{marketType === 'future' ? 'Short' : 'Tipo: Vendas'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-start">
          <div className="min-w-0 space-y-3">
        {groupedTrades.length === 0 ? (
          <div className="p-12 border border-border bg-card text-center">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className={`space-y-5 transition-opacity ${fetching ? 'opacity-70' : ''}`}>
            {groupedTrades.map((group) => (
              <div key={group.date}>
                <p className="text-[10px] font-medium text-muted-foreground mb-2 capitalize">{group.date}</p>
                <div className="border border-border overflow-x-auto min-w-0">
                  <div
                    className={`grid gap-2 sm:gap-3 px-2 sm:px-3 py-2 border-b border-border bg-muted/30 text-[10px] text-muted-foreground ${
                      marketType === 'future'
                        ? 'grid-cols-[minmax(140px,1fr)_minmax(3rem,auto)_minmax(4rem,auto)_minmax(3.5rem,auto)_minmax(3.5rem,auto)_minmax(3rem,auto)] min-w-[600px]'
                        : 'grid-cols-[minmax(140px,1fr)_minmax(3rem,auto)_minmax(4rem,auto)_minmax(3.5rem,auto)_minmax(3rem,auto)] min-w-[520px]'
                    }`}
                  >
                    <span className="font-medium">Par · hora</span>
                    <span className="text-right min-w-[3rem] font-medium" title="Quantidade">Qtd</span>
                    <span className="text-right min-w-[4.5rem] font-medium" title="Preço por unidade">Preço</span>
                    <span className="text-right min-w-[4rem] font-medium" title="Valor total">Total</span>
                    {marketType === 'future' && (
                      <span className="text-right min-w-[3.5rem] font-medium" title="Lucro ou perda realizados">P&L</span>
                    )}
                    <span className="text-right min-w-[3.5rem] font-medium" title="Taxa paga à exchange">Comissão</span>
                  </div>
                  <div className="divide-y divide-border">
                    {group.trades.map((trade, i) => (
                      <div
                        key={trade.id || i}
                        className={`grid gap-2 sm:gap-3 items-center p-2 sm:p-3 bg-card hover:bg-muted/50 transition-colors ${
                          marketType === 'future'
                            ? 'grid-cols-[minmax(140px,1fr)_minmax(3rem,auto)_minmax(4rem,auto)_minmax(3.5rem,auto)_minmax(3.5rem,auto)_minmax(3rem,auto)] min-w-[600px]'
                            : 'grid-cols-[minmax(140px,1fr)_minmax(3rem,auto)_minmax(4rem,auto)_minmax(3.5rem,auto)_minmax(3rem,auto)] min-w-[520px]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-0.5 shrink-0 bg-foreground self-stretch min-h-8" />
                          <AssetIcon symbol={trade.symbol.split('/')[0]?.split(':')[0] || trade.symbol.split('/')[0] || trade.symbol} size={20} className="shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs">{trade.symbol}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-muted text-foreground">
                                {marketType === 'future' ? (trade.side === 'buy' ? 'LONG' : 'SHORT') : (trade.side === 'buy' ? 'COMPRA' : 'VENDA')}
                              </span>
                              {showFutureBadge && trade.marketType === 'future' && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  FUTUROS
                                </span>
                              )}
                              {trade.isDelisted && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground"
                                  title="Par deslistado da exchange"
                                >
                                  DESLISTADO
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(trade.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              {trade.exchange && ` · ${trade.exchange}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs min-w-[3rem] max-w-[4rem] overflow-hidden text-ellipsis tabular-nums" title={formatQuantityCompact(trade.amount).full}>
                          {formatQuantityCompact(trade.amount).display}
                        </div>
                        <div className="text-right text-xs min-w-[4.5rem] max-w-[6rem] overflow-hidden text-ellipsis text-muted-foreground tabular-nums" title={formatPriceCompact(trade.price, formatPrice).full}>
                          {formatPriceCompact(trade.price, formatPrice).display}
                        </div>
                        <div className="text-right text-xs font-medium min-w-[4rem]">
                          {formatValue(trade.cost)}
                        </div>
                        {marketType === 'future' && (
                          <div className="text-right text-xs min-w-[3.5rem]">
                            {trade.pnl != null ? (
                              <span className={trade.pnl >= 0 ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                                {trade.pnl >= 0 ? '+' : ''}{formatValue(trade.pnl)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
                        <div className="text-right text-xs min-w-[3.5rem] text-muted-foreground">
                          {trade.fee > 0 ? formatValue(feeToUsd(trade, priceMap)) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          {totalPages > 1 && (
            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground shrink-0">
                  {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, totalTrades)} de {totalTrades}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" disabled={page <= 1} onClick={() => setPage(1)} aria-label="Primeira página">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Página anterior">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </Button>
                  {getPageNumbers().map((p, i) =>
                    p === 'dots' ? (
                      <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                    ) : (
                      <Button key={p} variant={page === p ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    ),
                  )}
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="Próxima página">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Última página">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                  </Button>
                </div>
              </div>
            </FadeIn>
          )}
          </div>
          <div className={`flex flex-wrap gap-3 lg:flex-col lg:flex-nowrap lg:gap-3 lg:items-stretch ${groupedTrades.length > 0 ? 'lg:pt-6' : ''}`}>
            <div className="border border-border bg-card px-4 py-3 min-w-[140px] lg:min-w-0 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total</p>
              <p className="text-lg font-medium mt-0.5 font-display break-words">{allTradesData?.total || 0}</p>
              <p className="text-[10px] text-muted-foreground">
                {marketType === 'future' ? `${buyCount}L · ${sellCount}S` : `${buyCount}C · ${sellCount}V`}
              </p>
            </div>
            <div className="border border-border bg-card px-4 py-3 min-w-[140px] lg:min-w-0 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">P&L Realizado</p>
              <p className={`text-lg font-medium mt-0.5 font-display break-words ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatValue(totalPnl)}
              </p>
            </div>
            <div className="border border-border bg-card px-4 py-3 min-w-[140px] lg:min-w-0 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Volume</p>
              <p className="text-lg font-medium mt-0.5 font-display break-words">{formatValue(totalVolume)}</p>
            </div>
            <div className="border border-border bg-card px-4 py-3 min-w-[140px] lg:min-w-0 shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Fees</p>
              <p className="text-lg font-medium mt-0.5 font-display break-words">{formatValue(totalFees)}</p>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
