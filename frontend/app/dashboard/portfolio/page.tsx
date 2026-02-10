'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { useExchangeAccounts } from '@/hooks/use-exchange-accounts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetIcon } from '@/components/AssetIcon';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';
import { D3PieChart, D3BarChart } from '@/components/charts';
import { Onboarding } from '@/components/Onboarding';
import { List, PieChart } from 'lucide-react';

const PER_PAGE = 20;
const FIAT_ASSETS = new Set(['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'BRL', 'CNY', 'RUB', 'MXN', 'KRW', 'INR']);

function isFiat(asset: string): boolean {
  return FIAT_ASSETS.has(asset.toUpperCase());
}

const FIAT_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'Fr', JPY: '¥', CAD: 'C$', AUD: 'A$',
  BRL: 'R$', CNY: '¥', RUB: '₽', MXN: '$', KRW: '₩', INR: '₹',
};

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#00ffa3', BNB: '#f3ba2f',
  XRP: '#23292f', ADA: '#0033ad', AVAX: '#e84142', DOGE: '#c2a633',
  DOT: '#e6007a', MATIC: '#8247e5', LINK: '#2a5ada', UNI: '#ff007a',
};

function getAssetColor(asset: string, index: number): string {
  return ASSET_COLORS[asset] ?? ['#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ec4899'][index % 6];
}

function PortfolioAssetIcon({ asset, size = 32 }: { asset: string; size?: number }) {
  if (isFiat(asset)) {
    const symbol = FIAT_SYMBOLS[asset.toUpperCase()] ?? asset.slice(0, 1);
    return (
      <div
        className="flex items-center justify-center bg-muted text-foreground font-semibold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {symbol}
      </div>
    );
  }
  return <AssetIcon symbol={asset} size={size} />;
}

