'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const RechartsComponents = dynamic(
  () => import('recharts').then(mod => ({
    default: ({ data }: { data: { date: string; count: number }[] }) => (
      <mod.ResponsiveContainer width="100%" height="100%">
        <mod.AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <mod.XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.3 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => new Date(v).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} />
          <mod.YAxis tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.3 }} tickLine={false} axisLine={false} width={30} />
          <mod.Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 12 }} />
          <mod.Area type="monotone" dataKey="count" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#growthGrad)" />
        </mod.AreaChart>
      </mod.ResponsiveContainer>
    ),
  })),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  published: boolean;
  views: number;
  tags: string[];
  createdAt: string;
}

interface Review {
  id: string;
  name: string;
  role: string;
  initials: string;
  text: string;
  rating: number;
  published: boolean;
  order: number;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalTrades: number;
  totalExchangeAccounts: number;
  blogPosts: number;
  newUsersLast30d: number;
  growthData: { date: string; count: number }[];
}

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'blog' | 'reviews'>('overview');

  // Blog editor
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', tags: '', published: false });
  const [saving, setSaving] = useState(false);

  // Review editor
  const [reviewForm, setReviewForm] = useState({ name: '', role: '', initials: '', text: '', rating: 5, published: true, order: 0 });
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'review'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/stats');
      if (r.status === 401) { router.push('/dashboard'); return; }
      if (r.ok) setStats(await r.json());
    } catch {}
  }, [router]);

  const fetchPosts = useCallback(async () => {
    try {
      const r = await fetch('/api/blog?all=true');
      if (r.ok) setPosts(await r.json());
    } catch {}
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      const r = await fetch('/api/reviews?all=true');
      if (r.ok) setReviews(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/sign-in'); return; }
    Promise.all([fetchStats(), fetchPosts(), fetchReviews()]).finally(() => setLoading(false));
  }, [session, isPending, router, fetchStats, fetchPosts, fetchReviews]);

  // ── Blog handlers ──
  const handleNewPost = () => {
    setEditing(null);
    setForm({ title: '', slug: '', excerpt: '', content: '', tags: '', published: false });
  };

  const handleEditPost = (post: BlogPost) => {
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt || '', content: '', tags: post.tags.join(', '), published: post.published });
    fetch(`/api/blog/${post.id}`).then(r => r.json()).then(data => { setForm(f => ({ ...f, content: data.content })); });
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Título e conteúdo obrigatórios'); return; }
    setSaving(true);
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const body = { ...form, slug, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      const url = editing ? `/api/blog/${editing.id}` : '/api/blog';
      const method = editing ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) {
        toast.success(editing ? 'Post atualizado' : 'Post criado');
        setEditing(null);
        setForm({ title: '', slug: '', excerpt: '', content: '', tags: '', published: false });
        fetchPosts();
      } else toast.error('Erro');
    } catch { toast.error('Erro'); }
    finally { setSaving(false); }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await fetch(`/api/blog/${post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !post.published }) });
      setPosts(posts.map(p => p.id === post.id ? { ...p, published: !p.published } : p));
    } catch { toast.error('Erro'); }
  };

  // ── Review handlers ──
  const handleNewReview = () => {
    setEditingReview(null);
    setReviewForm({ name: '', role: '', initials: '', text: '', rating: 5, published: true, order: reviews.length });
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setReviewForm({ name: review.name, role: review.role, initials: review.initials, text: review.text, rating: review.rating, published: review.published, order: review.order });
  };

  const handleSaveReview = async () => {
    if (!reviewForm.name || !reviewForm.text) { toast.error('Nome e texto obrigatórios'); return; }
    setSavingReview(true);
    try {
      const url = editingReview ? `/api/reviews/${editingReview.id}` : '/api/reviews';
      const method = editingReview ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewForm) });
      if (r.ok) {
        toast.success(editingReview ? 'Review atualizada' : 'Review criada');
        setEditingReview(null);
        setReviewForm({ name: '', role: '', initials: '', text: '', rating: 5, published: true, order: 0 });
        fetchReviews();
      } else toast.error('Erro');
    } catch { toast.error('Erro'); }
    finally { setSavingReview(false); }
  };

  const handleToggleReviewPublish = async (review: Review) => {
    try {
      await fetch(`/api/reviews/${review.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !review.published }) });
      setReviews(reviews.map(r => r.id === review.id ? { ...r, published: !r.published } : r));
    } catch { toast.error('Erro'); }
  };

  // ── Delete handler ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url = deleteTarget.type === 'post' ? `/api/blog/${deleteTarget.id}` : `/api/reviews/${deleteTarget.id}`;
      const r = await fetch(url, { method: 'DELETE' });
      if (r.ok) {
        toast.success('Eliminado');
        if (deleteTarget.type === 'post') fetchPosts();
        else fetchReviews();
      }
    } catch { toast.error('Erro'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-[400px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
        </Skeleton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center bg-foreground">
                <span className="text-xs font-bold text-background">C</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Admin</span>
            </Link>
            <div className="flex gap-1 ml-4">
              {(['overview', 'blog', 'reviews'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'overview' ? 'Overview' : t === 'blog' ? 'Blog' : 'Reviews'}
                </button>
              ))}
            </div>
          </div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">Dashboard</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Overview ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: 'Utilizadores', value: stats.totalUsers },
                { label: 'Novos (30d)', value: stats.newUsersLast30d },
                { label: 'Trades', value: stats.totalTrades.toLocaleString() },
                { label: 'Integrações', value: stats.totalExchangeAccounts },
              ].map(s => (
                <div key={s.label} className="border border-border bg-card p-5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-2xl font-medium mt-1 font-display">{s.value}</p>
                </div>
              ))}
            </div>
            {stats.growthData.length > 0 && (
              <div className="border border-border bg-card">
                <div className="px-5 py-4 border-b border-border"><p className="text-sm font-medium">Crescimento de utilizadores (30 dias)</p></div>
                <div className="p-4 h-64">
                  <RechartsComponents data={stats.growthData} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Blog ── */}
        {tab === 'blog' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{posts.length} posts</p>
              <Button size="sm" onClick={handleNewPost}>Novo Post</Button>
            </div>
            {(form.title || !editing) && form.title !== undefined && (
              <div className="border border-border bg-card p-6 space-y-4">
                <p className="text-sm font-medium">{editing ? 'Editar Post' : 'Novo Post'}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label className="text-xs">Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título do post" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="url-do-post" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Resumo</Label><Input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Breve descrição..." /></div>
                <div className="space-y-1.5"><Label className="text-xs">Conteúdo (Markdown)</Label>
                  <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full h-64 px-3 py-2 border border-border bg-background text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Escreve em markdown..." />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label className="text-xs">Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="crypto, bitcoin" /></div>
                  <div className="flex items-center gap-3 pt-5"><Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} /><Label className="text-xs">Publicado</Label></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Guardar'}
                  </Button>
                  {editing && <Button variant="outline" size="sm" onClick={() => { setEditing(null); setForm({ title: '', slug: '', excerpt: '', content: '', tags: '', published: false }); }}>Cancelar</Button>}
                </div>
              </div>
            )}
            <div className="border border-border divide-y divide-border">
              {posts.map(post => (
                <div key={post.id} className="flex items-center gap-4 p-4 bg-card">
                  <div className={`w-1.5 h-8 shrink-0 ${post.published ? 'bg-foreground' : 'bg-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">/{post.slug} · {post.views} views · {new Date(post.createdAt).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={post.published} onCheckedChange={() => handleTogglePublish(post)} />
                    <button onClick={() => handleEditPost(post)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
                    <button onClick={() => setDeleteTarget({ type: 'post', id: post.id })} className="text-xs text-muted-foreground hover:text-red-500">Eliminar</button>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Sem posts</div>}
            </div>
          </div>
        )}

        {/* ── Reviews ── */}
        {tab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{reviews.length} reviews</p>
              <Button size="sm" onClick={handleNewReview}>Nova Review</Button>
            </div>

            {/* Review editor */}
            {(reviewForm.name !== '' || !editingReview) && (
              <div className="border border-border bg-card p-6 space-y-4">
                <p className="text-sm font-medium">{editingReview ? 'Editar Review' : 'Nova Review'}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} placeholder="Miguel S." /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Cargo/Papel</Label><Input value={reviewForm.role} onChange={e => setReviewForm({ ...reviewForm, role: e.target.value })} placeholder="Trader desde 2019" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Iniciais</Label><Input value={reviewForm.initials} onChange={e => setReviewForm({ ...reviewForm, initials: e.target.value })} placeholder="MS" maxLength={3} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto</Label>
                  <Textarea value={reviewForm.text} onChange={e => setReviewForm({ ...reviewForm, text: e.target.value })} placeholder="O que o utilizador disse..." rows={3} className="resize-none" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rating (1-5)</Label>
                    <Input type="number" min={1} max={5} value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ordem</Label>
                    <Input type="number" min={0} value={reviewForm.order} onChange={e => setReviewForm({ ...reviewForm, order: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <Switch checked={reviewForm.published} onCheckedChange={v => setReviewForm({ ...reviewForm, published: v })} />
                    <Label className="text-xs">Publicada</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveReview} disabled={savingReview} size="sm">
                    {savingReview ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Guardar'}
                  </Button>
                  {editingReview && <Button variant="outline" size="sm" onClick={() => { setEditingReview(null); setReviewForm({ name: '', role: '', initials: '', text: '', rating: 5, published: true, order: 0 }); }}>Cancelar</Button>}
                </div>
              </div>
            )}

            {/* Reviews list */}
            <div className="border border-border divide-y divide-border">
              {reviews.map(review => (
                <div key={review.id} className="flex items-center gap-4 p-4 bg-card">
                  <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-medium shrink-0 ${review.published ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                    {review.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{review.name} <span className="text-muted-foreground font-normal">· {review.role}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">&ldquo;{review.text}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                    <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    <span>#{review.order}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={review.published} onCheckedChange={() => handleToggleReviewPublish(review)} />
                    <button onClick={() => handleEditReview(review)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
                    <button onClick={() => setDeleteTarget({ type: 'review', id: review.id })} className="text-xs text-muted-foreground hover:text-red-500">Eliminar</button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Sem reviews — cria a primeira!</div>}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar {deleteTarget?.type === 'post' ? 'post' : 'review'}</DialogTitle>
            <DialogDescription>Tens a certeza? Esta ação não pode ser revertida.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <div className="w-4 h-4 border-2 border-background/30 border-t-background animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
