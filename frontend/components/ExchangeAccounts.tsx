'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Trash2, Key, Link2 } from 'lucide-react';
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
  { id: 'kraken', name: 'Kraken' },
  { id: 'okx', name: 'OKX' },
];

export function ExchangeAccounts() {
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    exchange: '',
    apiKey: '',
    apiSecret: '',
    apiPassphrase: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/exchange-accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/exchange-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Conta de exchange adicionada');
        setDialogOpen(false);
        setFormData({ name: '', exchange: '', apiKey: '', apiSecret: '', apiPassphrase: '' });
        fetchAccounts();
      } else {
        toast.error(data.error || 'Erro ao adicionar conta de exchange');
      }
    } catch {
      toast.error('Erro ao adicionar conta de exchange');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/exchange-accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Conta de exchange removida');
        fetchAccounts();
      } else {
        toast.error('Erro ao remover conta');
      }
    } catch {
      toast.error('Erro ao remover conta');
    }
  };

  const requiresPassphrase = formData.exchange === 'okx';

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exchanges</h1>
          <p className="text-sm text-muted-foreground">
            Manage your connected exchange accounts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Exchange
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Exchange Account</DialogTitle>
                <DialogDescription>
                  Connect a new exchange by providing your API credentials.
                  Use read-only API keys for security.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    placeholder="My Binance Account"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <select
                    id="exchange"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                    required
                  >
                    <option value="">Select an exchange</option>
                    {EXCHANGES.map((exchange) => (
                      <option key={exchange.id} value={exchange.id}>
                        {exchange.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Enter your API key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="Enter your API secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    required
                  />
                </div>

                {requiresPassphrase && (
                  <div className="space-y-2">
                    <Label htmlFor="apiPassphrase">API Passphrase</Label>
                    <Input
                      id="apiPassphrase"
                      type="password"
                      placeholder="Enter your API passphrase"
                      value={formData.apiPassphrase}
                      onChange={(e) => setFormData({ ...formData, apiPassphrase: e.target.value })}
                      required={requiresPassphrase}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Connecting...' : 'Connect Exchange'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No exchanges connected</h3>
            <p className="text-muted-foreground text-sm text-center mb-6 max-w-sm">
              Connect your first exchange account to start tracking your portfolio.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exchange
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted font-semibold text-sm uppercase">
                    {account.exchange.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{account.exchange}</span>
                      <span>•</span>
                      <span className="font-mono">****{account.apiKey.slice(-4)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security note */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-start gap-3 py-4">
          <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Security Tip</p>
            <p className="text-muted-foreground">
              Always use read-only API keys without withdrawal permissions. 
              Your credentials are encrypted and stored securely.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
