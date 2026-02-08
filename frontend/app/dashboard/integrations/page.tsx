'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAutoSync } from '@/hooks/use-auto-sync';
import {
  useExchangeAccounts,
  useInvalidateExchangeAccounts,
  useExchangeAccountDetails,
  type ExchangeAccount,
} from '@/hooks/use-exchange-accounts';
import { EXCHANGE_INTEGRATIONS, type Integration } from '@/lib/integrations';
import { IntegrationIcon, hasIcon } from '@/components/IntegrationIcons';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';


/* ─── Eye Icon SVGs ─── */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/* ─── Masked Field with Toggle ─── */
function MaskedField({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  const masked = '••••••••••••••••';

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted px-3 py-2 text-sm font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap">
          {visible ? value : masked}
        </div>
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="p-2 hover:bg-muted transition-colors shrink-0"
          aria-label={visible ? 'Esconder' : 'Mostrar'}
        >
          {visible ? (
            <EyeOffIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Integration Details Panel (for connected accounts) ─── */
function IntegrationDetails({
  account,
  integration,
  onClose,
  onDelete,
}: {
  account: ExchangeAccount;
  integration: Integration;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { data: details, isLoading } = useExchangeAccountDetails(account.id);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const invalidateAccounts = useInvalidateExchangeAccounts();
  const { syncing, canSync, triggerSync } = useAutoSync();

  const handleSync = async () => {
    const { ok, error } = await triggerSync();
    if (ok) {
      toast.success('Sincronização concluída');
      invalidateAccounts();
    } else {
      toast.error(error || 'Erro ao sincronizar');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/exchange-accounts?id=${account.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Integração removida');
        setDeleteConfirmOpen(false);
        onDelete();
      } else {
        toast.error('Erro ao remover');
      }
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center gap-4">
        {hasIcon(integration.id) ? (
          <div className="w-12 h-12 shrink-0"><IntegrationIcon id={integration.id} size={48} /></div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: integration.color }}>
            {integration.letter}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium">{account.name}</p>
          <p className="text-xs text-muted-foreground">{integration.name}</p>
        </div>
        <div className="ml-auto">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium ${account.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            {account.isActive ? 'Ativa' : 'Inativa'}
          </div>
        </div>
      </div>

      {/* Credentials */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : details ? (
        <div className="space-y-3">
          <MaskedField label="API Key" value={details.apiKeyPreview} />
          <MaskedField label="API Secret" value={details.apiSecretPreview} />
          {details.hasPassphrase && details.apiPassphrasePreview && (
            <MaskedField label="Passphrase" value={details.apiPassphrasePreview} />
          )}
        </div>
      ) : null}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-muted">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Última Sync</p>
          <p className="text-xs font-medium">{formatDate(account.lastSyncAt)}</p>
        </div>
        <div className="p-3 bg-muted">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Criada em</p>
          <p className="text-xs font-medium">{formatDate(account.createdAt ?? null)}</p>
        </div>
      </div>

      {/* Security note */}
      <div className="p-3 bg-muted">
        <p className="font-medium text-[10px] uppercase tracking-wider mb-1">Segurança</p>
        <p className="text-[11px] text-muted-foreground">
          As credenciais são parcialmente visíveis por segurança. Os valores completos são encriptados com AES-256-GCM.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Fechar
        </Button>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing || !canSync}
          className="flex-1"
          title={!canSync ? 'Aguarda o cooldown antes de sincronizar' : undefined}
        >
          {syncing ? (
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground animate-spin" />
          ) : 'Sincronizar'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={deleting}
          className="px-4"
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          )}
        </Button>
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover integração?</AlertDialogTitle>
              <AlertDialogDescription>
                A conta &quot;{account.name}&quot; ({integration.name}) será removida. Os saldos e histórico de trades associados deixarão de ser sincronizados. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                disabled={deleting}
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" />
                ) : (
                  'Remover'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ─── Add Integration Form ─── */
function IntegrationForm({ integration, onSuccess, onCancel }: { integration: Integration; onSuccess: () => void; onCancel: () => void }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', apiKey: '', apiSecret: '', apiPassphrase: '', address: '' });

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Introduz um nome'); return; }
    if (integration.requiresApiKey && !form.apiKey) { toast.error('API Key é obrigatório'); return; }
    if (integration.requiresApiSecret && !form.apiSecret) { toast.error('API Secret é obrigatório'); return; }
    if (integration.requiresPassphrase && !form.apiPassphrase) { toast.error('Passphrase é obrigatório'); return; }
    if (integration.requiresAddress && !form.address) { toast.error('Endereço é obrigatório'); return; }

    setCreating(true);
    try {
      const response = await fetch('/api/exchange-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, exchange: integration.id,
          apiKey: form.apiKey || form.address || 'wallet-address',
          apiSecret: form.apiSecret || 'n/a',
          apiPassphrase: form.apiPassphrase || undefined,
          walletAddress: form.address || undefined,
          integrationType: integration.type,
        }),
      });
      if (response.ok) {
        toast.success(`${integration.name} adicionado com sucesso`);
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao adicionar');
      }
    } catch { toast.error('Erro ao adicionar'); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header with icon */}
      <div className="flex items-center gap-4">
        {hasIcon(integration.id) ? (
          <div className="w-12 h-12 shrink-0"><IntegrationIcon id={integration.id} size={48} /></div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: integration.color }}>
            {integration.letter}
          </div>
        )}
        <div>
          <p className="font-medium">{integration.name}</p>
          <p className="text-xs text-muted-foreground">{integration.description}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={`Ex: ${integration.name} Principal`} />
        </div>

        {integration.requiresApiKey && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Input value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder="Chave pública da API" />
          </div>
        )}

        {integration.requiresApiSecret && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Secret</Label>
            <Input type="password" value={form.apiSecret} onChange={e => setForm({ ...form, apiSecret: e.target.value })} placeholder="Chave secreta" />
          </div>
        )}

        {integration.requiresPassphrase && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Passphrase</Label>
            <Input type="password" value={form.apiPassphrase} onChange={e => setForm({ ...form, apiPassphrase: e.target.value })} placeholder="Passphrase da API" />
          </div>
        )}

        {integration.requiresAddress && (
          <div className="space-y-1.5">
            <Label className="text-xs">Endereço</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="0x... / bc1... / endereco..." className="font-mono text-sm" />
            <p className="text-[10px] text-muted-foreground">Endereço público da wallet ou xpub</p>
          </div>
        )}

        {integration.requiresApiKey && (
          <div className="p-3 bg-muted">
            <p className="font-medium text-[10px] uppercase tracking-wider mb-1">Segurança</p>
            <p className="text-[11px] text-muted-foreground">Usa apenas API keys de leitura (read-only). As chaves são encriptadas com AES-256-GCM e nunca são partilhadas.</p>
          </div>
        )}

        {integration.docsUrl && (
          <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline inline-block">
            Como criar uma API key →
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={creating} className="flex-1">
          {creating ? (
            <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" />
          ) : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
function IntegrationsPageContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ExchangeAccount | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'details' | null>(null);

  const pollFast = searchParams.get('syncing') === '1';
  const { syncing } = useAutoSync({ pollFast });

  const { data: accountsData = [], error: accountsError } = useExchangeAccounts();
  const invalidateAccounts = useInvalidateExchangeAccounts();

  // Map of exchange id → connected accounts
  const accountsByExchange = useMemo(() => {
    const map = new Map<string, ExchangeAccount[]>();
    accountsData.forEach((a: ExchangeAccount) => {
      const existing = map.get(a.exchange) || [];
      existing.push(a);
      map.set(a.exchange, existing);
    });
    return map;
  }, [accountsData]);

  const connectedIds = useMemo(
    () => accountsData.map((a: ExchangeAccount) => a.exchange),
    [accountsData]
  );

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  useEffect(() => {
    if (accountsError) toast.error('Erro ao carregar integrações');
  }, [accountsError]);

  const handleSelect = useCallback((integration: Integration) => {
    const accounts = accountsByExchange.get(integration.id);
    if (accounts && accounts.length > 0) {
      // Connected — show details of the first account (or the most recent)
      setSelectedIntegration(integration);
      setSelectedAccount(accounts[0]);
      setDialogMode('details');
    } else {
      // Not connected — show add form
      setSelectedIntegration(integration);
      setSelectedAccount(null);
      setDialogMode('add');
    }
  }, [accountsByExchange]);

  const handleClose = useCallback(() => {
    setSelectedIntegration(null);
    setSelectedAccount(null);
    setDialogMode(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleClose();
    invalidateAccounts();
  }, [handleClose, invalidateAccounts]);

  const handleDelete = useCallback(() => {
    handleClose();
    invalidateAccounts();
  }, [handleClose, invalidateAccounts]);

  const filtered = EXCHANGE_INTEGRATIONS.filter((i) =>
    search ? i.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const connectedCount = connectedIds.length;

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  // Drawer / Dialog content
  const dialogContent = (() => {
    if (!selectedIntegration || !dialogMode) return null;

    if (dialogMode === 'details' && selectedAccount) {
      return (
        <IntegrationDetails
          account={selectedAccount}
          integration={selectedIntegration}
          onClose={handleClose}
          onDelete={handleDelete}
        />
      );
    }

    return (
      <IntegrationForm
        integration={selectedIntegration}
        onSuccess={handleSuccess}
        onCancel={handleClose}
      />
    );
  })();

  const dialogTitle = dialogMode === 'details' ? 'Detalhes da Integração' : 'Adicionar Integração';
  const dialogDescription = dialogMode === 'details' ? 'Informações e credenciais' : 'Configura a ligação';

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Integrações</h1>
            <p className="text-sm text-muted-foreground">Exchanges</p>
          </div>
          <div className="flex items-center gap-2">
            {connectedCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted">
                <div className="w-1.5 h-1.5 bg-foreground" />
                <span className="text-xs text-muted-foreground">{connectedCount} ligada{connectedCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Syncing banner when we just added an integration (hide when no accounts — e.g. last one removed) */}
      {syncing && connectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
          <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground animate-spin shrink-0" />
          <span className="text-sm text-muted-foreground">A sincronizar a nova integração…</span>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <Input placeholder="Procurar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 border border-border bg-card text-center">
          <p className="text-muted-foreground">Nenhuma integração encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((integration) => {
            const isConnected = connectedIds.includes(integration.id);
            return (
              <button
                key={integration.id}
                onClick={() => handleSelect(integration)}
                className="flex items-center gap-3 p-4 border border-border bg-card text-left transition-colors hover:bg-muted cursor-pointer group relative w-full"
              >
                {isConnected && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />}
                {hasIcon(integration.id) ? (
                  <div className="w-10 h-10 shrink-0"><IntegrationIcon id={integration.id} size={40} /></div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: integration.color }}>
                    {integration.letter}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{integration.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{integration.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Drawer (mobile) / Dialog (desktop) */}
      {isMobile ? (
        <Drawer open={!!dialogMode} onOpenChange={open => { if (!open) handleClose(); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{dialogTitle}</DrawerTitle>
              <DrawerDescription>{dialogDescription}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{dialogContent}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!dialogMode} onOpenChange={open => { if (!open) handleClose(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <IntegrationsPageContent />
    </Suspense>
  );
}
