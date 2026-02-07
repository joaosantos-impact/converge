'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from '@/lib/auth-client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrency } from '@/app/providers';
import { useFeed, useInvalidateFeed } from '@/hooks/use-feed';
import { useTrades } from '@/hooks/use-trades';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import type { TradeData } from '@/lib/types';
import { FadeIn } from '@/components/animations';

interface PostTrade {
  id: string;
  symbol: string;
  side: string;
  price: number | null;
  amount: number | null;
  cost: number | null;
  exchange: string | null;
  timestamp: string;
}

interface Post {
  id: string;
  user: { id: string; name: string; image: string | null } | null;
  content: string;
  isOwner: boolean;
  trades: PostTrade[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

export default function FeedPage() {
  const { data: session, isPending } = useSession();
  const { formatValue } = useCurrency();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<'all' | 'buys' | 'sells'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [visiblePostCount, setVisiblePostCount] = useState(20);

  // Privacy controls
  const [showPrice, setShowPrice] = useState(true);
  const [showAmount, setShowAmount] = useState(true);
  const [showExchange, setShowExchange] = useState(true);
  const [showPnl, setShowPnl] = useState(false);

  // React Query for feed and trades
  const { data: feedData, isLoading: loading, error: feedError } = useFeed();
  const invalidateFeed = useInvalidateFeed();
  const posts = feedData?.posts || [];

  const { data: userTradesData, isLoading: loadingTrades } = useTrades(30);
  const userTrades = userTradesData?.trades || [];

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
  }, [session, isPending, router]);

