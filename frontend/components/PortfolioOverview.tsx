'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Layers
} from 'lucide-react';
import type { PortfolioSummary } from '@/lib/types';
import { AssetIcon } from '@/components/AssetIcon';

export function PortfolioOverview() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      } else if (response.status === 401) {
        // User not authenticated, show empty state
        setPortfolio(null);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const formatted = Math.abs(value).toFixed(2);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolio || portfolio.balances.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No portfolio data</h3>
          <p className="text-muted-foreground text-sm text-center mb-6 max-w-sm">
            Adiciona uma conta de exchange para veres os teus dados aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das tuas posições
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolio.totalUsdValue)}
            </div>
          </CardContent>
        </Card>

        {/* 24h Change */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              24h Change
            </CardTitle>
            {portfolio.totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              portfolio.totalPnl >= 0 ? 'text-foreground' : 'text-red-500'
            }`}>
              {formatCurrency(portfolio.totalPnl)}
            </div>
            <p className={`text-sm ${
              portfolio.totalPnl >= 0 ? 'text-foreground' : 'text-red-500'
            }`}>
              {formatPercent(portfolio.totalPnlPercent)}
            </p>
          </CardContent>
        </Card>

        {/* Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assets
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.balances.length}</div>
            <p className="text-sm text-muted-foreground">
              across {portfolio.exchanges.length} exchange{portfolio.exchanges.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exchange distribution */}
      {portfolio.exchanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio.exchanges.map((exchange) => (
              <div key={exchange.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{exchange.name}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(exchange.value)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {exchange.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-foreground transition-all duration-500"
                    style={{ width: `${exchange.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {portfolio.balances
                .sort((a, b) => b.totalValue - a.totalValue)
                .map((balance, idx) => (
                  <div
                    key={`${balance.asset}-${idx}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={balance.asset} size={40} />
                      <div>
                        <p className="font-medium">{balance.asset}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {balance.exchanges?.join(', ') ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(balance.totalValue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {balance.totalAmount.toLocaleString(undefined, { 
                          maximumFractionDigits: 8 
                        })} {balance.asset}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
