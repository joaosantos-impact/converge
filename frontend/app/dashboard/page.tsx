'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { PerformanceChart } from '@/components/PerformanceChart';
import { Onboarding } from '@/components/Onboarding';
import { useLivePrices } from '@/lib/price-service';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useExchangeAccounts } from '@/hooks/use-exchange-accounts';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { syncing, triggerSync } = useAutoSync();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // React Query — fetch ALL assets for dashboard calculations (top/worst)
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio({ perPage: 200 });
  const { data: exchanges, isLoading: exchangesLoading } = useExchangeAccounts();
  const { data: chartData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['portfolio-history', timeRange],
    queryFn: async () => {
      const r = await fetch(`/api/portfolio/history?range=${timeRange}`);
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<Array<{ timestamp: string; value: number }>>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = portfolioLoading || exchangesLoading || chartLoading;

  const portfolioSymbols = useMemo(() => {
    return portfolio?.balances?.map(b => b.asset).filter(a => a !== 'USDT' && a !== 'USDC' && a !== 'BUSD') || [];
  }, [portfolio]);
  const { prices: livePrices, connected: wsConnected } = useLivePrices(portfolioSymbols);

  // Sort assets by 24h change (backend already aggregates)
  const { topAssets, worstAssets } = useMemo(() => {
    if (!portfolio?.balances) return { topAssets: [], worstAssets: [] };

    const withChange = portfolio.balances.map(b => {
      const live = livePrices.get(b.asset);
      return { ...b, usdValue: b.totalValue, change24h: live?.changePercent24h ?? 0 };
    });
    const sorted = [...withChange].sort((a, b) => b.change24h - a.change24h);
    return {
      topAssets: sorted.filter(a => a.change24h >= 0).slice(0, 5),
      worstAssets: sorted.filter(a => a.change24h < 0).slice(-5).reverse(),
    };
  }, [portfolio, livePrices]);

  // Show onboarding if no exchanges and not dismissed
  useEffect(() => {
    if (exchanges && exchanges.length === 0 && !localStorage.getItem('onboarding-dismissed')) {
      setShowOnboarding(true);
    }
  }, [exchanges]);

  const handleSync = async () => {
    const ok = await triggerSync();
    if (ok) {
      toast.success('Sincronizado');
      queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
    } else {
      toast.error('Erro ou aguarda antes de sincronizar novamente');
    }
  };
  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding-dismissed', 'true');
    setShowOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ['exchange-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
  };

  const change24h = portfolio?.change24h || 0;
  const changePercent = portfolio?.totalValue && portfolio.totalValue > 0
    ? (change24h / portfolio.totalValue) * 100
    : 0;

  if (showOnboarding) return <Onboarding userName={session?.user?.name || session?.user?.email?.split('@')[0]} onComplete={handleOnboardingComplete} />;

  if (isPending || loading || (syncing && !portfolio?.balances?.length)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="h-[460px] flex flex-col items-center justify-center gap-4 border border-border bg-card">
          <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
          <p className="text-sm font-medium">{syncing ? 'Sincronizando...' : 'A carregar'}</p>
          {syncing && <p className="text-xs text-muted-foreground">A primeira sync pode demorar mais</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Syncing overlay when we have data */}
      {syncing && portfolio?.balances?.length ? (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-3 px-6 py-4 bg-card border border-border">
            <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
            <p className="text-sm font-medium">Sincronizando...</p>
            <p className="text-xs text-muted-foreground">A atualizar dados das exchanges</p>
          </div>
        </div>
      ) : null}
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium tracking-tight">Dashboard</h1>
            {wsConnected && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-foreground animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>
          <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="h-8 text-xs">
            {syncing ? <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : 'Sincronizar'}
          </Button>
        </div>
      </FadeIn>

      {/* Chart card — stats merged into header */}
      <FadeIn delay={0.05}>
        <div className="border border-border bg-card">
          {/* Stats + Time selector in one header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-2xl font-medium tracking-tight font-display">{formatValue(portfolio?.totalValue || 0)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-sm ${change24h >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {change24h >= 0 ? '+' : ''}{formatValue(change24h)}
                  </span>
                  <span className={`text-xs ${change24h >= 0 ? 'text-muted-foreground' : 'text-red-500'}`}>
                    ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                  </span>
                  <span className="text-[10px] text-muted-foreground">24h</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-5 pl-8 border-l border-border">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Assets</p>
                  <p className="text-sm font-medium">{portfolio?.pagination?.total || portfolio?.balances?.length || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Integrações</p>
                  <p className="text-sm font-medium">{exchanges?.length || 0}</p>
                </div>
              </div>
            </div>
            {/* Time range — larger */}
            <div className="flex gap-1">
              {(['24h', '7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  aria-pressed={timeRange === range}
                  aria-label={`Período ${range === 'all' ? 'máximo' : range}`}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === range 
                      ? 'bg-foreground text-background' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range === 'all' ? 'Max' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Chart or empty state */}
          <div className="px-2 pb-2">
            {chartData.length > 0 ? (
              <PerformanceChart data={chartData} timeRange={timeRange} height={380} />
            ) : (
              <div className="h-[380px] flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 bg-muted flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <p className="text-sm font-medium mb-1">Sem dados de performance</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Adiciona a tua primeira integração e sincroniza para ver a evolução do teu portfolio.
                </p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => router.push('/dashboard/integrations')}>
                  Adicionar integração
                </Button>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Bottom: Top Assets + Worst Assets */}
      <FadeIn delay={0.1}>
        <div className="grid gap-3 md:grid-cols-2">
          {/* Top Assets (gainers) */}
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-medium">Top Assets</p>
              <Link href="/dashboard/portfolio" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Ver tudo
              </Link>
            </div>
            <div className="p-2">
              {topAssets.length > 0 ? (
                topAssets.map((b) => (
                  <div
                    key={b.asset}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver ${b.asset}`}
                    onClick={() => router.push(`/dashboard/portfolio/${b.asset.toLowerCase()}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/portfolio/${b.asset.toLowerCase()}`); } }}
                  >
                    <div className="w-7 h-7 bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                      {b.asset.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{b.asset}</span>
                    </div>
                    <span className="text-xs font-medium">{formatValue(b.usdValue)}</span>
                    <span className="text-[10px] text-foreground/70 w-12 text-right">
                      +{b.change24h.toFixed(1)}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 bg-muted flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Sem dados de preço</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Sincroniza para ver os top performers</p>
                </div>
              )}
            </div>
          </div>

          {/* Worst Assets (losers) */}
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-medium">Piores Assets</p>
              <Link href="/dashboard/portfolio" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Ver tudo
              </Link>
            </div>
            <div className="p-2">
              {worstAssets.length > 0 ? (
                worstAssets.map((b) => (
                  <div
                    key={b.asset}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver ${b.asset}`}
                    onClick={() => router.push(`/dashboard/portfolio/${b.asset.toLowerCase()}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/portfolio/${b.asset.toLowerCase()}`); } }}
                  >
                    <div className="w-7 h-7 bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                      {b.asset.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{b.asset}</span>
                    </div>
                    <span className="text-xs font-medium">{formatValue(b.usdValue)}</span>
                    <span className="text-[10px] text-red-500 w-12 text-right">
                      {b.change24h.toFixed(1)}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 bg-muted flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Sem perdas registadas</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Bom sinal!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
