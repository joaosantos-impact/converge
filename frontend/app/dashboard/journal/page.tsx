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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  const { formatValue, formatPrice } = useCurrency();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  // Use React Query for trades (shared cache across pages)
  const { data: tradesData, isLoading: tradesLoading, error: tradesError } = useTrades(90);
  const trades = useMemo(() => tradesData?.trades || [], [tradesData]);
  const loading = tradesLoading;

  // New entry form
  const [isWriting, setIsWriting] = useState(false);
  const [note, setNote] = useState('');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Filters for entries list
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'with_note' | 'with_trades'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for trade selector (when writing entry)
  const [tradeFilterSymbol, setTradeFilterSymbol] = useState('');
  const [tradeFilterSide, setTradeFilterSide] = useState<'all' | 'buy' | 'sell'>('all');

  // View: calendar (default) or list
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayLabel = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

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
    if (tradesError) toast.error(tradesError.message || 'Erro ao carregar trades');
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

  // Filter entries by date, type, search and sort
  const filteredEntries = useMemo(() => {
    let list = [...entries];
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(e => new Date(e.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(e => new Date(e.date) <= to);
    }
    if (typeFilter === 'with_note') list = list.filter(e => (e.note?.trim() ?? '').length > 0);
    if (typeFilter === 'with_trades') list = list.filter(e => (e.trades?.length ?? 0) > 0);
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(e => (e.note ?? '').toLowerCase().includes(q));
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'newest' ? db - da : da - db;
    });
    return list;
  }, [entries, dateFrom, dateTo, typeFilter, sortOrder, searchQuery]);

  // Filter trades in selector by symbol and side
  const filteredRecentTrades = useMemo(() => {
    let list = recentTrades;
    const sym = tradeFilterSymbol.trim().toUpperCase();
    if (sym) list = list.filter(t => (t.symbol ?? '').toUpperCase().includes(sym));
    if (tradeFilterSide !== 'all') list = list.filter(t => t.side === tradeFilterSide);
    return list;
  }, [recentTrades, tradeFilterSymbol, tradeFilterSide]);

  // Entries grouped by date (for calendar)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [entries]);

  // Calendar grid: weeks, each week = 7 days. Monday = first column.
  const calendarWeeks = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const daysInMonth = last.getDate();
    // Monday = 0: getDay() 0=Sun->6, 1=Mon->0, ...
    const firstWeekday = (first.getDay() + 6) % 7;
    const leading = firstWeekday;
    const total = leading + daysInMonth;
    const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
    const prevMonthLast = new Date(y, m, 0).getDate();
    const days: Array<{ dateStr: string; day: number; isCurrentMonth: boolean; entries: JournalEntry[] }> = [];
    for (let i = 0; i < leading; i++) {
      const d = Math.max(1, prevMonthLast - leading + 1 + i);
      const date = new Date(y, m - 1, d);
      const dateStrNorm = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      days.push({ dateStr: dateStrNorm, day: date.getDate(), isCurrentMonth: false, entries: entriesByDate.get(dateStrNorm) ?? [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, day: d, isCurrentMonth: true, entries: entriesByDate.get(dateStr) ?? [] });
    }
    const nextMonthDays = trailing;
    for (let d = 1; d <= nextMonthDays; d++) {
      const date = new Date(y, m + 1, d);
      const dateStrNorm = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      days.push({ dateStr: dateStrNorm, day: d, isCurrentMonth: false, entries: entriesByDate.get(dateStrNorm) ?? [] });
    }
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [calendarMonth, entriesByDate]);

  // For calendar: which days have (filtered) entries
  const filteredEntriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of filteredEntries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [filteredEntries]);

  const selectedDateEntries = selectedDate ? (filteredEntriesByDate.get(selectedDate) ?? []) : [];

  const selectedPnl = useMemo(() => {
    return recentTrades
      .filter(t => selectedTradeIds.includes(t.id || `${t.symbol}-${t.timestamp}`))
      .filter(t => t.pnl !== null)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [recentTrades, selectedTradeIds]);

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

    // Always add new entry (multiple entries per day allowed)
    saveEntries([entry, ...entries]);
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
      <div className="space-y-6 w-full">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Journal</h1>
            <p className="text-sm text-muted-foreground">Regista notas sobre o teu dia de trading</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-md" role="group" aria-label="Vista">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                aria-pressed={viewMode === 'calendar'}
                className={`px-3 py-1.5 text-xs font-medium transition-colors rounded ${viewMode === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Calendário
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`px-3 py-1.5 text-xs font-medium transition-colors rounded ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Lista
              </button>
            </div>
            {!isWriting && (
              <Button size="sm" onClick={() => setIsWriting(true)}>
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Escrever
              </Button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Filters — mesma linha que Futuros/Spot */}
      {entries.length > 0 && (
        <FadeIn delay={0.03}>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[7.25rem] shrink-0 text-xs [&::-webkit-date-and-time-value]:text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[7.25rem] shrink-0 text-xs [&::-webkit-date-and-time-value]:text-xs"
            />
            <Select value={typeFilter} onValueChange={(v: 'all' | 'with_note' | 'with_trades') => setTypeFilter(v)}>
              <SelectTrigger className="min-w-[140px] h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="with_note">Só com nota</SelectItem>
                <SelectItem value="with_trades">Só com trades</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v: 'newest' | 'oldest') => setSortOrder(v)}>
              <SelectTrigger className="min-w-[140px] h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigas</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="search"
              placeholder="Procurar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 min-w-[140px] max-w-[180px]"
            />
            {(dateFrom || dateTo || typeFilter !== 'all' || sortOrder !== 'newest' || searchQuery.trim()) && (
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setSortOrder('newest'); setSearchQuery(''); }}>
                Limpar
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-1">{filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''}</span>
          </div>
        </FadeIn>
      )}

      {/* Today's summary */}
      <FadeIn delay={0.05}>
        <div className="border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Hoje</p>
            <p className="text-sm font-medium mt-0.5">
              {todayLabel || '\u00A0'}
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
              {/* Filters for trade list */}
              {recentTrades.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Filtrar por par (ex: BTC)"
                    value={tradeFilterSymbol}
                    onChange={(e) => setTradeFilterSymbol(e.target.value)}
                    className="h-8 text-xs max-w-[140px]"
                  />
                  <Select value={tradeFilterSide} onValueChange={(v: 'all' | 'buy' | 'sell') => setTradeFilterSide(v)}>
                    <SelectTrigger className="h-8 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="buy">Compras</SelectItem>
                      <SelectItem value="sell">Vendas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {recentTrades.length === 0 ? (
                <div className="p-6 border border-border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Sem trades recentes</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Sincroniza as tuas integrações primeiro</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {filteredRecentTrades.slice(0, 50).map((trade) => {
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
                        <div className="w-1 h-8 shrink-0 bg-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{trade.symbol}</span>
                            <span className="text-[9px] px-1 py-0.5 bg-muted text-foreground">
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
                          <p className="text-[10px] text-muted-foreground">@ {formatPrice(trade.price)}</p>
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

      {/* Calendar view (default) */}
      {viewMode === 'calendar' && (
        <FadeIn delay={0.03}>
          <div className="border border-border bg-card overflow-hidden shadow-sm ring-1 ring-border/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Mês anterior"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                  {calendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Mês seguinte"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  setCalendarMonth(new Date(t.getFullYear(), t.getMonth(), 1));
                  setSelectedDate(t.toISOString().slice(0, 10));
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Hoje
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-px text-center text-[10px] text-muted-foreground font-medium mb-1">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarWeeks.flat().map((cell, cellIndex) => {
                  const isToday = cell.dateStr === today;
                  const isSelected = cell.dateStr === selectedDate;
                  const hasEntries = (filteredEntriesByDate.get(cell.dateStr) ?? []).length > 0;
                  return (
                    <button
                      key={`cal-${calendarMonth.getTime()}-${cellIndex}`}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`min-h-[44px] sm:min-h-[52px] rounded-md flex flex-col items-center justify-center transition-colors ${
                        !cell.isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'
                      } ${isSelected ? 'bg-foreground text-background' : 'hover:bg-muted'} ${isToday && !isSelected ? 'ring-1 ring-foreground/30' : ''}`}
                    >
                      <span className={`text-sm font-medium tabular-nums ${isSelected ? '!text-background' : ''}`}>{cell.day}</span>
                      {hasEntries && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-background' : 'bg-foreground/60'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Selected day detail */}
          {selectedDate && (
            <div className="mt-3 border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium capitalize">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>
              {selectedDateEntries.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Sem entradas neste dia</p>
                  {selectedDate === today && (
                    <Button size="sm" variant="outline" onClick={() => setIsWriting(true)}>Escrever entrada</Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEntries.map((entry) => {
                    const dayTrades = entry.trades?.length > 0 ? entry.trades : (tradesByDay.get(entry.date) || []);
                    return (
                      <div key={entry.id} className="border border-border rounded-lg overflow-hidden">
                        {entry.note && (
                          <div className="px-4 py-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                          </div>
                        )}
                        {dayTrades.length > 0 && (
                          <div className="px-4 pb-3 space-y-1">
                            {dayTrades.slice(0, 5).map((trade, i) => (
                              <div key={trade.id || i} className="flex items-center gap-2 py-1.5 text-xs">
                                <div className="w-1 h-4 shrink-0 bg-foreground" />
                                <span className="font-medium">{trade.symbol}</span>
                                <span className="text-muted-foreground">{trade.side === 'buy' ? 'C' : 'V'}</span>
                                <span className="ml-auto text-muted-foreground">{formatValue(trade.cost)}</span>
                                {trade.pnl != null && (
                                  <span className={trade.pnl >= 0 ? 'text-foreground' : 'text-red-500'}>
                                    {trade.pnl >= 0 ? '+' : ''}{formatValue(trade.pnl)}
                                  </span>
                                )}
                              </div>
                            ))}
                            {dayTrades.length > 5 && (
                              <p className="text-[10px] text-muted-foreground">+{dayTrades.length - 5} trades</p>
                            )}
                          </div>
                        )}
                        <div className="px-4 py-2 border-t border-border flex justify-end">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry.id)}
                            className="text-[10px] text-muted-foreground hover:text-destructive"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </FadeIn>
      )}

      {/* Journal entries (list view only) */}
      {viewMode === 'list' && entries.length === 0 && !isWriting ? (
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
      ) : viewMode === 'list' && filteredEntries.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="border border-border bg-card p-12 text-center">
            <p className="text-sm font-medium mb-1">Nenhuma entrada corresponde aos filtros</p>
            <p className="text-xs text-muted-foreground mb-4">Ajusta os filtros ou limpa para ver todas.</p>
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setSortOrder('newest'); setSearchQuery(''); }}>
              Limpar filtros
            </Button>
          </div>
        </FadeIn>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
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
                            <div className="w-1 h-6 shrink-0 bg-foreground" />
                            <span className="text-xs font-medium">{trade.symbol}</span>
                            <span className="text-[9px] text-foreground">
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
      ) : null}

      {/* Trading days without entries (list view only) */}
      {viewMode === 'list' && tradingDays.length > 0 && entries.length > 0 && (
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
