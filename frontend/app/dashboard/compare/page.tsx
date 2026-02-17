'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { D3DualAreaChart } from '@/components/charts';

const COMPARE_COLOR_A = '#8b5cf6'; // violet-500 (primeiro ativo, esquerda)
const COMPARE_COLOR_B = '#f97316'; // orange-500 (segundo ativo, direita)

type CompareMode = 'percent' | 'price';

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

interface PriceData {
  timestamp: string;
  close: number;
}

export default function ComparePage() {
  const { formatValue, formatChartValue } = useCurrency();
  const [assetA, setAssetA] = useState('BTC');
  const [assetB, setAssetB] = useState('ETH');
  const [period, setPeriod] = useState<Period>('90d');
  const [compareMode, setCompareMode] = useState<CompareMode>('percent');

  const config = PERIODS[period];
  const { data: priceData, isLoading: loading } = useQuery({
    queryKey: ['compare-prices', assetA, assetB, period],
    queryFn: async () => {
      const [resA, resB] = await Promise.all([
        fetch(`/api/prices/history?symbol=${assetA}&interval=${config.interval}&days=${config.days}`),
        fetch(`/api/prices/history?symbol=${assetB}&interval=${config.interval}&days=${config.days}`),
      ]);
      return {
        dataA: resA.ok ? (await resA.json()) as PriceData[] : [],
        dataB: resB.ok ? (await resB.json()) as PriceData[] : [],
      };
    },
    meta: { onError: () => toast.error('Erro ao carregar dados de comparação') },
  });
  const dataA = priceData?.dataA ?? [];
  const dataB = priceData?.dataB ?? [];

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

  const compareUseYearOnly = period === '1y' || period === '2y' || period === '4y' || period === 'all';

  const mergedCompareData = useMemo(() => {
    const len = Math.min(normalizedA.length, normalizedB.length);
    if (len === 0) return [];
    return Array.from({ length: len }, (_, i) => {
      const ts = normalizedA[i].timestamp;
      const d = new Date(ts);
      const date = compareUseYearOnly
        ? ts
        : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' });
      return {
        timestamp: ts,
        date,
        a: normalizedA[i].value,
        b: normalizedB[i]?.value ?? 0,
      };
    });
  }, [normalizedA, normalizedB, compareUseYearOnly]);

  const compareFormatValue = compareMode === 'percent'
    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
    : (v: number) => v.toFixed(0);

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
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <Select value={assetA} onValueChange={setAssetA}>
              <SelectTrigger className="w-full sm:w-44 h-10 min-w-0">
                <SelectValue placeholder="Primeiro asset" />
              </SelectTrigger>
            <SelectContent>
              {ASSETS.map(a => (
                <SelectItem key={a.id} value={a.id} disabled={a.id === assetB}>{a.id} — {a.name}</SelectItem>
              ))}
            </SelectContent>
            </Select>

          <span className="text-sm text-muted-foreground font-medium">vs</span>

            <Select value={assetB} onValueChange={setAssetB}>
              <SelectTrigger className="w-full sm:w-44 h-10 min-w-0">
                <SelectValue placeholder="Segundo asset" />
              </SelectTrigger>
            <SelectContent>
              {ASSETS.map(a => (
                <SelectItem key={a.id} value={a.id} disabled={a.id === assetA}>{a.id} — {a.name}</SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto -mx-1 sm:mx-0 sm:ml-auto">
            <div className="flex gap-1 min-w-max sm:min-w-0 pb-1 sm:pb-0">
              {(Object.keys(PERIODS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  aria-label={`Período ${PERIODS[p].label}`}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                    period === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {PERIODS[p].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 gap-3 min-w-0">
          <div className="border border-border bg-card p-4 sm:p-5 min-w-0 overflow-hidden">
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

          <div className="border border-border bg-card p-4 sm:p-5 min-w-0 overflow-hidden">
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
          <div className="border border-border bg-card min-w-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
              <AssetIcon symbol={assetA} size={20} />
              <p className="text-xs font-medium">{assetA}</p>
              <span className="text-[10px] text-muted-foreground">Preço</span>
              {dataA.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Max {formatChartValue(Math.max(...dataA.map(d => d.close)))}
                </span>
              )}
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
                  formatValue={formatChartValue}
                  strokeColor={COMPARE_COLOR_A}
                  timeRange={period}
                  xAxisFormat={period === '1y' || period === '2y' || period === '4y' || period === 'all' ? 'year' : 'default'}
                  hideMaxInChart
                />
              )}
            </div>
          </div>

          <div className="border border-border bg-card min-w-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
              <AssetIcon symbol={assetB} size={20} />
              <p className="text-xs font-medium">{assetB}</p>
              <span className="text-[10px] text-muted-foreground">Preço</span>
              {dataB.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Max {formatChartValue(Math.max(...dataB.map(d => d.close)))}
                </span>
              )}
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
                  formatValue={formatChartValue}
                  strokeColor={COMPARE_COLOR_B}
                  timeRange={period}
                  xAxisFormat={period === '1y' || period === '2y' || period === '4y' || period === 'all' ? 'year' : 'default'}
                  hideMaxInChart
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
                          <span role="button" tabIndex={0} className="inline-flex text-muted-foreground hover:text-foreground cursor-help" aria-label="Explicação do índice 100" onClick={(e) => e.stopPropagation()}>
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
          <div className="p-3 min-w-0 overflow-hidden">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
              </div>
            ) : mergedCompareData.length > 0 ? (
              <D3DualAreaChart
                data={mergedCompareData}
                height={280}
                colorA={COMPARE_COLOR_A}
                colorB={COMPARE_COLOR_B}
                formatValue={compareFormatValue}
                formatDate={compareUseYearOnly
                  ? (ts) => new Date(ts).getFullYear().toString()
                  : (ts) => new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' })}
                labelA={assetA}
                labelB={assetB}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para este período
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
