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
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useCurrency } from '@/app/providers';
import { AssetIcon } from '@/components/AssetIcon';
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

const COMPARE_COLOR_A = '#8b5cf6'; // violet-500 (primeiro ativo, esquerda)
const COMPARE_COLOR_B = '#f97316'; // orange-500 (segundo ativo, direita)

type CompareMode = 'percent' | 'price';

/** Declared outside render for react-hooks/static-components */
function CompareChartTooltip({
  active,
  payload,
  labelA,
  labelB,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { date: string; a: number; b: number }; value: number }>;
  labelA: string;
  labelB: string;
  mode: CompareMode;
}) {
  if (active && payload && payload.length) {
    const d = payload[0].payload!;
    return (
      <div className="bg-card border border-border px-4 py-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1.5">{d.date}</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPARE_COLOR_A }} />
            <span className="text-sm font-semibold font-display">
              {mode === 'percent' ? `${d.a >= 0 ? '+' : ''}${d.a.toFixed(1)}%` : `Índice ${d.a.toFixed(1)}`}
            </span>
            <span className="text-[10px] text-muted-foreground">{labelA}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPARE_COLOR_B }} />
            <span className="text-sm font-semibold font-display">
              {mode === 'percent' ? `${d.b >= 0 ? '+' : ''}${d.b.toFixed(1)}%` : `Índice ${d.b.toFixed(1)}`}
            </span>
            <span className="text-[10px] text-muted-foreground">{labelB}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

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

type Period = '7d' | '30d' | '90d' | '1y' | '2y' | '4y' | 'all';
const PERIODS: Record<Period, { days: number; interval: string; label: string }> = {
  '7d': { days: 7, interval: '1h', label: '7 dias' },
  '30d': { days: 30, interval: '4h', label: '30 dias' },
  '90d': { days: 90, interval: '1d', label: '90 dias' },
  '1y': { days: 365, interval: '1d', label: '1 ano' },
  '2y': { days: 730, interval: '1d', label: '2 anos' },
  '4y': { days: 1460, interval: '1d', label: '4 anos' },
  'all': { days: 2555, interval: '1d', label: 'Desde sempre' },
};

/**
 * Dual-line comparison chart for overlaying two normalized datasets.
 * mode 'percent': % change from start (can go negative). mode 'price': index 100 at start (both series same scale).
 */
