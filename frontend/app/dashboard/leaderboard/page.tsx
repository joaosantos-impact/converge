'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from '@/lib/auth-client';
import { useLeaderboard, useInvalidateLeaderboard } from '@/hooks/use-leaderboard';
import { toast } from 'sonner';
import { FadeIn } from '@/components/animations';

export default function LeaderboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState<'all' | 'monthly'>('all');
  const [page, setPage] = useState(1);
  const [togglingParticipation, setTogglingParticipation] = useState(false);

  const { data: leaderboardData, isLoading: initialLoading, isFetching: fetching, error: leaderboardError } = useLeaderboard(period, page);
  const invalidateLeaderboard = useInvalidateLeaderboard();
  const rankings = leaderboardData?.rankings || [];
  const totalCount = leaderboardData?.totalCount ?? 0;
  const perPage = leaderboardData?.perPage ?? 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const [participating, setParticipating] = useState(false);

  // Sync participation state from server response
  useEffect(() => {
    if (leaderboardData && typeof leaderboardData.participating === 'boolean') {
      setParticipating(leaderboardData.participating);
    }
  }, [leaderboardData]);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  useEffect(() => {
    if (leaderboardError) toast.error(leaderboardError.message || 'Erro ao carregar leaderboard');
  }, [leaderboardError]);

  const [followingLoading, setFollowingLoading] = useState<string | null>(null);

  const handleFollow = async (targetUserId: string, isFollowing: boolean) => {
    setFollowingLoading(targetUserId);
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: isFollowing ? 'unfollow' : 'follow' }),
      });
      if (response.ok) {
        invalidateLeaderboard();
        toast.success(isFollowing ? 'Deixaste de seguir' : 'A seguir');
      }
    } catch { toast.error('Erro'); }
    finally { setFollowingLoading(null); }
  };

  const toggleParticipation = async (checked: boolean) => {
    setTogglingParticipation(true);
    // Optimistic update
    const prev = participating;
    setParticipating(checked);
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participate: checked }),
      });
      if (response.ok) {
        const data = await response.json();
        setParticipating(data.participating);
        toast.success(data.participating ? 'Entraste no leaderboard' : 'Saíste do leaderboard');
        // Refetch rankings to reflect change
        invalidateLeaderboard();
      } else {
        // Revert on failure
        setParticipating(prev);
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || 'Erro ao alterar participação');
      }
    } catch {
      setParticipating(prev);
      toast.error('Erro de rede ao alterar participação');
    } finally {
      setTogglingParticipation(false);
    }
  };

  if (isPending || initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-medium tracking-tight">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">Ranking dos traders</p>
            </div>
            {fetching && (
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Participar</span>
            <Switch
              checked={participating}
              onCheckedChange={toggleParticipation}
              disabled={togglingParticipation}
            />
          </div>
        </div>
      </FadeIn>

      {/* Period filter */}
      <div className="flex gap-1 p-1 bg-muted w-fit">
        {(['all', 'monthly'] as const).map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setPage(1); }}
            aria-pressed={period === p}
            aria-label={`Filtro ${p === 'all' ? 'Total' : 'Mensal'}`}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              period === p ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'all' ? 'Total' : 'Mensal'}
          </button>
        ))}
      </div>

      {/* Rankings */}
      {rankings.length === 0 ? (
        <div className="border border-border bg-card">
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V8a2 2 0 0 1 4 0v14"/></svg>
            </div>
            <p className="text-sm font-medium mb-1">Leaderboard vazio</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Ativa a participação com o toggle acima para aparecer no ranking. Os teus dados são anónimos por defeito.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {rankings.map((user) => (
            <div key={user.userId} className={`flex items-center gap-4 p-4 bg-card ${user.isCurrentUser ? 'bg-muted/50' : ''}`}>
              <div className="w-8 text-center">
                {user.rank <= 3 ? (
                  <span className={`text-lg font-bold ${user.rank === 1 ? 'text-yellow-500' : user.rank === 2 ? 'text-gray-400' : 'text-amber-600'}`}>
                    {user.rank}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{user.rank}</span>
                )}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image} referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-muted text-xs">{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{user.displayName}</span>
                  {user.isCurrentUser && <span className="text-xs text-muted-foreground">(tu)</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{user.totalTrades} trades</span>
                  <span>{user.winRate.toFixed(0)}% win</span>
                  <span>{user.followers} seguidores</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-medium font-display ${user.pnlPercent >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                  {user.pnlPercent >= 0 ? '+' : ''}{user.pnlPercent.toFixed(1)}%
                </span>
              </div>
              {!user.isCurrentUser && (
                <Button variant={user.isFollowing ? 'outline' : 'default'} size="sm"
                  onClick={() => handleFollow(user.userId, user.isFollowing)}
                  disabled={followingLoading === user.userId}
                >
                  {followingLoading === user.userId
                    ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current animate-spin" />
                    : user.isFollowing ? 'A seguir' : 'Seguir'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · até {totalCount} utilizadores
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || fetching}
            >
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="sm"
                className="min-w-8"
                onClick={() => setPage(p)}
                disabled={fetching}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || fetching}
            >
              Seguinte
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        O ranking é baseado na performance percentual do portfolio. 
        Ativa a participação para aparecer no leaderboard.
      </p>
    </div>
  );
}
