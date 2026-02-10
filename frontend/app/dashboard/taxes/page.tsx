'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useTrades } from '@/hooks/use-trades';
import type { TradeData } from '@/lib/types';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';
import { AssetIcon } from '@/components/AssetIcon';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

// CIRS Art. 10.º n.º 19 — isenção de mais-valias em criptoactivos detidos ≥365 dias
// Regra introduzida pela Lei n.º 24-D/2022 (OE 2023)
const PT_TAX_LAW = {
  label: 'CIRS, aprovado pelo Decreto-Lei n.º 442-A/88, na redação dada pela Lei n.º 24-D/2022',
  article: 'Art. 10.º, n.º 19',
  url: 'https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs10.aspx',
};

// Dynamic import — jsPDF is ~300KB, only load when user exports
const generateTaxReportPDF = async (...args: Parameters<typeof import('@/lib/pdf-export').generateTaxReportPDF>) => {
  const { generateTaxReportPDF: fn } = await import('@/lib/pdf-export');
  return fn(...args);
};

// ---------------------------------------------------------------------------
// Fee to USD conversion (fees can be in USDT, BNB, base asset, etc.)
// ---------------------------------------------------------------------------

const STABLECOINS = new Set(['USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'FRAX', 'EUR']);

function buildAssetPriceMap(trades: TradeData[]): Map<string, number> {
  const m = new Map<string, number>();
  const byTime = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  for (const t of byTime) {
    const parts = t.symbol.split('/');
    const base = parts[0]?.toUpperCase();
    const quote = parts[1]?.split(':')[0]?.toUpperCase();
    if (base && quote && STABLECOINS.has(quote) && !m.has(base)) {
      m.set(base, t.price);
    }
  }
  return m;
}

function feeToUsd(trade: TradeData, priceMap: Map<string, number>): number {
  const fee = trade.fee || 0;
  if (fee <= 0) return 0;
  const fc = (trade.feeCurrency || 'USDT').toUpperCase();
  if (STABLECOINS.has(fc)) return fee;
  const price = priceMap.get(fc);
  if (price != null) return fee * price;
  const [base, quote] = (trade.symbol || '').split('/');
  const baseNorm = base?.toUpperCase();
  const quoteNorm = quote?.split(':')[0]?.toUpperCase();
  if (baseNorm === fc && quoteNorm && STABLECOINS.has(quoteNorm)) {
    return fee * trade.price;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// FIFO lot tracking
// ---------------------------------------------------------------------------

interface BuyLot {
  date: Date;
  amount: number;       // remaining amount in this lot
  pricePerUnit: number;  // cost per unit
  totalCost: number;     // original total cost of the lot
  exchange: string;
  symbol: string;
}

interface SaleEvent {
  date: Date;
  symbol: string;
  baseAsset: string;
  amount: number;
  revenue: number;       // proceeds from sell
  fee: number;
  exchange: string;
  // FIFO-matched data
  costBasis: number;     // total cost of the matched lots
  realizedPnL: number;   // revenue - costBasis - fee
  holdingDays: number;   // weighted average holding days (for display)
  isTaxFree: boolean;    // ALL matched lots held > 365 days
  taxFreePortion: number; // portion of P&L from lots held > 365d
  taxablePortion: number; // portion of P&L from lots held <= 365d
  lots: Array<{
    buyDate: Date;
    amount: number;
    costBasis: number;
    holdingDays: number;
    isTaxFree: boolean;
    pnl: number;
  }>;
}

interface AssetHolding {
  asset: string;
  totalAmount: number;
  totalCost: number;
  averageCost: number;
  currentValue: number;
  firstPurchase: Date | null;
  holdingDays: number;
  isTaxFree: boolean;          // oldest lot held > 365d
  daysUntilTaxFree: number;
  progressToTaxFree: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  buyLots: BuyLot[];           // remaining lots
}

/**
 * Process all trades chronologically using FIFO to build:
 * 1. Per-asset buy lot queues (for unrealized P&L)
 * 2. Per-sale event breakdown (for realized P&L with holding period)
 */
function processFIFO(allTrades: TradeData[]) {
  const priceMap = buildAssetPriceMap(allTrades);
  // Sort oldest first
  const chronological = [...allTrades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Buy lots per base asset (FIFO queue — oldest first)
  const lotQueues = new Map<string, BuyLot[]>();
  const sales: SaleEvent[] = [];

  for (const trade of chronological) {
    const baseAsset = trade.symbol.split('/')[0];

    if (trade.side === 'buy') {
      if (!lotQueues.has(baseAsset)) lotQueues.set(baseAsset, []);
      lotQueues.get(baseAsset)!.push({
        date: new Date(trade.timestamp),
        amount: trade.amount,
        pricePerUnit: trade.price,
        totalCost: trade.cost,
        exchange: trade.exchange,
        symbol: trade.symbol,
      });
    } else if (trade.side === 'sell') {
      const lots = lotQueues.get(baseAsset) || [];
      let remaining = trade.amount;
      let totalCostBasis = 0;
      const matchedLots: SaleEvent['lots'] = [];
      const sellDate = new Date(trade.timestamp);

      // FIFO: consume oldest lots first
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const consumed = Math.min(remaining, lot.amount);
        const lotCost = consumed * lot.pricePerUnit;
        const holdingDays = Math.floor(
          (sellDate.getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isTaxFree = holdingDays >= 365;
        const lotRevenue = (consumed / trade.amount) * trade.cost;
        const lotPnl = lotRevenue - lotCost;

        matchedLots.push({
          buyDate: lot.date,
          amount: consumed,
          costBasis: lotCost,
          holdingDays,
          isTaxFree,
          pnl: lotPnl,
        });

        totalCostBasis += lotCost;
        lot.amount -= consumed;
        remaining -= consumed;

        if (lot.amount <= 0.00000001) lots.shift(); // remove exhausted lot
      }

      const revenue = trade.cost;
      const feeUsd = feeToUsd(trade, priceMap);
      const realizedPnL = revenue - totalCostBasis - feeUsd;

      // Calculate tax-free vs taxable portions
      let taxFreePnL = 0;
      let taxablePnL = 0;
      for (const ml of matchedLots) {
        if (ml.isTaxFree) taxFreePnL += ml.pnl;
        else taxablePnL += ml.pnl;
      }

      // Weighted average holding days
      const totalMatchedAmount = matchedLots.reduce((s, l) => s + l.amount, 0);
      const weightedDays = totalMatchedAmount > 0
        ? matchedLots.reduce((s, l) => s + l.holdingDays * l.amount, 0) / totalMatchedAmount
        : 0;

      const allTaxFree = matchedLots.length > 0 && matchedLots.every(l => l.isTaxFree);

      sales.push({
        date: sellDate,
        symbol: trade.symbol,
        baseAsset,
        amount: trade.amount,
        revenue,
        fee: feeUsd,
        exchange: trade.exchange,
        costBasis: totalCostBasis,
        realizedPnL,
        holdingDays: Math.round(weightedDays),
        isTaxFree: allTaxFree,
        taxFreePortion: taxFreePnL,
        taxablePortion: taxablePnL,
        lots: matchedLots,
      });
    }
  }

  return { lotQueues, sales };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaxesPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [exporting, setExporting] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [eligibilityPage, setEligibilityPage] = useState(1);

  const SALES_PER_PAGE = 10;
  const ELIGIBILITY_PER_PAGE = 10;

  // Fetch ALL trades (days=0 means all-time) for complete FIFO tracking.
  // Must request high limit — backend caps at 100k; 10k was truncating recent trades (2025).
  const { data: tradesResponse, isLoading: tradesLoading } = useTrades(0, undefined, 100000, { page: 1 });
  const { data: portfolioData, isLoading: portfolioLoading } = usePortfolio({ perPage: 200 });
  const loading = tradesLoading || portfolioLoading;
  const allTrades = useMemo(() => tradesResponse?.trades || [], [tradesResponse]);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  useEffect(() => {
    setSalesPage(1);
    setEligibilityPage(1);
  }, [selectedYear]);

  // Available years from trades data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const t of allTrades) {
      years.add(new Date(t.timestamp).getFullYear());
    }
    // Always include current year
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allTrades]);

  // Process FIFO and build all data
  const {
    salesInYear, holdings, totalRealizedPnL, taxFreeRealizedPnL, taxableRealizedPnL,
    totalBuyVolumeInYear, totalSellVolumeInYear, totalFeesInYear,
    buyCountInYear, sellCountInYear, potentialTax,
    totalValue, totalInvested, totalUnrealizedPnL,
    totalTaxFreeValue, totalTaxableValue,
  } = useMemo(() => {
    const year = parseInt(selectedYear);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const { lotQueues, sales } = processFIFO(allTrades);

    // Filter sales to the selected year
    const salesInYear = sales.filter(
      s => s.date >= yearStart && s.date < yearEnd,
    );

    // Filter trades in year for volume stats
    const tradesInYear = allTrades.filter(t => {
      const d = new Date(t.timestamp);
      return d >= yearStart && d < yearEnd;
    });

    const buysInYear = tradesInYear.filter(t => t.side === 'buy');
    const sellsInYear = tradesInYear.filter(t => t.side === 'sell');

    const priceMap = buildAssetPriceMap(allTrades);
    const totalBuyVolumeInYear = buysInYear.reduce((s, t) => s + t.cost, 0);
    const totalSellVolumeInYear = sellsInYear.reduce((s, t) => s + t.cost, 0);
    const totalFeesInYear = tradesInYear.reduce((s, t) => s + feeToUsd(t, priceMap), 0);

    // Realized P&L breakdown
    const totalRealizedPnL = salesInYear.reduce((s, e) => s + e.realizedPnL, 0);
    const taxFreeRealizedPnL = salesInYear.reduce((s, e) => s + e.taxFreePortion, 0);
    const taxableRealizedPnL = salesInYear.reduce((s, e) => s + e.taxablePortion, 0);

    // Only tax positive taxable gains at 28%
    const potentialTax = Math.max(0, taxableRealizedPnL) * 0.28;

    // Build current holdings from remaining FIFO lots
    const now = new Date();
    const holdingsMap = new Map<string, AssetHolding>();

    for (const [asset, lots] of lotQueues) {
      if (lots.length === 0) continue;
      const totalAmt = lots.reduce((s, l) => s + l.amount, 0);
      if (totalAmt <= 0.00000001) continue;

      const totalCst = lots.reduce((s, l) => s + l.amount * l.pricePerUnit, 0);
      const oldest = lots[0].date;
      const holdDays = Math.floor((now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));

      // Match with portfolio data (case-insensitive for robustness)
      const balance = portfolioData?.balances?.find(
        (b: { asset: string }) => b.asset.toUpperCase() === asset.toUpperCase(),
      );
      const currentValue = balance?.totalValue ?? 0;

      holdingsMap.set(asset, {
        asset,
        totalAmount: totalAmt,
        totalCost: totalCst,
        averageCost: totalCst / totalAmt,
        currentValue,
        firstPurchase: oldest,
        holdingDays: holdDays,
        isTaxFree: holdDays >= 365,
        daysUntilTaxFree: Math.max(0, 365 - holdDays),
        progressToTaxFree: Math.min(100, (holdDays / 365) * 100),
        unrealizedPnL: currentValue - totalCst,
        unrealizedPnLPercent: totalCst > 0 ? ((currentValue - totalCst) / totalCst) * 100 : 0,
        buyLots: lots,
      });
    }

    const holdings = Array.from(holdingsMap.values())
      .filter(h => h.totalAmount > 0.00000001)
      .sort((a, b) => b.currentValue - a.currentValue);

    // Use the real portfolio value (from exchange balances), not FIFO-derived values
    // FIFO holdings might not match all portfolio assets (transfers, airdrops, etc.)
    const portfolioTotalValue = portfolioData?.totalValue ?? 0;
    const fifoTotalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalValue = portfolioTotalValue > 0 ? portfolioTotalValue : fifoTotalValue;
    const totalInvested = holdings.reduce((s, h) => s + h.totalCost, 0);
    const totalUnrealizedPnL = totalValue - totalInvested;

    const taxFreeHoldings = holdings.filter(h => h.isTaxFree);
    const taxableHoldings = holdings.filter(h => !h.isTaxFree);
    const totalTaxFreeValue = taxFreeHoldings.reduce((s, h) => s + h.currentValue, 0);
    const totalTaxableValue = taxableHoldings.reduce((s, h) => s + h.currentValue, 0);

    return {
      salesInYear, holdings, totalRealizedPnL, taxFreeRealizedPnL, taxableRealizedPnL,
      totalBuyVolumeInYear, totalSellVolumeInYear, totalFeesInYear,
      buyCountInYear: buysInYear.length, sellCountInYear: sellsInYear.length,
      potentialTax, totalValue, totalInvested, totalUnrealizedPnL,
      totalTaxFreeValue, totalTaxableValue,
    };
  }, [allTrades, selectedYear, portfolioData]);

  const exportCSV = () => {
    setExporting(true);
    try {
      const headers = [
        'Data', 'Par', 'Exchange', 'Quantidade', 'Receita', 'Custo Base (FIFO)',
        'P&L Realizado', 'Dias Detenção', 'Isento (>365d)', 'P&L Isento', 'P&L Tributável',
      ];
      const rows = salesInYear.map(s => [
        s.date.toISOString().split('T')[0],
        s.symbol,
        s.exchange,
        s.amount.toFixed(8),
        formatValue(s.revenue),
        formatValue(s.costBasis),
        formatValue(s.realizedPnL),
        s.holdingDays.toString(),
        s.isTaxFree ? 'Sim' : 'Não',
        formatValue(s.taxFreePortion),
        formatValue(s.taxablePortion),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `impostos-crypto-${selectedYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado');
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = () => {
    setExporting(true);
    try {
      generateTaxReportPDF({
        year: parseInt(selectedYear),
        userName: session?.user?.name || session?.user?.email || 'Utilizador',
        generatedAt: new Date(),
        currency: 'EUR',
        formatValue,
        summary: {
          totalRealizedPnL,
          taxFreeRealizedPnL,
          taxableRealizedPnL,
          totalBuyVolume: totalBuyVolumeInYear,
          totalSellVolume: totalSellVolumeInYear,
          totalFees: totalFeesInYear,
          potentialTax,
          totalValue,
          totalInvested,
        },
        sales: salesInYear.map(s => ({
          date: s.date,
          symbol: s.symbol,
          amount: s.amount,
          revenue: s.revenue,
          costBasis: s.costBasis,
          realizedPnL: s.realizedPnL,
          holdingDays: s.holdingDays,
          isTaxFree: s.isTaxFree,
          taxFreePortion: s.taxFreePortion,
          taxablePortion: s.taxablePortion,
        })),
        assets: holdings.map(a => ({
          asset: a.asset,
          firstPurchase: a.firstPurchase,
          holdingDays: a.holdingDays,
          isTaxFree: a.isTaxFree,
          totalAmount: a.totalAmount,
          totalCost: a.totalCost,
          currentValue: a.currentValue,
          unrealizedPnL: a.unrealizedPnL,
          unrealizedPnLPercent: a.unrealizedPnLPercent,
        })),
      });
      toast.success('PDF exportado');
    } catch {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-medium tracking-tight">Impostos</h1>
            <p className="text-sm text-muted-foreground">Relatório fiscal {selectedYear}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="min-w-[100px] h-9">
                <SelectValue placeholder="Ano fiscal" />
                </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
            <Button onClick={exportCSV} disabled={exporting} variant="outline" className="h-9" aria-label="Exportar relatório CSV">
              CSV
            </Button>
            <Button onClick={exportPDF} disabled={exporting} className="h-9" aria-label="Exportar relatório PDF">
              PDF
            </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      {tradesResponse?.truncated != null && (
        <div className="p-4 border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 min-w-0 overflow-hidden">
          <p className="text-sm font-medium">Atenção: dados possivelmente incompletos</p>
          <p className="text-xs mt-1 text-muted-foreground break-words">
            Tens mais de {tradesResponse.truncated.toLocaleString('pt-PT')} trades. O sistema carregou o máximo permitido.
            O volume de vendas e P&L de 2025 podem estar subestimados. Sincroniza novamente para garantir que todos os trades foram importados.
          </p>
        </div>
      )}

      {/* Two-column layout — sidebar stacks below on mobile */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start min-w-0">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          {/* Portugal tax regime */}
          <div className="p-4 border border-border bg-card">
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">
              <div className="w-1 bg-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">Regime Fiscal Portugal</p>
                  <a
                    href={PT_TAX_LAW.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
                    title={`Consultar ${PT_TAX_LAW.label} — ${PT_TAX_LAW.article}`}
                    aria-label={`Abrir lei em nova janela: CIRS ${PT_TAX_LAW.article}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Criptomoedas detidas por mais de <span className="text-foreground font-medium">365 dias</span> estão
                  isentas de imposto sobre mais-valias (<span className="text-foreground font-medium">CIRS {PT_TAX_LAW.article}</span>). Vendas com detenção inferior são tributadas a <span className="text-foreground font-medium">28%</span>.
                  O método <span className="text-foreground font-medium">FIFO</span> é utilizado para determinar a detenção de cada venda.
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1.5 break-words">
                  {PT_TAX_LAW.label} — {PT_TAX_LAW.article} (isenção de mais-valias em criptoactivos detidos ≥365 dias). Mesmo isentas, as vendas devem ser declaradas no IRS (Anexo G1).
                </p>
              </div>
            </div>
          </div>

          {/* Tax Report Summary */}
          <div className="border border-border bg-card">
            <div className="p-4 border-b border-border">
              <p className="font-medium text-sm">Relatório Fiscal</p>
              <p className="text-xs text-muted-foreground mt-1">
                1 Jan a 31 Dez {selectedYear}
              </p>
            </div>
            <div className="p-4 space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm shrink-0">P&L Realizado (total)</span>
                <span className={`font-medium shrink-0 text-right ${totalRealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {totalRealizedPnL >= 0 ? '+' : ''}{formatValue(totalRealizedPnL)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                  <span className="text-sm truncate">P&L Isento (&gt;365 dias)</span>
                </div>
                <span className="font-medium text-emerald-500 shrink-0 text-right">
                  {taxFreeRealizedPnL >= 0 ? '+' : ''}{formatValue(taxFreeRealizedPnL)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#f59e0b' }} />
                  <span className="text-sm truncate">P&L Tributável (&lt;365 dias)</span>
                </div>
                <span className="font-medium shrink-0 text-right" style={{ color: '#f59e0b' }}>
                  {taxableRealizedPnL >= 0 ? '+' : ''}{formatValue(taxableRealizedPnL)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm shrink-0">Volume compras</span>
                <span className="text-sm text-muted-foreground shrink-0 text-right">{formatValue(totalBuyVolumeInYear)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm shrink-0">Volume vendas</span>
                <span className="text-sm text-muted-foreground shrink-0 text-right">{formatValue(totalSellVolumeInYear)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm shrink-0">Taxas & comissões</span>
                <span className="text-sm text-muted-foreground shrink-0 text-right">{formatValue(totalFeesInYear)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm font-medium shrink-0">Imposto estimado (28%)</span>
                <span className="font-medium text-red-500 shrink-0 text-right">{formatValue(potentialTax)}</span>
              </div>
            </div>
          </div>

          {/* Realized Sales Detail (FIFO) */}
          <div className="border border-border bg-card min-w-0">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="font-medium text-sm min-w-0">Vendas Realizadas em {selectedYear}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-muted-foreground">{salesInYear.length} vendas</p>
                  {salesInYear.length > SALES_PER_PAGE && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                        disabled={salesPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
                        {salesPage} / {Math.ceil(salesInYear.length / SALES_PER_PAGE)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSalesPage((p) => Math.min(Math.ceil(salesInYear.length / SALES_PER_PAGE), p + 1))}
                        disabled={salesPage >= Math.ceil(salesInYear.length / SALES_PER_PAGE)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {salesInYear.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sem vendas em {selectedYear}</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Data</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Custo (FIFO)</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right">Detenção</TableHead>
                      <TableHead className="text-right pr-4">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesInYear
                      .slice((salesPage - 1) * SALES_PER_PAGE, salesPage * SALES_PER_PAGE)
                      .map((sale, idx) => (
                      <TableRow key={`${sale.symbol}-${sale.date.getTime()}-${idx}`} className="group">
                        <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">
                          {sale.date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AssetIcon symbol={sale.baseAsset} size={24} className="shrink-0 [&_img]:rounded-none" />
                            <span className="text-xs font-medium">{sale.symbol}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {sale.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatValue(sale.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatValue(sale.costBasis)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-medium ${sale.realizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {sale.realizedPnL >= 0 ? '+' : ''}{formatValue(sale.realizedPnL)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {sale.holdingDays}d
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {sale.isTaxFree ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-500">ISENTO</span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-500/10 text-amber-500">TRIBUTÁVEL</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Holdings with ROI */}
          <div className="border border-border bg-card min-w-0">
            <div className="p-4 border-b border-border">
              <p className="font-medium text-sm">Holdings Atuais</p>
            </div>
            {holdings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sem holdings. Sincroniza as tuas exchanges.</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Coin</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right pr-4">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((h) => {
                      const pctOfPortfolio = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
                      return (
                        <TableRow key={h.asset}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <AssetIcon symbol={h.asset} size={32} className="shrink-0 [&_img]:rounded-none" />
                              <div>
                                <span className="font-medium text-sm">{h.asset}</span>
                                <p className="text-xs text-muted-foreground">{pctOfPortfolio.toFixed(0)}%</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {h.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatValue(h.totalCost)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatValue(h.currentValue)}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <span className={`font-medium text-sm ${h.unrealizedPnLPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {h.unrealizedPnLPercent >= 0 ? '+' : ''}{h.unrealizedPnLPercent.toFixed(0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Tax Status per Asset (holding period progress) */}
          <div className="border border-border bg-card min-w-0">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Elegibilidade Fiscal</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Cada compra conta. A mais antiga determina a isenção (FIFO).
                  </p>
                </div>
                {holdings.length > ELIGIBILITY_PER_PAGE && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEligibilityPage((p) => Math.max(1, p - 1))}
                      disabled={eligibilityPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
                      {eligibilityPage} / {Math.ceil(holdings.length / ELIGIBILITY_PER_PAGE)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEligibilityPage((p) => Math.min(Math.ceil(holdings.length / ELIGIBILITY_PER_PAGE), p + 1))}
                      disabled={eligibilityPage >= Math.ceil(holdings.length / ELIGIBILITY_PER_PAGE)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {holdings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sem holdings</p>
              </div>
            ) : (
              holdings
                .slice((eligibilityPage - 1) * ELIGIBILITY_PER_PAGE, eligibilityPage * ELIGIBILITY_PER_PAGE)
                .map((h) => (
                <div key={h.asset} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
                  <AssetIcon symbol={h.asset} size={32} className="shrink-0 [&_img]:rounded-none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{h.asset}</span>
                      {h.isTaxFree ? (
                        <span className="text-xs font-medium text-emerald-500">ISENTO</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{h.daysUntilTaxFree}d restantes</span>
                      )}
                    </div>
                    <div className="h-1 bg-muted w-full">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${h.progressToTaxFree}%`,
                          backgroundColor: h.isTaxFree ? '#22c55e' : '#f59e0b',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">{h.holdingDays} dias (compra mais antiga)</p>
                      <p className="text-xs text-muted-foreground">{h.buyLots.length} compra{h.buyLots.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-6 min-w-0">
          {/* Portfolio Overview */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio Atual</p>
            <p className="text-2xl font-medium mt-1">{formatValue(totalValue)}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Investido (FIFO)</span>
                <span>{formatValue(totalInvested)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">P&L Não Realizado</span>
                <span className={totalUnrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}{formatValue(totalUnrealizedPnL)}
                </span>
              </div>
            </div>
          </div>

          {/* Realized P&L */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              P&L Realizado {selectedYear}
            </p>
            <p className={`text-2xl font-medium ${totalRealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalRealizedPnL >= 0 ? '+' : ''}{formatValue(totalRealizedPnL)}
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Isento (&gt;365d)</span>
                <span className="text-emerald-500">{formatValue(taxFreeRealizedPnL)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tributável</span>
                <span style={{ color: '#f59e0b' }}>{formatValue(taxableRealizedPnL)}</span>
              </div>
            </div>
          </div>

          {/* Transaction count */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Transações {selectedYear}
            </p>
            <p className="text-3xl font-medium">{buyCountInYear + sellCountInYear}</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Compras</span>
                <span className="text-sm font-medium text-foreground">{buyCountInYear}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Vendas</span>
                <span className="text-sm font-medium text-red-500">{sellCountInYear}</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Breakdown Holdings
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Isento (&gt;1 ano)</span>
                <span className="text-sm font-medium text-emerald-500">{formatValue(totalTaxFreeValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tributável</span>
                <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>{formatValue(totalTaxableValue)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Imposto (28%)</span>
                <span className="text-sm font-medium text-red-500">{formatValue(potentialTax)}</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Definições
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">País</span>
                <span>Portugal</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Moeda base</span>
                <span>EUR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Método de custo</span>
                <span>FIFO</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxa imposto</span>
                <span>28%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Isenção</span>
                <span>&gt;365 dias</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="p-4 bg-muted text-xs text-muted-foreground space-y-2 break-words min-w-0">
            <p>-- Cada venda é cruzada com as compras mais antigas (FIFO)</p>
            <p>-- Se todas as compras usadas tiverem &gt;365 dias, o ganho é isento</p>
            <p>-- Vendas parcialmente isentas mostram a divisão</p>
            <p>-- Perdas tributáveis compensam ganhos no mesmo ano</p>
          </div>
        </div>
      </div>
    </div>
  );
}
