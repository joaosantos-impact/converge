'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useInvalidateExchangeAccounts } from '@/hooks/use-exchange-accounts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ExchangeAccount {
  id: string;
  name: string;
  exchange: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

const EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'mexc', name: 'MEXC' },
  { id: 'kucoin', name: 'KuCoin' },
  { id: 'okx', name: 'OKX' },
  { id: 'kraken', name: 'Kraken' },
  { id: 'coinbase', name: 'Coinbase' },
];

export default function ExchangesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { data: accounts = [], isLoading: loading, error } = useQuery<ExchangeAccount[]>({
    queryKey: ['exchange-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-accounts');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const queryClient = useQueryClient();
  const invalidateAccounts = useInvalidateExchangeAccounts();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Form
  const [form, setForm] = useState({
    name: '',
    exchange: '',
    apiKey: '',
    apiSecret: '',
    apiPassphrase: '',
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  useEffect(() => {
    if (error) toast.error('Erro ao carregar exchanges');
  }, [error]);

  const handleCreate = async () => {
    if (!form.name || !form.exchange || !form.apiKey || !form.apiSecret) {
      toast.error('Preenche todos os campos obrigatórios');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/exchange-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        toast.success('Exchange adicionada');
        setDialogOpen(false);
        setForm({ name: '', exchange: '', apiKey: '', apiSecret: '', apiPassphrase: '' });
        invalidateAccounts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao adicionar');
      }
    } catch {
      toast.error('Erro ao adicionar');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    try {
      const response = await fetch(`/api/exchange-accounts/${accountToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Exchange removida');
        invalidateAccounts();
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['trades'] });
      }
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const needsPassphrase = ['kucoin', 'okx'].includes(form.exchange);

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[300px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Exchanges</h1>
          <p className="text-sm text-muted-foreground">API keys de leitura</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Adicionar
        </Button>
      </div>

      {/* Notice */}
      <div className="p-4 border border-border bg-card">
        <p className="text-sm">
          <span className="font-medium">Apenas API de leitura.</span>{' '}
          <span className="text-muted-foreground">
            As chaves são encriptadas e usadas apenas para consultar saldos e histórico de trades.
          </span>
        </p>
      </div>

      {/* Accounts */}
      {accounts.length === 0 ? (
        <div className="p-12 border border-border bg-card text-center">
          <p className="text-muted-foreground mb-3">Sem exchanges ligadas</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Adicionar exchange
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <div key={account.id} className="border border-border bg-card">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 ${account.isActive ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAccountToDelete(account.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${account.name}`}
                  >
                    Remover
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{account.exchange}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>API: {account.apiKey.slice(0, 8)}...</span>
                  <span>{account.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Exchange</DialogTitle>
            <DialogDescription>
              Adiciona uma API key de leitura da tua exchange.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Binance Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Exchange</Label>
              <Select value={form.exchange} onValueChange={(v) => setForm({ ...form, exchange: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGES.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Chave pública"
              />
            </div>
            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input
                type="password"
                value={form.apiSecret}
                onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                placeholder="Chave secreta"
              />
            </div>
            {needsPassphrase && (
              <div className="space-y-2">
                <Label>API Passphrase</Label>
                <Input
                  type="password"
                  value={form.apiPassphrase}
                  onChange={(e) => setForm({ ...form, apiPassphrase: e.target.value })}
                  placeholder="Passphrase (obrigatório)"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover exchange?</AlertDialogTitle>
            <AlertDialogDescription>
              A API key será removida. Os dados sincronizados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
