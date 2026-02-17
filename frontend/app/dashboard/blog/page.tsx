'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/Spinner';
import { FadeIn } from '@/components/animations';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  tags: string[];
  views: number;
  createdAt: string;
}

export default function DashboardBlogPage() {
  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const r = await fetch('/api/blog');
      if (!r.ok) throw new Error('Failed to fetch');
      return r.json() as Promise<BlogPost[]>;
    },
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <FadeIn>
        <div>
          <h1 className="text-xl font-medium tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground">Notícias e guias sobre crypto, impostos e portfolio</p>
        </div>
      </FadeIn>

      {posts.length === 0 ? (
        <FadeIn delay={0.05}>
          <div className="border border-border bg-card">
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <p className="text-sm font-medium mb-1">Sem artigos publicados</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Volta em breve! Estamos a preparar conteúdo sobre crypto, impostos e estratégias de portfolio.</p>
            </div>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <FadeIn key={post.id} delay={i * 0.03}>
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className="group block border border-border bg-card hover:bg-muted/30 hover:border-foreground/10 transition-all"
              >
                <div className="flex items-start justify-between gap-6 p-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-medium group-hover:text-foreground/90 transition-colors">{post.title}</h2>
                    {post.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {post.views > 0 && (
                        <p className="text-[10px] text-muted-foreground">{post.views} visualizações</p>
                      )}
                      {post.tags.length > 0 && (
                        <div className="flex gap-1.5">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[8px] px-2 py-0.5 border border-border text-muted-foreground uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
