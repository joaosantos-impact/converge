'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  CircleDollarSign,
  BarChart3
} from 'lucide-react';
import type { TradeData, TradingStats } from '@/lib/types';

interface TradingData {
  trades: TradeData[];
  stats: TradingStats;
}

export function TradingAnalytics() {
  const [data, setData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchTrades();
  }, [days]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trades?days=${days}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.trades.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No trading data</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Trading analytics will appear here once you have trade history synced.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { trades, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Trading performance and history
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}D
            </Button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            {stats.winRate >= 50 ? (
              <TrendingUp className="h-4 w-4 text-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-foreground' : 'text-red-500'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fees
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(stats.totalFees)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trade Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Profitable Trades</span>
              <span className="font-semibold text-foreground">{stats.profitableTrades}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Losing Trades</span>
              <span className="font-semibold text-red-500">{stats.losingTrades}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Best Trade</span>
              <span className="font-semibold text-foreground">{formatCurrency(stats.bestTrade)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Worst Trade</span>
              <span className="font-semibold text-red-500">{formatCurrency(stats.worstTrade)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="font-medium">Average Profit</span>
              <span className={`font-bold ${stats.averageProfit >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                {formatCurrency(stats.averageProfit)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Win/Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex items-center justify-center py-8">
              <svg viewBox="0 0 100 100" className="w-32 h-32">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className="stroke-foreground"
                  strokeWidth="8"
                  strokeDasharray={`${(stats.winRate / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold">{stats.winRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent trades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Exchange</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.slice(0, 20).map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(trade.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(trade.price)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {trade.amount.toFixed(6)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(trade.cost)}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {trade.exchange}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
