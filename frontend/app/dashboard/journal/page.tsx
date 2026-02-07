'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSession } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { useTrades } from '@/hooks/use-trades';
import { Spinner } from '@/components/Spinner';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import type { TradeData } from '@/lib/types';

interface JournalEntry {
  id: string;
  date: string;
  note: string;
  trades: TradeData[];
  selectedTradeIds: string[];
  pnl: number;
  createdAt: string;
}

const STORAGE_KEY = 'converge-journal';

export default function JournalPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  // Use React Query for trades (shared cache across pages)
  const { data: tradesData, isLoading: tradesLoading, error: tradesError } = useTrades(90);
  const trades = tradesData?.trades || [];
  const loading = tradesLoading;

  // New entry form
  const [isWriting, setIsWriting] = useState(false);
  const [note, setNote] = useState('');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch { /* empty */ }
  }, [session, isPending, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (tradesError) toast.error('Erro ao carregar trades');
  }, [tradesError]);

  const saveEntries = (updated: JournalEntry[]) => {
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Group trades by day
  const tradesByDay = useMemo(() => {
    const map = new Map<string, TradeData[]>();
    for (const t of trades) {
      const day = new Date(t.timestamp).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(t);
    }
    return map;
  }, [trades]);

  // Get unique trading days sorted desc
  const tradingDays = useMemo(() => {
    return Array.from(tradesByDay.keys()).sort((a, b) => b.localeCompare(a));
  }, [tradesByDay]);

  // Today's date for the new entry
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = tradesByDay.get(today) || [];

  // All recent trades for selection (last 30 days)
  const recentTrades = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return trades.filter(t => new Date(t.timestamp) >= cutoff);
  }, [trades]);

  const selectedPnl = useMemo(() => {
    return recentTrades
      .filter(t => selectedTradeIds.includes(t.id || `${t.symbol}-${t.timestamp}`))
      .filter(t => t.pnl !== null)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [recentTrades, selectedTradeIds]);

  // Check if today already has an entry
  const todayHasEntry = entries.some(e => e.date === today);

  const toggleTrade = (tradeId: string) => {
    setSelectedTradeIds(prev =>
      prev.includes(tradeId) ? prev.filter(t => t !== tradeId) : [...prev, tradeId]
    );
  };

  const handleSaveEntry = () => {
    if (!note.trim() && selectedTradeIds.length === 0) {
      toast.error('Escreve algo ou seleciona trades');
      return;
    }

    const associatedTrades = recentTrades.filter(t =>
      selectedTradeIds.includes(t.id || `${t.symbol}-${t.timestamp}`)
    );

    const entry: JournalEntry = {
      id: Date.now().toString(36),
      date: today,
      note,
      trades: associatedTrades,
      selectedTradeIds,
      pnl: selectedPnl,
      createdAt: new Date().toISOString(),
    };

    // Replace if today already has entry, otherwise add
    const updated = todayHasEntry
      ? entries.map(e => e.date === today ? entry : e)
      : [entry, ...entries];

    saveEntries(updated);
    setNote('');
    setSelectedTradeIds([]);
    setIsWriting(false);
    toast.success('Entrada guardada');
  };

  const confirmDeleteEntry = () => {
    if (!deleteTarget) return;
    saveEntries(entries.filter(e => e.id !== deleteTarget));
    setDeleteTarget(null);
    toast.success('Entrada removida');
  };

  if (isPending || loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Journal</h1>
            <p className="text-sm text-muted-foreground">Regista notas sobre o teu dia de trading</p>
          </div>
          {!isWriting && (
            <Button size="sm" onClick={() => setIsWriting(true)}>
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Escrever
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Today's summary */}
      <FadeIn delay={0.05}>
        <div className="border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Hoje</p>
            <p className="text-sm font-medium mt-0.5">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-px">
            <div className="flex-1 px-5 py-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Trades</p>
              <p className="text-lg font-semibold font-display mt-0.5">{todayTrades.length}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex-1 px-5 py-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Compras</p>
              <p className="text-lg font-semibold font-display mt-0.5">{todayTrades.filter(t => t.side === 'buy').length}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex-1 px-5 py-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Vendas</p>
              <p className="text-lg font-semibold font-display mt-0.5">{todayTrades.filter(t => t.side === 'sell').length}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Write new entry */}
      {isWriting && (
        <FadeIn>
          <div className="border border-foreground/20 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Nova entrada</p>
              <button onClick={() => setIsWriting(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
            </div>

            {/* Note */}
            <Textarea
              placeholder="O que aprendeste hoje? Que decisões tomaste? O que farias diferente?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="resize-none"
            />

            {/* Trade selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Associar trades (últimos 30 dias)</p>
                {selectedTradeIds.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{selectedTradeIds.length} selecionada{selectedTradeIds.length > 1 ? 's' : ''}</span>
                )}
              </div>
              {recentTrades.length === 0 ? (
                <div className="p-6 border border-border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Sem trades recentes</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Sincroniza as tuas integrações primeiro</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {recentTrades.slice(0, 30).map((trade) => {
                    const tradeId = trade.id || `${trade.symbol}-${trade.timestamp}`;
                    const isSelected = selectedTradeIds.includes(tradeId);
                    return (
                      <button
                        key={tradeId}
                        onClick={() => toggleTrade(tradeId)}
                        className={`w-full flex items-center gap-3 p-2.5 border text-left transition-all ${
                          isSelected
                            ? 'border-foreground bg-muted/50'
                            : 'border-border hover:border-border/80 hover:bg-muted/20'
                        }`}
                      >
                        <div className={`w-1 h-8 shrink-0 ${trade.side === 'buy' ? 'bg-foreground' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{trade.symbol}</span>
                            <span className={`text-[9px] px-1 py-0.5 ${trade.side === 'buy' ? 'bg-muted text-foreground' : 'bg-red-500/10 text-red-500'}`}>
                              {trade.side === 'buy' ? 'COMPRA' : 'VENDA'}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(trade.timestamp).toLocaleDateString('pt-PT')}
                            {trade.exchange && ` · ${trade.exchange}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px]">{trade.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                          <p className="text-[10px] text-muted-foreground">@ {formatValue(trade.price)}</p>
                        </div>
                        <div className={`w-5 h-5 border shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-foreground border-foreground' : 'border-border'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleSaveEntry} className="w-full">
              Guardar entrada{selectedTradeIds.length > 0 ? ` (${selectedTradeIds.length} trades)` : ''}
            </Button>
          </div>
        </FadeIn>
      )}

      {/* Journal entries */}
      {entries.length === 0 && !isWriting ? (
        <FadeIn delay={0.1}>
          <div className="border border-border bg-card">
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <p className="text-sm font-medium mb-1">O teu diário está vazio</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                Mantém um registo das tuas decisões de trading. Anota o que correu bem, o que aprendeste, e acompanha o teu progresso ao longo do tempo.
              </p>
              <Button size="sm" onClick={() => setIsWriting(true)}>Começar a escrever</Button>
            </div>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const dayTrades = entry.trades?.length > 0 ? entry.trades : (tradesByDay.get(entry.date) || []);
            const buys = dayTrades.filter(t => t.side === 'buy').length;
            const sells = dayTrades.filter(t => t.side === 'sell').length;

            return (
              <FadeIn key={entry.id}>
                <div className="border border-border bg-card">
                  {/* Date header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {new Date(entry.date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>{dayTrades.length} trades</span>
                        <span>{buys}C · {sells}V</span>
                        {entry.pnl !== 0 && (
                          <span className={entry.pnl >= 0 ? 'text-foreground' : 'text-red-500'}>
                            {entry.pnl >= 0 ? '+' : ''}{formatValue(entry.pnl)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(entry.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label="Remover entrada do diário"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {/* Note */}
                  {entry.note && (
                    <div className="px-5 py-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                    </div>
                  )}

                  {/* Trade summary */}
                  {dayTrades.length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="space-y-1">
                        {dayTrades.slice(0, 5).map((trade, i) => (
                          <div key={trade.id || i} className="flex items-center gap-3 p-2 bg-muted/30">
                            <div className={`w-1 h-6 shrink-0 ${trade.side === 'buy' ? 'bg-foreground' : 'bg-red-500'}`} />
                            <span className="text-xs font-medium">{trade.symbol}</span>
                            <span className={`text-[9px] ${trade.side === 'buy' ? 'text-foreground' : 'text-red-500'}`}>
                              {trade.side === 'buy' ? 'COMPRA' : 'VENDA'}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatValue(trade.cost)}
                            </span>
                            {trade.pnl !== null && (
                              <span className={`text-[10px] font-medium ${trade.pnl >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{formatValue(trade.pnl)}
                              </span>
                            )}
                          </div>
                        ))}
                        {dayTrades.length > 5 && (
                          <p className="text-[10px] text-muted-foreground text-center py-1">
                            +{dayTrades.length - 5} trades
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}

      {/* Trading days without entries — suggest journaling */}
      {tradingDays.length > 0 && entries.length > 0 && (
        <FadeIn delay={0.15}>
          <div className="border border-border bg-card p-5">
            <p className="text-xs font-medium mb-3">Dias sem anotações</p>
            <div className="flex flex-wrap gap-2">
              {tradingDays
                .filter(day => !entries.some(e => e.date === day))
                .slice(0, 10)
                .map(day => (
                  <div key={day} className="text-[10px] px-2.5 py-1.5 bg-muted text-muted-foreground">
                    {new Date(day).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                    <span className="ml-1.5 text-foreground/50">
                      {tradesByDay.get(day)?.length || 0} trades
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover entrada</DialogTitle>
            <DialogDescription>
              Tens a certeza que queres remover esta entrada do diário? Esta ação não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
