'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/app/providers';
import { FadeIn } from '@/components/animations';
import { PremiumChart } from '@/components/PremiumChart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ASSETS = [
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'SOL', name: 'Solana' },
  { id: 'BNB', name: 'BNB' },
  { id: 'XRP', name: 'XRP' },
  { id: 'ADA', name: 'Cardano' },
  { id: 'AVAX', name: 'Avalanche' },
  { id: 'DOGE', name: 'Dogecoin' },
  { id: 'DOT', name: 'Polkadot' },
  { id: 'MATIC', name: 'Polygon' },
  { id: 'LINK', name: 'Chainlink' },
  { id: 'UNI', name: 'Uniswap' },
];

type Period = '7d' | '30d' | '90d' | '1y';
const PERIODS: Record<Period, { days: number; interval: string; label: string }> = {
  '7d': { days: 7, interval: '1h', label: '7 dias' },
  '30d': { days: 30, interval: '4h', label: '30 dias' },
  '90d': { days: 90, interval: '1d', label: '90 dias' },
  '1y': { days: 365, interval: '1d', label: '1 ano' },
};

/**
 * Dual-line comparison chart for overlaying two normalized datasets
 */
function ComparisonChart({
  dataA,
  dataB,
  labelA,
  labelB,
  period,
}: {
  dataA: Array<{ timestamp: string; value: number }>;
  dataB: Array<{ timestamp: string; value: number }>;
  labelA: string;
  labelB: string;
  period: string;
}) {
  const merged = useMemo(() => {
    const len = Math.min(dataA.length, dataB.length);
    if (len === 0) return [];
    return Array.from({ length: len }, (_, i) => ({
      timestamp: dataA[i].timestamp,
      date: new Date(dataA[i].timestamp).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        ...(period === '1y' ? { year: '2-digit' as const } : {}),
      }),
      a: dataA[i].value,
      b: dataB[i]?.value ?? 0,
    }));
  }, [dataA, dataB, period]);

  const gradientIdA = 'cmp-grad-a';
  const gradientIdB = 'cmp-grad-b';

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { date: string; a: number; b: number }; value: number }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload!;
      return (
        <div className="bg-card border border-border px-4 py-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1.5">{d.date}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-foreground" />
              <span className="text-sm font-semibold font-display">{d.a >= 0 ? '+' : ''}{d.a.toFixed(1)}%</span>
              <span className="text-[10px] text-muted-foreground">{labelA}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-foreground/40" />
              <span className="text-sm font-semibold font-display">{d.b >= 0 ? '+' : ''}{d.b.toFixed(1)}%</span>
              <span className="text-[10px] text-muted-foreground">{labelB}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (merged.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        Sem dados para este período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={merged} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientIdA} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradientIdB} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.08} />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: 'currentColor', opacity: 0.45, fontSize: 12, fontFamily: 'var(--font-display)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={60}
          dy={8}
        />
        <YAxis
          tick={{ fill: 'currentColor', opacity: 0.45, fontSize: 12, fontFamily: 'var(--font-display)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
          width={60}
          dx={-4}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="a"
          stroke="hsl(var(--foreground))"
          strokeWidth={2.5}
          fill={`url(#${gradientIdA})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: 'hsl(var(--foreground))' }}
          animationDuration={800}
          animationEasing="ease-out"
          name={labelA}
        />
        <Area
          type="monotone"
          dataKey="b"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeDasharray="6 3"
          strokeOpacity={0.45}
          fill={`url(#${gradientIdB})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: 'hsl(var(--foreground))' }}
          animationDuration={800}
          animationEasing="ease-out"
          name={labelB}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PriceData {
  timestamp: string;
  close: number;
}

export default function ComparePage() {
  const { formatValue } = useCurrency();
  const [assetA, setAssetA] = useState('BTC');
  const [assetB, setAssetB] = useState('ETH');
  const [period, setPeriod] = useState<Period>('90d');
  const [dataA, setDataA] = useState<PriceData[]>([]);
  const [dataB, setDataB] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request to prevent race conditions
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchData = async () => {
      setLoading(true);
      const config = PERIODS[period];
      try {
        const [resA, resB] = await Promise.all([
          fetch(`/api/prices/history?symbol=${assetA}&interval=${config.interval}&days=${config.days}`, { signal: controller.signal }),
          fetch(`/api/prices/history?symbol=${assetB}&interval=${config.interval}&days=${config.days}`, { signal: controller.signal }),
        ]);
        if (resA.ok) setDataA(await resA.json());
        if (resB.ok) setDataB(await resB.json());
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        toast.error('Erro ao carregar dados de comparação');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [assetA, assetB, period]);

  // Normalize both datasets to percentage change from start
  const normalizedA = useMemo(() => {
    if (!dataA.length) return [];
    const base = dataA[0].close;
    return dataA.map(d => ({ timestamp: d.timestamp, value: ((d.close - base) / base) * 100 }));
  }, [dataA]);

  const normalizedB = useMemo(() => {
    if (!dataB.length) return [];
    const base = dataB[0].close;
    return dataB.map(d => ({ timestamp: d.timestamp, value: ((d.close - base) / base) * 100 }));
  }, [dataB]);

  const changeA = dataA.length >= 2 ? ((dataA[dataA.length - 1].close - dataA[0].close) / dataA[0].close) * 100 : 0;
  const changeB = dataB.length >= 2 ? ((dataB[dataB.length - 1].close - dataB[0].close) / dataB[0].close) * 100 : 0;
  const priceA = dataA.length > 0 ? dataA[dataA.length - 1].close : 0;
  const priceB = dataB.length > 0 ? dataB[dataB.length - 1].close : 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-xl font-medium tracking-tight">Comparador</h1>
          <p className="text-sm text-muted-foreground">Compara a performance de dois assets lado a lado</p>
        </div>
      </FadeIn>

      {/* Controls */}
      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={assetA} onValueChange={setAssetA}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSETS.map(a => (
                <SelectItem key={a.id} value={a.id} disabled={a.id === assetB}>{a.id} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground font-medium">vs</span>

          <Select value={assetB} onValueChange={setAssetB}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSETS.map(a => (
                <SelectItem key={a.id} value={a.id} disabled={a.id === assetA}>{a.id} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 ml-auto">
            {(Object.keys(PERIODS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                aria-label={`Período ${PERIODS[p].label}`}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {PERIODS[p].label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center text-sm font-semibold font-display">
                {assetA}
              </div>
              <div>
                <p className="text-sm font-medium">{ASSETS.find(a => a.id === assetA)?.name}</p>
                <p className="text-lg font-semibold font-display">{formatValue(priceA)}</p>
              </div>
            </div>
            <p className={`text-2xl font-bold font-display ${changeA >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {changeA >= 0 ? '+' : ''}{changeA.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{PERIODS[period].label}</p>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center text-sm font-semibold font-display">
                {assetB}
              </div>
              <div>
                <p className="text-sm font-medium">{ASSETS.find(a => a.id === assetB)?.name}</p>
                <p className="text-lg font-semibold font-display">{formatValue(priceB)}</p>
              </div>
            </div>
            <p className={`text-2xl font-bold font-display ${changeB >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {changeB >= 0 ? '+' : ''}{changeB.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{PERIODS[period].label}</p>
          </div>
        </div>
      </FadeIn>

      {/* Charts */}
      <FadeIn delay={0.15}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <p className="text-xs font-medium">{assetA}</p>
              <span className="text-[10px] text-muted-foreground">Preço</span>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
                </div>
              ) : (
                <PremiumChart
                  data={dataA.map(d => ({ timestamp: d.timestamp, value: d.close }))}
                  height={220}
                  formatValue={formatValue}
                  timeRange={period}
                />
              )}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <p className="text-xs font-medium">{assetB}</p>
              <span className="text-[10px] text-muted-foreground">Preço</span>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
                </div>
              ) : (
                <PremiumChart
                  data={dataB.map(d => ({ timestamp: d.timestamp, value: d.close }))}
                  height={220}
                  formatValue={formatValue}
                  timeRange={period}
                />
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Performance comparison normalized chart */}
      <FadeIn delay={0.2}>
        <div className="border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-xs font-medium">Performance Comparada (%)</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-foreground rounded-full" />
                  {assetA}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full" />
                  {assetB}
                </div>
              </div>
            </div>
            <p className={`text-xs font-medium ${changeA > changeB ? 'text-foreground' : 'text-red-500'}`}>
              {assetA} {changeA > changeB ? 'lidera' : 'atrás'} por {Math.abs(changeA - changeB).toFixed(1)}pp
            </p>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
              </div>
            ) : (
              <ComparisonChart dataA={normalizedA} dataB={normalizedB} labelA={assetA} labelB={assetB} period={period} />
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
