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
import { AssetIcon } from '@/components/AssetIcon';
import { useTrades } from '@/hooks/use-trades';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const PER_PAGE = 20;

export default function PortfolioPage() {
  const { isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const { syncing, triggerSync } = useAutoSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side pagination + search
  const { data: portfolio, isLoading: portfolioLoading, isFetching } = usePortfolio({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
  });
  const { data: tradesData, isLoading: tradesLoading } = useTrades(90);
  const recentTrades = useMemo(() => tradesData?.trades || [], [tradesData]);
  const loading = portfolioLoading || tradesLoading;

  const [sharing, setSharing] = useState(false);

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
    const ok = await triggerSync();
    if (ok) toast.success('Sincronizado');
    else toast.error('Erro ou aguarda antes de sincronizar novamente');
  };

  // Assets and pagination come from the backend
  const assets = portfolio?.balances ?? [];
  const pagination = portfolio?.pagination ?? { page: 1, perPage: PER_PAGE, total: 0, totalPages: 0 };

  // Scatter data for recent trade activity
  const tradeScatter = useMemo(() => {
    const buys = recentTrades.filter(t => t.side === 'buy').map(t => ({
      timestamp: new Date(t.timestamp).getTime(),
      cost: t.cost,
      symbol: t.symbol,
      price: t.price,
      amount: t.amount,
    }));
    const sells = recentTrades.filter(t => t.side === 'sell').map(t => ({
      timestamp: new Date(t.timestamp).getTime(),
      cost: t.cost,
      symbol: t.symbol,
      price: t.price,
      amount: t.amount,
    }));
    return { buys, sells };
  }, [recentTrades]);

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  // Dedicated empty state when there are no balances and no recent trades
  if (!portfolio?.balances?.length && recentTrades.length === 0) {
    return (
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium tracking-tight">Portfolio</h1>
              <p className="text-sm text-muted-foreground">Todos os teus assets agregados</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleShare} variant="outline" size="sm" disabled aria-label="Partilhar portfolio">
                Partilhar
              </Button>
              <Button onClick={handleSync} disabled={syncing} size="sm" aria-label="Sincronizar dados">
                {syncing ? <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background animate-spin" /> : 'Sincronizar'}
              </Button>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
            {syncing ? (
              <>
                <div className="w-10 h-10 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin mb-4" />
                <p className="text-sm font-medium mb-2">Sincronizando...</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  A buscar saldos e trades das tuas exchanges. A primeira sync pode demorar mais.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">Ainda não tens dados de portfolio</p>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                  Adiciona uma integração com as tuas exchanges para veres os teus assets, atividade e performance aqui.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/integrations/add">
                    Adicionar integração
                  </Link>
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
          <div>
            <h1 className="text-xl font-medium tracking-tight">Portfolio</h1>
            <p className="text-sm text-muted-foreground">Todos os teus assets agregados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleShare} variant="outline" size="sm" disabled={sharing} aria-label="Partilhar portfolio">
              {sharing ? <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : 'Partilhar'}
            </Button>
            <Button onClick={handleSync} disabled={syncing} size="sm" aria-label="Sincronizar dados">
              {syncing ? <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background animate-spin" /> : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Trade activity scatter */}
      <FadeIn delay={0.05}>
      {recentTrades.length > 0 ? (
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium">Atividade (90d)</p>
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Compras
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Vendas
                </div>
              </div>
            </div>
            <Link href="/dashboard/history" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Ver trades
            </Link>
          </div>
          <div className="h-36 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  type="number"
                  dataKey="timestamp"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.3 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => new Date(v).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                  interval="preserveStartEnd"
                />
                <YAxis
                  type="number"
                  dataKey="cost"
                  tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.3 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}
                  width={45}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 11, padding: '6px 10px' }}
                  formatter={(_: unknown, __: unknown, props: { payload?: Record<string, unknown> }) => {
                    const d = props.payload;
                    if (!d) return ['', ''];
                    return [`${d.symbol} · ${Number(d.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} @ $${Number(d.price).toFixed(2)}`, ''];
                  }}
                  labelFormatter={(v) => new Date(Number(v)).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                />
                <Scatter data={tradeScatter.buys} fill="#10b981">
                  {tradeScatter.buys.map((_, i) => <Cell key={`b-${i}`} fill="#10b981" />)}
                </Scatter>
                <Scatter data={tradeScatter.sells} fill="#ef4444">
                  {tradeScatter.sells.map((_, i) => <Cell key={`s-${i}`} fill="#ef4444" />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium mb-1">Sem atividade recente</p>
          <p className="text-xs text-muted-foreground">As tuas compras e vendas dos últimos 90 dias aparecerão aqui.</p>
        </div>
      )}
      </FadeIn>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <Input
          placeholder="Procurar asset..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Assets Table */}
      {assets.length === 0 && !isFetching ? (
        <div className="p-12 border border-border bg-card text-center">
          <p className="text-sm font-medium mb-1">Sem assets encontrados</p>
          {debouncedSearch ? (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
            >
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
                  className="cursor-pointer group"
                  tabIndex={0}
                  role="link"
                  aria-label={`Ver detalhes de ${asset.asset}`}
                  onClick={() => router.push(`/dashboard/portfolio/${asset.asset.toLowerCase()}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/portfolio/${asset.asset.toLowerCase()}`); } }}
                >
                  <TableCell className="pl-4 sticky left-0 bg-card group-hover:bg-muted/50 z-10 transition-colors">
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={asset.asset} size={32} />
                      <span className="font-medium text-sm group-hover:underline">{asset.asset}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      {asset.exchanges.slice(0, 3).map((ex) => (
                        <span key={ex} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground capitalize">
                          {ex}
                        </span>
                      ))}
                      {asset.exchanges.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{asset.exchanges.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                    {asset.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                    {formatValue(asset.price)}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1 bg-muted">
                        <div className="h-full bg-foreground/30" style={{ width: `${Math.min(asset.percentOfPortfolio, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {asset.percentOfPortfolio.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <span className="font-medium text-sm">{formatValue(asset.totalValue)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)} de {pagination.total} assets
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Primeira página"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="p-1.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-xs font-medium px-2 min-w-[60px] text-center">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Próxima página"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Última página"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