  useEffect(() => {
    if (feedError) toast.error('Erro ao carregar feed');
  }, [feedError]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setSelectedTrades([]);
    setContent('');
    setShowPrice(true);
    setShowAmount(true);
    setShowExchange(true);
    setShowPnl(false);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && selectedTrades.length === 0) {
      toast.error('Adiciona conteúdo ou seleciona trades');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          tradeIds: selectedTrades,
          showPrice,
          showAmount,
          showExchange,
          showPnl,
        }),
      });
      if (response.ok) {
        toast.success('Post publicado');
        setDialogOpen(false);
        invalidateFeed();
      } else {
        toast.error('Erro ao publicar');
      }
    } catch { toast.error('Erro ao publicar'); }
    finally { setCreating(false); }
  };

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
      invalidateFeed();
    } catch { toast.error('Erro'); }
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const confirmDeletePost = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/feed/${deleteTarget}`, { method: 'DELETE' });
      if (response.ok) { invalidateFeed(); toast.success('Post eliminado'); }
    } catch { toast.error('Erro'); }
    finally { setDeleteTarget(null); }
  };

  const toggleTrade = (tradeId: string) => {
    setSelectedTrades(prev =>
      prev.includes(tradeId) ? prev.filter(t => t !== tradeId) : [...prev, tradeId]
    );
  };

  const allFilteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (filter === 'all') return true;
      if (filter === 'buys') return post.trades.some(t => t.side === 'buy');
      if (filter === 'sells') return post.trades.some(t => t.side === 'sell');
      return true;
    });
  }, [posts, filter]);

  const filteredPosts = useMemo(() => allFilteredPosts.slice(0, visiblePostCount), [allFilteredPosts, visiblePostCount]);
  const hasMorePosts = allFilteredPosts.length > visiblePostCount;

  // Create post form content
  const createForm = (
    <div className="space-y-5">
      <Textarea placeholder="O que andas a fazer?" value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="resize-none" />

      {/* Trade selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium">Trades verificadas (últimos 30 dias)</p>
          {selectedTrades.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{selectedTrades.length} selecionada{selectedTrades.length > 1 ? 's' : ''}</span>
          )}
        </div>
        {loadingTrades ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : userTrades.length === 0 ? (
          <div className="p-6 border border-border bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Sem trades recentes</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sincroniza as tuas integrações primeiro</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {userTrades.slice(0, 30).map((trade, i) => {
              const tradeId = trade.id || `${trade.symbol}-${trade.timestamp}`;
              const isSelected = selectedTrades.includes(tradeId);
              return (
                <button
                  key={i}
                  onClick={() => toggleTrade(tradeId)}
                  className={`w-full flex items-center gap-3 p-2.5 border text-left transition-all ${
                    isSelected
                      ? 'border-foreground bg-muted/50'
                      : 'border-border hover:border-border/80 hover:bg-muted/20'
                  }`}
                >
                  <div className={`w-1 h-8 shrink-0 ${trade.side === 'buy' ? 'bg-foreground' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{trade.symbol}</span>
                      <span className={`text-[9px] px-1 py-0.5 ${trade.side === 'buy' ? 'bg-muted text-foreground' : 'bg-red-500/10 text-red-500'}`}>
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
                    <p className="text-[10px] text-muted-foreground">@ {formatValue(trade.price)}</p>
                  </div>
                  {/* Check indicator */}
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

      {/* Privacy controls */}
      {selectedTrades.length > 0 && (
        <div className="border border-border p-4 space-y-3">
          <p className="text-xs font-medium mb-1">O que mostrar no post</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Preço</Label>
              <Switch checked={showPrice} onCheckedChange={setShowPrice} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <Switch checked={showAmount} onCheckedChange={setShowAmount} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Exchange</Label>
              <Switch checked={showExchange} onCheckedChange={setShowExchange} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">P&L</Label>
              <Switch checked={showPnl} onCheckedChange={setShowPnl} />
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground">Controla que informação é visível. As trades são sempre verificadas via API.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
        <Button onClick={handleCreatePost} disabled={creating} className="flex-1">
          {creating ? (
            <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" />
          ) : `Publicar${selectedTrades.length > 0 ? ` (${selectedTrades.length})` : ''}`}
        </Button>
      </div>
    </div>
  );

  if (isPending || loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Feed</h1>
            <p className="text-sm text-muted-foreground">Partilha trades verificadas</p>
          </div>
          <Button size="sm" onClick={handleOpenDialog}>
            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Publicar
          </Button>
        </div>
      </FadeIn>

      {/* Filters */}
      <div className="flex gap-1 p-1 bg-muted w-fit" role="group" aria-label="Filtrar posts">
        {(['all', 'buys', 'sells'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {f === 'all' ? 'Todas' : f === 'buys' ? 'Compras' : 'Vendas'}
          </button>
        ))}
      </div>

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="border border-border bg-card">
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm font-medium mb-1">Sem posts no feed</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Sê o primeiro a publicar! Seleciona trades verificadas da tua conta e partilha com a comunidade.</p>
            <Button size="sm" className="mt-4" onClick={handleOpenDialog}>Criar primeiro post</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="border border-border bg-card">
              {/* Post header */}
              <div className="flex items-center gap-3 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.user?.image || undefined} />
                  <AvatarFallback className="bg-muted text-xs">{post.user?.name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{post.user?.name || 'Anónimo'}</p>
                    {post.trades.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                        <svg className="inline w-2.5 h-2.5 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        verificado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {post.isOwner && (
                  <button onClick={() => setDeleteTarget(post.id)} aria-label="Eliminar post" className="text-xs text-muted-foreground hover:text-destructive">Eliminar</button>
                )}
              </div>

              {post.content && (
                <div className="px-4 pb-3"><p className="text-sm leading-relaxed">{post.content}</p></div>
              )}

              {post.trades.length > 0 && (
                <div className="px-4 pb-4 space-y-1.5">
                  {post.trades.map(trade => (
                    <div key={trade.id} className="flex items-center gap-3 p-2.5 bg-muted/50">
                      <div className={`w-1 h-8 shrink-0 ${trade.side === 'buy' ? 'bg-foreground' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{trade.symbol}</span>
                          <span className={`text-[9px] ${trade.side === 'buy' ? 'text-foreground' : 'text-red-500'}`}>
                            {trade.side === 'buy' ? 'Compra' : 'Venda'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {trade.exchange && `${trade.exchange} · `}{new Date(trade.timestamp).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                      {trade.amount !== null && (
                        <div className="text-right">
                          <p className="text-xs">{trade.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                          {trade.price !== null && <p className="text-[10px] text-muted-foreground">@ {formatValue(trade.price)}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-6 px-4 py-3 border-t border-border">
                <button onClick={() => handleLike(post.id)}
                  aria-label={post.isLiked ? 'Remover like' : 'Dar like'}
                  aria-pressed={post.isLiked}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="text-xs">{post.likes}</span>
                </button>
                <span className="text-xs text-muted-foreground">{post.comments} comentários</span>
              </div>
            </div>
          ))}
          {hasMorePosts && (
            <div className="text-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisiblePostCount(prev => prev + 20)}
              >
                Carregar mais ({allFilteredPosts.length - visiblePostCount} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Post — Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Novo Post</DrawerTitle>
              <DrawerDescription>Partilha trades verificadas com a comunidade</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">{createForm}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Post</DialogTitle>
              <DialogDescription>Partilha trades verificadas com a comunidade</DialogDescription>
            </DialogHeader>
            {createForm}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar post</DialogTitle>
            <DialogDescription>Tens a certeza que queres eliminar este post? Esta ação não pode ser revertida.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeletePost}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
