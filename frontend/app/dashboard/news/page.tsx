'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSession } from '@/lib/auth-client';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';

// X (Twitter) logo
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const CURATED_SOURCES = [
  { handle: '@WatcherGuru', name: 'Watcher.Guru' },
  { handle: '@CryptoWhale', name: 'Crypto Whale' },
  { handle: '@whale_alert', name: 'Whale Alert' },
  { handle: '@CoinDesk', name: 'CoinDesk' },
];

export default function NewsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const loading = isPending;
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('news-notifications') === 'true',
  );

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/sign-in');
      return;
    }
  }, [session, isPending, router]);

  const toggleNotifications = async (checked: boolean) => {
    if (checked && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada pelo browser');
        return;
      }
    }
    setNotificationsEnabled(checked);
    localStorage.setItem('news-notifications', String(checked));
    toast.success(checked ? 'Notificações ativadas' : 'Notificações desativadas');
  };

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div>
          <h1 className="text-xl font-medium tracking-tight">Notícias</h1>
          <p className="text-sm text-muted-foreground">Feed curado de crypto</p>
        </div>
      </FadeIn>

      {/* Notifications toggle */}
      <FadeIn delay={0.05}>
        <div className="flex items-center justify-between p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <Label className="text-sm font-medium cursor-pointer">Notificações de notícias</Label>
              <p className="text-xs text-muted-foreground">Recebe alertas no browser quando houver notícias relevantes</p>
            </div>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
        </div>
      </FadeIn>

      {/* Coming soon */}
      <FadeIn delay={0.1}>
        <div className="p-8 border border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <XLogo className="h-6 w-6" />
            <span className="font-medium">Integração X</span>
            <span className="px-2 py-0.5 text-xs bg-muted">Em breve</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Estamos a trabalhar na integração com a API do X (Twitter) para trazer notícias 
            em tempo real das melhores fontes de crypto.
          </p>
          <p className="text-xs text-muted-foreground">
            O feed será curado pela equipa Converge para garantir qualidade e relevância.
          </p>
        </div>
      </FadeIn>

      {/* Sources */}
      <FadeIn delay={0.15}>
      <div className="p-4 border border-border bg-card">
        <p className="text-sm font-medium mb-4">Fontes curadas</p>
        <div className="grid gap-2 md:grid-cols-2">
          {CURATED_SOURCES.map((source) => (
            <div key={source.handle} className="flex items-center gap-3 p-3 bg-muted">
              <XLogo className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">{source.name}</p>
                <p className="text-xs text-muted-foreground">{source.handle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </FadeIn>

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        O feed será atualizado em tempo real assim que a integração estiver disponível.
      </p>
    </div>
  );
}
