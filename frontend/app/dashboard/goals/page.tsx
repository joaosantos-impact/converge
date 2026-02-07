'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { usePortfolio } from '@/hooks/use-portfolio';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';

interface Goal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  createdAt: string;
}

const STORAGE_KEY = 'converge-goals';

export default function GoalsPage() {
  const { data: session, isPending } = useSession();
  const { formatValue, currency } = useCurrency();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetValue: '', deadline: '' });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Use React Query for portfolio data (shared cache across pages)
  const { data: portfolioData } = usePortfolio({ perPage: 200 });
  const portfolioValue = portfolioData?.totalValue || 0;

  const currencyLabel = currency === 'EUR' ? 'EUR' : currency === 'BTC' ? 'BTC' : 'USD';
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'BTC' ? '₿' : '$';

  // Avoid Date.now() during render (purity) — update once per minute
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setGoals(JSON.parse(saved));
    } catch { /* empty */ }
    setLoading(false);
  }, [session, isPending, router]);

  const saveGoals = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGoals));
  };

  const handleCreateGoal = () => {
    if (!newGoal.name || !newGoal.targetValue) {
      toast.error('Preenche o nome e o valor alvo');
      return;
    }
    const target = parseFloat(newGoal.targetValue);
    if (isNaN(target) || target <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(36),
      name: newGoal.name,
      targetValue: target,
      currentValue: portfolioValue,
      deadline: newGoal.deadline || undefined,
      createdAt: new Date().toISOString(),
    };

    saveGoals([...goals, goal]);
    setNewGoal({ name: '', targetValue: '', deadline: '' });
    setDialogOpen(false);
    toast.success('Objetivo criado');
  };

  const confirmDeleteGoal = () => {
    if (!deleteTarget) return;
    saveGoals(goals.filter(g => g.id !== deleteTarget));
    setDeleteTarget(null);
    toast.success('Objetivo removido');
  };

  // Update current values when portfolio value changes (intentionally omit goals from deps to avoid overwriting on every edit)
  useEffect(() => {
    if (portfolioValue > 0 && goals.length > 0) {
      const updated = goals.map(g => ({ ...g, currentValue: portfolioValue }));
      setGoals(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goals read only to sync currentValue when portfolioValue changes
  }, [portfolioValue]);

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Objetivos</h1>
            <p className="text-sm text-muted-foreground">Define metas para o teu portfolio</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            Novo Objetivo
          </Button>
        </div>
      </FadeIn>

      {/* Current portfolio value */}
      <FadeIn delay={0.05}>
        <div className="border border-border bg-card p-5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Valor Atual do Portfolio</p>
          <p className="text-3xl font-semibold font-display mt-1">{formatValue(portfolioValue)}</p>
        </div>
      </FadeIn>

      {/* Goals list */}
      <FadeIn delay={0.1}>
        {goals.length === 0 ? (
          <div className="border border-border bg-card">
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <p className="text-sm font-medium mb-1">Sem objetivos definidos</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                Define metas como &quot;Portfolio a 10.000{currencySymbol}&quot; ou &quot;Acumular 1 BTC&quot; para acompanhar o teu progresso.
              </p>
              <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline">
                Criar primeiro objetivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
              const remaining = Math.max(goal.targetValue - goal.currentValue, 0);
              const isCompleted = goal.currentValue >= goal.targetValue;
              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - now) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={goal.id} className={`border bg-card p-5 ${isCompleted ? 'border-foreground/30' : 'border-border'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{goal.name}</h3>
                        {isCompleted && (
                          <span className="text-[9px] px-2 py-0.5 bg-foreground text-background font-medium uppercase tracking-wider">
                            Concluído
                          </span>
                        )}
                      </div>
                      {daysLeft !== null && !isCompleted && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteTarget(goal.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={`Remover objetivo ${goal.name}`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="h-2 bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold font-display">{progress.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">
                          {formatValue(goal.currentValue)} / {formatValue(goal.targetValue)}
                        </span>
                      </div>
                      {!isCompleted && (
                        <span className="text-xs text-muted-foreground">
                          Falta {formatValue(remaining)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Create goal dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Objetivo</DialogTitle>
            <DialogDescription>
              Define uma meta para acompanhar o progresso do teu portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do objetivo</Label>
              <Input
                placeholder={`Ex: Portfolio a 10.000${currencySymbol}`}
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor alvo ({currencyLabel})</Label>
              <Input
                type="number"
                placeholder="10000"
                value={newGoal.targetValue}
                onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                className="block"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateGoal}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover objetivo</DialogTitle>
            <DialogDescription>
              Tens a certeza que queres remover este objetivo? Esta ação não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteGoal}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
