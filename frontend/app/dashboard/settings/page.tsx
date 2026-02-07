'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSession, signOut } from '@/lib/auth-client';
import { useCurrency } from '@/app/providers';
import { useTheme } from 'next-themes';
import { useNotifications } from '@/lib/notifications';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { currency, setCurrency } = useCurrency();
  const { theme, setTheme } = useTheme();
  const { isSupported, isGranted, isDenied, requestPermission } = useNotifications();
  const [loading, setLoading] = useState(true);
  
  // Password change
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Notifications — persisted in localStorage
  const [notificationSettings, setNotificationSettings] = useState({
    priceAlerts: true,
    portfolioUpdates: true,
  });

  // Load persisted notification settings
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('converge-notification-prefs');
      if (saved) setNotificationSettings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/sign-in');
      return;
    }
    setLoading(false);
  }, [session, isPending, router]);

  const [signingOut, setSigningOut] = useState(false);
  const [enablingNotifs, setEnablingNotifs] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/sign-in');
    } finally {
      setSigningOut(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password deve ter pelo menos 8 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password alterada com sucesso');
        setPasswordDialogOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao alterar password');
      }
    } catch (error) {
      toast.error('Erro ao alterar password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnableNotifications = async () => {
    setEnablingNotifs(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Notificações ativadas');
      } else {
        toast.error('Permissão negada');
      }
    } finally {
      setEnablingNotifs(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div>
          <h1 className="text-xl font-medium tracking-tight">Definições</h1>
          <p className="text-sm text-muted-foreground">Conta e preferências</p>
        </div>
      </FadeIn>

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conta</h2>
        
        <div className="p-4 border border-border bg-card space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm">{session?.user?.email}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <p className="text-sm">{session?.user?.name || '—'}</p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Segurança</h2>
        
        <div className="p-4 border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Alterar password de acesso</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
              Alterar
            </Button>
          </div>
        </div>

        <TwoFactorSetup 
          isEnabled={!!session?.user?.twoFactorEnabled}
          onStatusChange={() => window.location.reload()}
        />
      </section>

      {/* Preferences */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Preferências</h2>
        
        <div className="p-4 border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Moeda</p>
              <p className="text-xs text-muted-foreground">Moeda de exibição</p>
            </div>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'USD' | 'EUR' | 'BTC')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="h-px bg-border" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">Aparência da interface</p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notificações</h2>
        
        <div className="p-4 border border-border bg-card space-y-4">
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">Browser não suporta notificações.</p>
          ) : isDenied ? (
            <p className="text-sm text-muted-foreground">Notificações bloqueadas. Ativa nas definições do browser.</p>
          ) : !isGranted ? (
            <div className="flex items-center justify-between">
              <p className="text-sm">Ativar notificações push</p>
              <Button size="sm" onClick={handleEnableNotifications} disabled={enablingNotifs}>
                {enablingNotifs ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Ativar'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm">Alertas de preço</p>
                <Switch 
                  checked={notificationSettings.priceAlerts}
                  onCheckedChange={(c) => { const next = {...notificationSettings, priceAlerts: c}; setNotificationSettings(next); localStorage.setItem('converge-notification-prefs', JSON.stringify(next)); }}
                />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <p className="text-sm">Atualizações do portfolio</p>
                <Switch 
                  checked={notificationSettings.portfolioUpdates}
                  onCheckedChange={(c) => { const next = {...notificationSettings, portfolioUpdates: c}; setNotificationSettings(next); localStorage.setItem('converge-notification-prefs', JSON.stringify(next)); }}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-4">
        <Button variant="outline" onClick={handleSignOut} disabled={signingOut} className="w-full">
          {signingOut ? <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : 'Terminar sessão'}
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Eliminar conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Todos os teus dados serão eliminados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                try {
                  const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
                  if (res.ok) {
                    toast.success('Conta eliminada');
                    router.push('/');
                  } else {
                    const data = await res.json();
                    toast.error(data.error || 'Erro ao eliminar conta');
                  }
                } catch {
                  toast.error('Erro ao eliminar conta');
                }
              }}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Password</DialogTitle>
            <DialogDescription>
              Introduz a password atual e a nova password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password atual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nova password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'A alterar...' : 'Alterar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