export default function PortfolioPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { formatValue, formatPrice } = useCurrency();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { syncing, canSync, triggerSync } = useAutoSync();
  const { data: accounts = [] } = useExchangeAccounts();
  const showSyncing = syncing && accounts.length > 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [assetFilter, setAssetFilter] = useState<'all' | 'crypto' | 'fiat'>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: portfolio, isLoading: portfolioLoading, isFetching } = usePortfolio({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
  });

  const { data: portfolioAll } = usePortfolio({ perPage: 200 });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const r = await fetch('/api/user');
      if (!r.ok) return null;
      return r.json() as Promise<{ onboardingCompleted?: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loading = portfolioLoading || sessionPending;
  const assets = useMemo(() => {
    const allBalances = portfolioAll?.balances ?? [];
    const rawAssets = portfolio?.balances ?? [];
    const source = assetFilter === 'all' ? rawAssets : allBalances;
    let result = assetFilter === 'all' ? source : source.filter((b) =>
      assetFilter === 'crypto' ? !isFiat(b.asset) : isFiat(b.asset)
    );
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((b) => b.asset.toLowerCase().includes(q));
    }
    return result;
  }, [portfolioAll?.balances, portfolio?.balances, assetFilter, debouncedSearch]);

  const pagination = useMemo(() => {
    if (assetFilter === 'all') {
      return portfolio?.pagination ?? { page: 1, perPage: PER_PAGE, total: 0, totalPages: 0 };
    }
    const total = assets.length;
    return {
      page: 1,
      perPage: total || PER_PAGE,
      total,
      totalPages: 1,
    };
  }, [portfolio?.pagination, assetFilter, assets.length]);

  const showOnboarding = !!(
    accounts &&
    accounts.length === 0 &&
    !currentUser?.onboardingCompleted &&
    !onboardingJustCompleted
  );

  const { allocationData, allocationTotal, barChartData } = useMemo(() => {
    let balances = (portfolioAll?.balances ?? [])
      .filter((b) => b.totalValue > 0 && !['USDT', 'USDC', 'BUSD'].includes(b.asset));
    if (assetFilter === 'crypto') balances = balances.filter((b) => !isFiat(b.asset));
    else if (assetFilter === 'fiat') balances = balances.filter((b) => isFiat(b.asset));
    const total = balances.reduce((s, b) => s + b.totalValue, 0) || 1;
    const sorted = [...balances].sort((a, b) => b.totalValue - a.totalValue);
    const allocationData = sorted.slice(0, 12).map((b, i) => ({
      label: b.asset,
      value: (b.totalValue / total) * 100,
      color: getAssetColor(b.asset, i),
    }));
    const barChartData = sorted.slice(0, 8).map((b, i) => ({
      label: b.asset,
      value: b.totalValue,
      color: getAssetColor(b.asset, i),
    }));
    return { allocationData, allocationTotal: total, barChartData };
  }, [portfolioAll, assetFilter]);

  const handleShare = async () => {
    if (!portfolio?.balances?.length) {
      toast.error('Adiciona pelo menos uma integração primeiro');
      return;
    }
    setSharing(true);
    try {
      const response = await fetch('/api/portfolio/share', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success('Link copiado!');
      } else {
        toast.error('Erro ao gerar link');
      }
    } catch {
      toast.error('Erro ao partilhar');
    } finally {
      setSharing(false);
    }
  };

  const handleSync = async () => {
    const { ok, error } = await triggerSync();
    if (ok) {
      toast.success('Sincronizado');
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } else {
      toast.error(error || 'Erro ao sincronizar');
    }
  };

  const handleOnboardingComplete = async () => {
    await fetch('/api/user/onboarding-completed', { method: 'PATCH' });
    setOnboardingJustCompleted(true);
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
  };

  useEffect(() => {
    if (sessionPending) return;
    if (!session) router.push('/sign-in');
  }, [session, sessionPending, router]);

  if (showOnboarding) {
    return (
      <Onboarding
        userName={session?.user?.name || session?.user?.email?.split('@')[0]}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (loading && !portfolio?.balances?.length) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  if (!portfolio?.balances?.length && !showSyncing) {
    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-medium tracking-tight">Portfolio</h1>
              <p className="text-sm text-muted-foreground">Todos os teus assets agregados</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleShare} variant="outline" size="sm" disabled aria-label="Partilhar portfolio">
                Partilhar
              </Button>
              <Button onClick={handleSync} disabled={syncing || !canSync} size="sm" aria-label="Sincronizar dados">
                {showSyncing ? <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background animate-spin" /> : 'Sincronizar'}
              </Button>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
            {showSyncing ? (
              <>
                <div className="w-10 h-10 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin mb-4" />
                <p className="text-sm font-medium mb-2">Sincronizando...</p>
                <p className="text-xs text-muted-foreground max-w-sm">A buscar saldos das tuas exchanges.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">Ainda não tens dados de portfolio</p>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                  Adiciona uma integração com as tuas exchanges para veres os teus assets.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/integrations/add">Adicionar integração</Link>
                </Button>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-medium tracking-tight">Portfolio</h1>
            <p className="text-sm text-muted-foreground">Todos os teus assets agregados</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-0.5 bg-muted rounded-none">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-none transition-colors ${
                  viewMode === 'list' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode('graph')}
                aria-pressed={viewMode === 'graph'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-none transition-colors ${
                  viewMode === 'graph' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PieChart className="h-3.5 w-3.5" />
                Gráfico
              </button>
            </div>
            <Button onClick={handleShare} variant="outline" size="sm" disabled={sharing} aria-label="Partilhar portfolio">
              {sharing ? <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : 'Partilhar'}
            </Button>
            <Button onClick={handleSync} disabled={syncing || !canSync} size="sm" aria-label="Sincronizar dados" title={!canSync ? 'Aguarda o cooldown antes de sincronizar' : undefined}>
              {showSyncing ? <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background animate-spin" /> : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4">
          {viewMode === 'list' && (
            <div className="relative w-full sm:max-w-sm flex-1 min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <Input placeholder="Procurar asset (ex: BTC, ETH...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          )}
          <div className="flex gap-1 p-0.5 bg-muted rounded-none">
            <button type="button" onClick={() => setAssetFilter('all')} aria-pressed={assetFilter === 'all'} className={`px-2.5 py-1.5 text-xs font-medium rounded-none transition-colors ${assetFilter === 'all' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Todos os assets</button>
            <button type="button" onClick={() => setAssetFilter('crypto')} aria-pressed={assetFilter === 'crypto'} className={`px-2.5 py-1.5 text-xs font-medium rounded-none transition-colors ${assetFilter === 'crypto' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Só cripto</button>
            <button type="button" onClick={() => setAssetFilter('fiat')} aria-pressed={assetFilter === 'fiat'} className={`px-2.5 py-1.5 text-xs font-medium rounded-none transition-colors ${assetFilter === 'fiat' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Só fiat</button>
          </div>
        </div>
      </FadeIn>

      {viewMode === 'graph' ? (
        <FadeIn delay={0.05}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico 1: Alocação (donut) */}
            <div className="border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-medium">Alocação atual</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Distribuição por valor · {formatValue(allocationTotal)} total
                    {assetFilter !== 'all' && ` (${assetFilter === 'crypto' ? 'criptoativos' : 'fiat'})`}
                  </p>
                </div>
                <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                  {allocationData.length > 0 ? (
                    <>
                      <div className="flex-shrink-0">
                        <D3PieChart
                          data={allocationData}
                          width={220}
                          height={220}
                          innerRadius={50}
                          formatValue={(v) => `${v.toFixed(1)}%`}
                        />
                      </div>
                      <div className="flex-1 w-full space-y-1.5 min-w-0">
                        {allocationData.slice(0, 8).map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {isFiat(item.label) ? (
                                <PortfolioAssetIcon asset={item.label} size={18} />
                              ) : (
                                <span
                                  className="w-2.5 h-2.5 shrink-0 rounded-none"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden
                                />
                              )}
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            </div>
                            <span className="text-sm font-medium shrink-0">{item.value.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground text-sm w-full">
                      Sem dados de alocação
                    </div>
                  )}
                </div>
              </div>

            {/* Gráfico 2: Valores por asset (barras horizontais) */}
            <div className="border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-medium">Top assets por valor</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Maiores posições em {formatValue(allocationTotal)}
                  </p>
                </div>
                <div className="p-6">
                  {barChartData.length > 0 ? (
                    <div className="min-h-[240px]">
                      <D3BarChart
                        data={barChartData}
                        height={240}
                        horizontal
                        showMax={false}
                        formatValue={(v) => formatValue(v)}
                        wide
                      />
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      Sem dados
                    </div>
                  )}
                </div>
              </div>
          </div>
        </FadeIn>
      ) : (
        <>
          {assets.length === 0 && !isFetching ? (
            <div className="p-12 border border-border bg-card text-center">
              <p className="text-sm font-medium mb-1">Sem assets encontrados</p>
              {debouncedSearch ? (
                <button onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2">
                  Limpar pesquisa
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">Adiciona uma integração para começar.</p>
              )}
            </div>
          ) : (
            <div className={`border border-border bg-card overflow-x-auto transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 sticky left-0 bg-card z-10">Asset</TableHead>
                    <TableHead className="hidden sm:table-cell">Exchanges</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Quantidade</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Preço</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Alocação</TableHead>
                    <TableHead className="text-right pr-4">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow
                      key={asset.asset}
                      className="cursor-pointer group hover:bg-transparent"
                      tabIndex={0}
                      role="link"
                      aria-label={`Ver detalhes de ${asset.asset}`}
                      onClick={() => router.push(`/dashboard/portfolio/${asset.asset.toLowerCase()}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/portfolio/${asset.asset.toLowerCase()}`); } }}
                    >
                      <TableCell className="pl-4 sticky left-0 bg-card group-hover:bg-muted/50 z-10 transition-colors">
                        <div className="flex items-center gap-3">
                          <PortfolioAssetIcon asset={asset.asset} size={32} />
                          <span className="font-medium text-sm group-hover:underline">{asset.asset}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell group-hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-1">
                          {asset.exchanges.slice(0, 3).map((ex) => (
                            <span key={ex} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground capitalize">{ex}</span>
                          ))}
                          {asset.exchanges.length > 3 && <span className="text-[10px] text-muted-foreground">+{asset.exchanges.length - 3}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell group-hover:bg-muted/50 transition-colors">
                        {asset.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell group-hover:bg-muted/50 transition-colors">{formatPrice(asset.price)}</TableCell>
                      <TableCell className="text-right hidden lg:table-cell group-hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1 bg-muted">
                            <div className="h-full bg-foreground/30" style={{ width: `${Math.min(asset.percentOfPortfolio, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{asset.percentOfPortfolio.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4 group-hover:bg-muted/50 transition-colors">
                        <span className="font-medium text-sm">{formatValue(asset.totalValue)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)} de {pagination.total} assets
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={pagination.page === 1} className="p-1.5 hover:bg-muted disabled:opacity-30" aria-label="Primeira página">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
                    </button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page === 1} className="p-1.5 hover:bg-muted disabled:opacity-30" aria-label="Página anterior">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <span className="text-xs font-medium px-2 min-w-[60px] text-center">{pagination.page} / {pagination.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages} className="p-1.5 hover:bg-muted disabled:opacity-30" aria-label="Próxima página">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                    <button onClick={() => setPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} className="p-1.5 hover:bg-muted disabled:opacity-30" aria-label="Última página">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
