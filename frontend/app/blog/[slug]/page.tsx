'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  views: number;
  createdAt: string;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`).then(r => {
      if (r.ok) return r.json();
      throw new Error('Not found');
    }).then(setPost).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  // Simple markdown-ish rendering
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium text-white mt-8 mb-3">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-medium text-white mt-10 mb-4">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-medium text-white mt-10 mb-4">{line.slice(2)}</h1>;
      if (line.startsWith('- ')) return <li key={i} className="text-sm text-white/55 ml-4 mb-1">{line.slice(2)}</li>;
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-white/20 pl-4 text-white/50 italic my-4">{line.slice(2)}</blockquote>;
      if (line.trim() === '') return <br key={i} />;
      // Bold
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>');
      return <p key={i} className="text-sm text-white/55 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-white">
              <span className="text-xs font-bold text-[#050505]">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Converge</span>
          </Link>
          <Link href="/blog" className="text-xs text-white/40 hover:text-white transition-colors">
            Blog
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-white/[0.03] animate-pulse" />
            <div className="h-4 w-1/2 bg-white/[0.02] animate-pulse" />
            <div className="mt-12 space-y-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-4 bg-white/[0.02] animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />)}
            </div>
          </div>
        ) : !post ? (
          <div className="py-20 text-center">
            <p className="text-white/40">Artigo não encontrado.</p>
            <Link href="/blog" className="text-xs text-white/25 hover:text-white/50 mt-4 inline-block">&larr; Voltar ao blog</Link>
          </div>
        ) : (
          <>
            <Link href="/blog" className="text-xs text-white/30 hover:text-white/50 transition-colors mb-8 inline-block">&larr; Blog</Link>
            <h1 className="text-3xl font-light tracking-tight mt-6" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>{post.title}</h1>
            <div className="flex items-center gap-4 mt-4 mb-12">
              <p className="text-[11px] text-white/30">
                {new Date(post.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-white/20">{post.views} leituras</p>
              {post.tags.length > 0 && (
                <div className="flex gap-1.5">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 border border-white/[0.08] text-white/25 uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="prose-converge">{renderContent(post.content)}</div>
          </>
        )}
      </article>

      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] text-white/15 tracking-wider">&copy; 2026 Converge</p>
        </div>
      </footer>
    </div>
  );
}
