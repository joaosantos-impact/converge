'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConvergeLogo } from '@/components/ConvergeLogo';

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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog').then(r => r.json()).then(data => { setPosts(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center bg-white rounded-sm overflow-hidden">
              <ConvergeLogo size={32} forceBlack />
            </div>
            <span className="text-base font-semibold tracking-tight text-white font-brand">Converge</span>
          </Link>
          <Link href="/sign-up" className="text-[13px] px-5 py-2 bg-white text-[#050505] font-medium hover:bg-white/90 transition-colors">
            Começar
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-4">Blog</p>
        <h1 className="text-3xl font-light tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
          Notícias e{' '}
          <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }} className="text-white/80">guias</span>
        </h1>
        <p className="text-sm text-white/50 mb-16">Artigos sobre crypto, impostos, e portfolio management.</p>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-white/40">Sem artigos publicados.</p>
            <p className="text-sm text-white/25 mt-2">Volta em breve!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block p-6 border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium text-white group-hover:text-white/90 transition-colors">{post.title}</h2>
                    {post.excerpt && (
                      <p className="text-sm text-white/45 mt-2 leading-relaxed line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-4">
                      <p className="text-[10px] text-white/30">
                        {new Date(post.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {post.tags.length > 0 && (
                        <div className="flex gap-1.5">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] px-2 py-0.5 border border-white/[0.08] text-white/30 uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] text-white/15 tracking-wider">&copy; 2026 Converge</p>
        </div>
      </footer>
    </div>
  );
}
