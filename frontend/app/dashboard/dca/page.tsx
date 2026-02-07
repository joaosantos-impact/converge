'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/app/providers';
import { toast } from 'sonner';
import { FadeIn, Stagger, StaggerItem } from '@/components/animations';

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface DCAResult {
  totalInvested: number;
  currentValue: number;
  totalCoins: number;
  avgPrice: number;
  roi: number;
  profit: number;
  purchases: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', BTC: '₿' };

export default function DCACalculatorPage() {
  const { formatValue, currency } = useCurrency();
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  
  const [amount, setAmount] = useState('100');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [duration, setDuration] = useState('12'); // months
  const [asset, setAsset] = useState('BTC');
  const [currentPrice, setCurrentPrice] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const POPULAR_ASSETS = [
    { id: 'BTC', name: 'Bitcoin' },
    { id: 'ETH', name: 'Ethereum' },
    { id: 'SOL', name: 'Solana' },
    { id: 'BNB', name: 'BNB' },
    { id: 'XRP', name: 'XRP' },
    { id: 'ADA', name: 'Cardano' },
    { id: 'AVAX', name: 'Avalanche' },
    { id: 'DOT', name: 'Polkadot' },
    { id: 'LINK', name: 'Chainlink' },
    { id: 'MATIC', name: 'Polygon' },
  ];

  // Fetch current price for asset via internal API
  const fetchPrice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices/history?symbol=${asset}&days=1&interval=1d`);
      if (!res.ok) throw new Error('Erro na resposta da API');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        toast.error('Sem dados de preço disponíveis');
        return;
      }
      const lastPrice = data[data.length - 1]?.close;
      if (typeof lastPrice !== 'number' || isNaN(lastPrice)) {
        toast.error('Dados de preço inválidos');
        return;
      }
      setCurrentPrice(lastPrice.toFixed(2));
      if (!avgBuyPrice) {
        setAvgBuyPrice((lastPrice * 0.95).toFixed(2));
      }
    } catch {
      toast.error('Erro ao carregar preço');
    } finally {
      setLoading(false);
    }
  };

  const result = useMemo<DCAResult | null>(() => {
    const amountNum = parseFloat(amount);
    const durationNum = parseInt(duration);
    const currentPriceNum = parseFloat(currentPrice);
    const avgBuyPriceNum = parseFloat(avgBuyPrice);

    if (!amountNum || !durationNum || !currentPriceNum || !avgBuyPriceNum) return null;

    const purchasesPerMonth: Record<Frequency, number> = {
      daily: 30,
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
    };

    const totalPurchases = Math.floor(purchasesPerMonth[frequency] * durationNum);
    const totalInvested = amountNum * totalPurchases;
    const totalCoins = totalInvested / avgBuyPriceNum;
    const currentValue = totalCoins * currentPriceNum;
    const profit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      totalCoins,
      avgPrice: avgBuyPriceNum,
      roi,
      profit,
      purchases: totalPurchases,
    };
  }, [amount, frequency, duration, currentPrice, avgBuyPrice]);

  const frequencyLabels: Record<Frequency, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <FadeIn>
        <div>
          <h1 className="text-xl font-medium tracking-tight">DCA Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Simula a estratégia Dollar Cost Averaging
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Input */}
          <div className="p-5 border border-border bg-card space-y-5">
            <div className="space-y-2">
              <Label className="text-xs">Asset</Label>
              <div className="flex gap-2">
                <Select value={asset} onValueChange={(v) => { setAsset(v); setCurrentPrice(''); setAvgBuyPrice(''); }}>
                  <SelectTrigger className="flex-1 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_ASSETS.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.id} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchPrice} disabled={loading} className="h-10">
                  {loading ? <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : 'Preço'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Valor por compra</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 h-10"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(frequencyLabels) as Frequency[]).map(f => (
                    <SelectItem key={f} value={f}>{frequencyLabels[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Duração (meses)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10"
                placeholder="12"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Preço atual</Label>
                <Input
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="h-10"
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Preço médio compra</Label>
                <Input
                  type="number"
                  value={avgBuyPrice}
                  onChange={(e) => setAvgBuyPrice(e.target.value)}
                  className="h-10"
                  placeholder="45000"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {result ? (
              <Stagger className="space-y-3">
                <StaggerItem className="p-4 border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Investido</p>
                  <p className="text-2xl font-medium mt-1">{formatValue(result.totalInvested)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.purchases} compras de {formatValue(parseFloat(amount))}
                  </p>
                </StaggerItem>

                <StaggerItem className="p-4 border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Valor Atual</p>
                  <p className="text-2xl font-medium mt-1">{formatValue(result.currentValue)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.totalCoins.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset}
                  </p>
                </StaggerItem>

                <StaggerItem className={`p-4 border border-border bg-card`}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Retorno</p>
                  <p className={`text-2xl font-medium mt-1 ${result.profit >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {result.profit >= 0 ? '+' : ''}{formatValue(result.profit)}
                  </p>
                  <p className={`text-xs mt-0.5 ${result.roi >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(1)}% ROI
                  </p>
                </StaggerItem>

                <StaggerItem className="p-4 border border-border bg-card">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Preço Médio</p>
                  <p className="text-2xl font-medium mt-1">{formatValue(result.avgPrice)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    vs {formatValue(parseFloat(currentPrice))} atual
                  </p>
                </StaggerItem>
              </Stagger>
            ) : (
              <div className="p-8 border border-border bg-card text-center h-full flex items-center justify-center">
                <div>
                  <p className="text-sm text-muted-foreground">Preenche os campos e carrega em &quot;Preço&quot;</p>
                  <p className="text-xs text-muted-foreground mt-1">para ver a simulação DCA</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Explanation */}
      <FadeIn delay={0.2}>
        <div className="p-4 border border-border bg-card">
          <p className="text-sm font-medium mb-2">O que é DCA?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Dollar Cost Averaging (DCA) é uma estratégia de investimento onde compras um montante fixo de um asset 
            a intervalos regulares, independentemente do preço. Isto reduz o impacto da volatilidade e elimina 
            a necessidade de &quot;timing&quot; do mercado. É particularmente eficaz em mercados voláteis como o crypto.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
