'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';
import { getIntegrationById } from '@/lib/integrations';
import { IntegrationIcon, hasIcon } from '@/components/IntegrationIcons';
import { toast } from 'sonner';

function AddIntegrationContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeId = searchParams.get('type');

  const integration = typeId ? getIntegrationById(typeId) : null;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    apiKey: '',
    apiSecret: '',
    apiPassphrase: '',
    address: '',
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/sign-in');
      return;
    }
    if (!integration) {
      router.push('/dashboard/integrations');
    }
  }, [session, isPending, router, integration]);

  const handleSubmit = async () => {
    if (!integration) return;

    // Validate
    if (!form.name) {
      toast.error('Introduz um nome');
      return;
    }

    if (integration.requiresApiKey && !form.apiKey) {
      toast.error('API Key é obrigatório');
      return;
    }
    if (integration.requiresApiSecret && !form.apiSecret) {
      toast.error('API Secret é obrigatório');
      return;
    }
    if (integration.requiresPassphrase && !form.apiPassphrase) {
      toast.error('Passphrase é obrigatório');
      return;
    }
    if (integration.requiresAddress && !form.address) {
      toast.error('Endereço é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/exchange-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          exchange: integration.id,
          apiKey: form.apiKey || form.address || 'wallet-address',
          apiSecret: form.apiSecret || 'n/a',
          apiPassphrase: form.apiPassphrase || undefined,
          walletAddress: form.address || undefined,
          integrationType: integration.type,
        }),
      });

      if (response.ok) {
        toast.success(`${integration.name} adicionado com sucesso`);
        router.push('/dashboard/integrations');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao adicionar');
      }
    } catch (error) {
      toast.error('Erro ao adicionar');
    } finally {
      setCreating(false);
    }
  };

  if (isPending || !integration) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard/integrations" className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        {hasIcon(integration.id) ? (
          <div className="w-14 h-14">
            <IntegrationIcon id={integration.id} size={56} />
          </div>
        ) : (
          <div
            className="w-14 h-14 flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: integration.color }}
          >
            {integration.letter}
          </div>
        )}
        <div>
          <h1 className="text-xl font-medium tracking-tight">{integration.name}</h1>
          <p className="text-sm text-muted-foreground">{integration.description}</p>
        </div>
      </div>

      {/* Form */}
      <div className="border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={`Ex: ${integration.name} Principal`}
          />
          <p className="text-xs text-muted-foreground">Nome para identificar esta ligação</p>
        </div>

        {/* API Key fields */}
        {integration.requiresApiKey && (
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="Chave pública da API"
            />
          </div>
        )}

        {integration.requiresApiSecret && (
          <div className="space-y-2">
            <Label>API Secret</Label>
            <Input
              type="password"
              value={form.apiSecret}
              onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
              placeholder="Chave secreta"
            />
          </div>
        )}

        {integration.requiresPassphrase && (
          <div className="space-y-2">
            <Label>API Passphrase</Label>
            <Input
              type="password"
              value={form.apiPassphrase}
              onChange={(e) => setForm({ ...form, apiPassphrase: e.target.value })}
              placeholder="Passphrase da API"
            />
          </div>
        )}

        {/* Wallet/Blockchain address */}
        {integration.requiresAddress && (
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="0x... / bc1... / endereco..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Endereço público da wallet ou xpub
            </p>
          </div>
        )}

        {/* Security note */}
        {integration.requiresApiKey && (
          <div className="p-3 bg-muted text-sm">
            <p className="font-medium text-xs uppercase tracking-wider mb-1">Segurança</p>
            <p className="text-xs text-muted-foreground">
              Usa apenas API keys de leitura (read-only). As chaves são encriptadas com AES-256-GCM 
              e nunca são partilhadas.
            </p>
          </div>
        )}

        {integration.docsUrl && (
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Como criar uma API key →
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/dashboard/integrations')} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={creating} className="flex-1">
          {creating ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

export default function AddIntegrationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    }>
      <AddIntegrationContent />
    </Suspense>
  );
}