function ComparisonChart({
  dataA,
  dataB,
  labelA,
  labelB,
  period,
  mode,
}: {
  dataA: Array<{ timestamp: string; value: number }>;
  dataB: Array<{ timestamp: string; value: number }>;
  labelA: string;
  labelB: string;
  period: string;
  mode: CompareMode;
}) {
  const merged = useMemo(() => {
    const len = Math.min(dataA.length, dataB.length);
    if (len === 0) return [];
    return Array.from({ length: len }, (_, i) => ({
      timestamp: dataA[i].timestamp,
      date: new Date(dataA[i].timestamp).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        ...((period === '1y' || period === '2y' || period === '4y' || period === 'all') ? { year: '2-digit' as const } : {}),
      }),
      a: dataA[i].value,
      b: dataB[i]?.value ?? 0,
    }));
  }, [dataA, dataB, period]);

  const gradientIdA = 'cmp-grad-a';
  const gradientIdB = 'cmp-grad-b';

  const baseValue = useMemo(() => {
    if (merged.length === 0) return 0;
    let min = merged[0].a;
    for (const row of merged) {
      if (row.a < min) min = row.a;
      if (row.b < min) min = row.b;
    }
    return min;
  }, [merged]);

  const yAxisFormatter = mode === 'percent'
    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
    : (v: number) => v.toFixed(0);

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
            <stop offset="0%" stopColor={COMPARE_COLOR_A} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COMPARE_COLOR_A} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradientIdB} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COMPARE_COLOR_B} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COMPARE_COLOR_B} stopOpacity={0} />
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
          tickFormatter={yAxisFormatter}
          width={60}
          dx={-4}
        />
        <Tooltip content={<CompareChartTooltip labelA={labelA} labelB={labelB} mode={mode} />} cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="a"
          stroke={COMPARE_COLOR_A}
          strokeWidth={2.5}
          fill={`url(#${gradientIdA})`}
          baseValue={baseValue}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: COMPARE_COLOR_A }}
          animationDuration={800}
          animationEasing="ease-out"
          name={labelA}
        />
        <Area
          type="monotone"
          dataKey="b"
          stroke={COMPARE_COLOR_B}
          strokeWidth={2}
          strokeDasharray="6 3"
          fill={`url(#${gradientIdB})`}
          baseValue={baseValue}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: COMPARE_COLOR_B }}
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
  const [compareMode, setCompareMode] = useState<CompareMode>('percent');
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

  // Percent: change from start (%). Price-indexed: start = 100 so BTC and e.g. ADA are on same scale
  const normalizedA = useMemo(() => {
    if (!dataA.length) return [];
    const base = dataA[0].close;
    if (compareMode === 'percent') {
      return dataA.map(d => ({ timestamp: d.timestamp, value: ((d.close - base) / base) * 100 }));
    }
    return dataA.map(d => ({ timestamp: d.timestamp, value: (d.close / base) * 100 }));
  }, [dataA, compareMode]);

  const normalizedB = useMemo(() => {
    if (!dataB.length) return [];
    const base = dataB[0].close;
    if (compareMode === 'percent') {
      return dataB.map(d => ({ timestamp: d.timestamp, value: ((d.close - base) / base) * 100 }));
    }
    return dataB.map(d => ({ timestamp: d.timestamp, value: (d.close / base) * 100 }));
  }, [dataB, compareMode]);

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
              <AssetIcon symbol={assetA} size={40} />
              <div>
                <p className="text-sm font-medium">{ASSETS.find(a => a.id === assetA)?.name}</p>
                <p className="text-lg font-semibold font-display">{formatValue(priceA)}</p>
              </div>
            </div>
            <p className={`text-2xl font-bold font-display ${changeA >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {changeA >= 0 ? '+' : ''}{changeA.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{PERIODS[period].label}</p>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <AssetIcon symbol={assetB} size={40} />
              <div>
                <p className="text-sm font-medium">{ASSETS.find(a => a.id === assetB)?.name}</p>
                <p className="text-lg font-semibold font-display">{formatValue(priceB)}</p>
              </div>
            </div>
            <p className={`text-2xl font-bold font-display ${changeB >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
              <AssetIcon symbol={assetA} size={20} />
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
                  strokeColor={COMPARE_COLOR_A}
                  timeRange={period}
                />
              )}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AssetIcon symbol={assetB} size={20} />
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
                  strokeColor={COMPARE_COLOR_B}
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
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <p className="text-xs font-medium">
                Performance Comparada
                {compareMode === 'percent' ? ' (%)' : ' (preço indexado)'}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1 p-0.5 bg-muted">
                  <button
                    type="button"
                    onClick={() => setCompareMode('percent')}
                    aria-pressed={compareMode === 'percent'}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${compareMode === 'percent' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Percentagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('price')}
                    aria-pressed={compareMode === 'price'}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${compareMode === 'price' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Preço (índice 100)
                    <TooltipProvider delayDuration={200}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help" aria-label="Explicação do índice 100" onClick={(e) => e.stopPropagation()}>
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[260px]">
                          O valor no primeiro dia do período é 100. Nos dias seguintes, 110 significa +10% desde o início e 90 significa -10%. Assim, BTC e um ativo muito mais barato (ex. ADA) aparecem na mesma escala.
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPARE_COLOR_A }} />
                  {assetA}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPARE_COLOR_B }} />
                  {assetB}
                </div>
              </div>
            </div>
            <p className="text-xs font-medium text-foreground">
              {assetA} {changeA > changeB ? 'lidera' : 'atrás'} por {Math.abs(changeA - changeB).toFixed(1)}%
            </p>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
              </div>
            ) : (
              <ComparisonChart dataA={normalizedA} dataB={normalizedB} labelA={assetA} labelB={assetB} period={period} mode={compareMode} />
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
