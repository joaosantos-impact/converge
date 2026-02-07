'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { useSession } from '@/lib/auth-client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrency } from '@/app/providers';
import { usePortfolio } from '@/hooks/use-portfolio';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';

interface PriceAlert {
  id: string;
  asset: string;
  condition: 'above' | 'below';
  price: number;
  isActive: boolean;
  createdAt: string;
}

const POPULAR_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK'];

export default function AlertsPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAlert, setNewAlert] = useState({ asset: '', condition: 'above' as 'above' | 'below', targetPrice: '' });

  // Use React Query for portfolio data (shared cache across pages)
  const { data: portfolioData } = usePortfolio({ perPage: 200 });
  const portfolioAssets = useMemo(() => {
    const assets = portfolioData?.balances?.map((b: { asset: string }) => b.asset) || [];
    return [...new Set([...assets, ...POPULAR_ASSETS])].sort() as string[];
  }, [portfolioData]);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
    fetchAlerts().finally(() => setLoading(false));
  }, [session, isPending, router]);

  const fetchAlerts = async () => {
    try {
      const r = await fetch('/api/alerts');
      if (r.ok) setAlerts(await r.json());
      else toast.error('Erro ao carregar alertas');
    } catch {
      toast.error('Erro ao carregar alertas');
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.asset || !newAlert.targetPrice) { toast.error('Preenche todos os campos'); return; }
    const price = parseFloat(newAlert.targetPrice);
    if (isNaN(price) || price <= 0) { toast.error('Preço inválido'); return; }

    setCreating(true);
    try {
      const r = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: newAlert.asset, condition: newAlert.condition, targetPrice: price }),
      });
      if (r.ok) {
        toast.success('Alerta criado');
        setDialogOpen(false);
        setNewAlert({ asset: '', condition: 'above', targetPrice: '' });
        fetchAlerts();
      } else {
        const data = await r.json();
        toast.error(data.error || 'Erro ao criar alerta');
      }
    } catch { toast.error('Erro ao criar alerta'); }
    finally { setCreating(false); }
  };

  const handleToggleAlert = async (id: string, isActive: boolean) => {
    try {
      const r = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (r.ok) setAlerts(alerts.map(a => a.id === id ? { ...a, isActive: !isActive } : a));
    } catch { toast.error('Erro'); }
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const confirmDeleteAlert = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/alerts/${deleteTarget}`, { method: 'DELETE' });
      if (r.ok) { setAlerts(alerts.filter(a => a.id !== deleteTarget)); toast.success('Alerta eliminado'); }
    } catch { toast.error('Erro'); }
    finally { setDeleteTarget(null); }
  };

  // Form content
  const alertForm = (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Asset</Label>
        <Select value={newAlert.asset} onValueChange={(v) => setNewAlert({ ...newAlert, asset: v })}>
          <SelectTrigger><SelectValue placeholder="Selecionar asset" /></SelectTrigger>
          <SelectContent>
            {portfolioAssets.map(asset => <SelectItem key={asset} value={asset}>{asset}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Condição</Label>
        <Select value={newAlert.condition} onValueChange={(v) => setNewAlert({ ...newAlert, condition: v as 'above' | 'below' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="above">Acima de</SelectItem>
            <SelectItem value="below">Abaixo de</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Preço alvo (EUR)</Label>
        <Input type="number" value={newAlert.targetPrice} onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })} placeholder="0.00" step="0.01" min="0" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
        <Button onClick={handleCreateAlert} disabled={creating} className="flex-1">
          {creating ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Criar'}
        </Button>
      </div>
    </div>
  );

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
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Alertas</h1>
            <p className="text-sm text-muted-foreground">Notificações de preço</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>Criar Alerta</Button>
        </div>
      </FadeIn>

      {alerts.length === 0 ? (
        <div className="border border-border bg-card">
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <p className="text-sm font-medium mb-1">Sem alertas configurados</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Cria um alerta para seres notificado quando um asset atingir um preço específico. Funciona mesmo com o browser fechado.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>Criar primeiro alerta</Button>
          </div>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-4 p-4 bg-card">
              <div className={`w-2 h-8 ${alert.isActive ? 'bg-foreground' : 'bg-muted'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{alert.asset}</span>
                  <span className="text-xs text-muted-foreground">{alert.condition === 'above' ? 'acima de' : 'abaixo de'}</span>
                  <span className="font-medium text-sm">{formatValue(alert.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Criado em {new Date(alert.createdAt).toLocaleDateString('pt-PT')}</p>
              </div>
              <Switch checked={alert.isActive} onCheckedChange={() => handleToggleAlert(alert.id, alert.isActive)} />
              <button onClick={() => setDeleteTarget(alert.id)} className="text-xs text-muted-foreground hover:text-destructive" aria-label={`Eliminar alerta ${alert.asset}`}>Eliminar</button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Os alertas são verificados periodicamente. Serás notificado via push notification quando as condições forem atingidas.</p>

      {/* Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Criar Alerta</DrawerTitle>
              <DrawerDescription>Configura um alerta de preço</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{alertForm}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Alerta</DialogTitle>
              <DialogDescription>Configura um alerta de preço para um asset.</DialogDescription>
            </DialogHeader>
            {alertForm}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar alerta</DialogTitle>
            <DialogDescription>Tens a certeza que queres eliminar este alerta? Esta ação não pode ser revertida.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteAlert}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
