'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { usePortfolio } from '@/hooks/use-portfolio';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/animations';
import { AssetIcon } from '@/components/AssetIcon';
import type { AggregatedAsset } from '@/lib/types';

type ByExchange = Array<{
  exchange: string;
  totalUsd: number;
  assets: Array<{ asset: string; amount: number; usdValue: number }>;
}>;

function buildSpotByExchange(balances: AggregatedAsset[]): ByExchange {
  const map = new Map<string, { totalUsd: number; assets: Array<{ asset: string; amount: number; usdValue: number }> }>();
  for (const b of balances) {
    for (const ex of b.exchangeBreakdown) {
      const key = ex.exchange || 'Outra';
      if (!map.has(key)) map.set(key, { totalUsd: 0, assets: [] });
      const entry = map.get(key)!;
      entry.totalUsd += ex.usdValue;
      entry.assets.push({ asset: b.asset, amount: ex.amount, usdValue: ex.usdValue });
    }
  }
  return Array.from(map.entries())
    .map(([exchange, { totalUsd, assets }]) => ({ exchange, totalUsd, assets: assets.sort((a, b) => b.usdValue - a.usdValue) }))
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

export default function SpotPage() {
  const { isPending } = useSession();
  const { formatValue } = useCurrency();
  const { data: portfolio, isLoading } = usePortfolio({ perPage: 100 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const byExchangeRaw = useMemo(() => (portfolio?.balances ? buildSpotByExchange(portfolio.balances) : []), [portfolio?.balances]);

  const byExchange = useMemo(() => {
    if (exchangeFilter !== 'all') {
      const filtered = byExchangeRaw.filter((e) => e.exchange.toLowerCase() === exchangeFilter.toLowerCase());
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        return filtered.map((e) => ({
          ...e,
          assets: e.assets.filter((a) => a.asset.toLowerCase().includes(q)),
        })).filter((e) => e.assets.length > 0);
      }
      return filtered;
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      return byExchangeRaw.map((e) => ({
        ...e,
        assets: e.assets.filter((a) => a.asset.toLowerCase().includes(q)),
      })).filter((e) => e.assets.length > 0);
    }
    return byExchangeRaw;
  }, [byExchangeRaw, exchangeFilter, debouncedSearch]);

  const exchangeOptions = useMemo(() => byExchangeRaw.map((e) => e.exchange), [byExchangeRaw]);

  if (isPending || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Saldos Spot</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Posições atuais por integração (contas spot). Para histórico de compras e vendas, usa Trades.
        </p>
      </div>

      {byExchangeRaw.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filtrar por ativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 text-sm border-border"
          />
          <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-sm border-border">
              <SelectValue placeholder="Exchange" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {exchangeOptions.map((ex) => (
                <SelectItem key={ex} value={ex} className="capitalize">{ex}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {byExchange.length === 0 ? (
        <FadeIn>
          <div className="border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm">Sem saldos spot.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {byExchangeRaw.length === 0
                ? 'Adiciona integrações e sincroniza para ver saldos por exchange.'
                : 'Nenhum resultado com os filtros atuais.'}
            </p>
          </div>
        </FadeIn>
      ) : (
        <FadeIn className="space-y-4">
          {byExchange.map(({ exchange, totalUsd, assets }) => (
            <div key={exchange} className="border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{exchange}</span>
                <span className="text-sm font-semibold font-display">{formatValue(totalUsd)}</span>
              </div>
              <ul className="divide-y divide-border">
                {assets.map(({ asset, amount, usdValue }) => (
                  <li key={`${exchange}-${asset}`} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <AssetIcon symbol={asset} size={20} />
                      {asset}
                    </span>
                    <div className="text-right">
                      <span className="text-muted-foreground">{amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                      <span className="ml-2 font-medium">{formatValue(usdValue)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </FadeIn>
      )}
    </div>
  );
}
