'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  LayoutDashboard,
  Wallet,
  Link2,
  Receipt,
  Newspaper,
  Bell,
  History,
  Trophy,
  Rss,
  Settings,
  Search,
  Calculator,
  GitCompare,
  Target,
  PenLine,
  BookOpen,
} from 'lucide-react';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  category: 'page' | 'asset' | 'action';
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, category: 'page' },
  { id: 'portfolio', label: 'Portfolio', href: '/dashboard/portfolio', icon: <Wallet className="h-4 w-4" />, category: 'page' },
  { id: 'integrations', label: 'Integrações', href: '/dashboard/integrations', icon: <Link2 className="h-4 w-4" />, category: 'page' },
  { id: 'trades', label: 'Trades', href: '/dashboard/history', icon: <History className="h-4 w-4" />, category: 'page' },
  { id: 'alerts', label: 'Alertas', href: '/dashboard/alerts', icon: <Bell className="h-4 w-4" />, category: 'page' },
  { id: 'taxes', label: 'Impostos', href: '/dashboard/taxes', icon: <Receipt className="h-4 w-4" />, category: 'page' },
  { id: 'feed', label: 'Feed', href: '/dashboard/feed', icon: <Newspaper className="h-4 w-4" />, category: 'page' },
  { id: 'leaderboard', label: 'Leaderboard', href: '/dashboard/leaderboard', icon: <Trophy className="h-4 w-4" />, category: 'page' },
  { id: 'news', label: 'Notícias', href: '/dashboard/news', icon: <Rss className="h-4 w-4" />, category: 'page' },
  { id: 'settings', label: 'Definições', href: '/dashboard/settings', icon: <Settings className="h-4 w-4" />, category: 'page' },
  { id: 'dca', label: 'DCA Calculator', description: 'Simulador de Dollar Cost Averaging', href: '/dashboard/dca', icon: <Calculator className="h-4 w-4" />, category: 'page' },
  { id: 'compare', label: 'Comparador', description: 'Comparar assets', href: '/dashboard/compare', icon: <GitCompare className="h-4 w-4" />, category: 'page' },
  { id: 'goals', label: 'Objetivos', description: 'Metas do portfolio', href: '/dashboard/goals', icon: <Target className="h-4 w-4" />, category: 'page' },
  { id: 'journal', label: 'Journal', description: 'Diário de trading', href: '/dashboard/journal', icon: <PenLine className="h-4 w-4" />, category: 'page' },
  { id: 'blog', label: 'Blog', description: 'Artigos e guias', href: '/dashboard/blog', icon: <BookOpen className="h-4 w-4" />, category: 'page' },
];

const COMMON_ASSETS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK',
  'MATIC', 'UNI', 'ATOM', 'FIL', 'APT', 'ARB', 'OP', 'SUI', 'NEAR', 'ALGO',
];

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [portfolioAssets, setPortfolioAssets] = useState<string[]>([]);

  // Fetch user's assets for search
  useEffect(() => {
    fetch('/api/portfolio')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.balances) {
          const assets = [...new Set(data.balances.map((b: { asset: string }) => b.asset))];
          setPortfolioAssets(assets as string[]);
        }
      })
      .catch(() => {});
  }, []);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build results
  const getResults = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Pages
    const matchedPages = PAGES.filter(p => 
      p.label.toLowerCase().includes(q) || 
      (p.description?.toLowerCase().includes(q))
    );
    results.push(...matchedPages);

    // Assets
    const allAssets = [...new Set([...portfolioAssets, ...COMMON_ASSETS])];
    const matchedAssets = allAssets
      .filter(a => a.toLowerCase().includes(q))
      .slice(0, 6)
      .map(a => ({
        id: `asset-${a}`,
        label: a,
        description: portfolioAssets.includes(a) ? 'No teu portfolio' : 'Asset',
        href: `/dashboard/portfolio/${a.toLowerCase()}`,
        icon: <div className="w-4 h-4 bg-muted flex items-center justify-center text-[8px] font-medium">{a.slice(0, 2)}</div>,
        category: 'asset' as const,
      }));
    results.push(...matchedAssets);

    return q ? results : PAGES;
  }, [query, portfolioAssets]);

  const results = getResults();

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        router.push(results[selectedIndex].href);
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSelectedIndex(0); }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Procurar</DialogTitle>
        </VisuallyHidden>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar páginas, assets..."
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="cmd-results"
            aria-autocomplete="list"
            aria-label="Procurar páginas e assets"
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div
          className="max-h-72 overflow-y-auto py-2"
          role="listbox"
          aria-label="Resultados da pesquisa"
          aria-live="polite"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center" role="status">
              <p className="text-sm text-muted-foreground">Sem resultados para &quot;{query}&quot;</p>
            </div>
          ) : (
            <>
              {/* Group by category */}
              {results.some(r => r.category === 'page') && (
                <div className="px-3 py-1" role="presentation">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-1" id="cmd-pages-label">
                    {query ? 'Páginas' : 'Navegar'}
                  </p>
                </div>
              )}
              {results.filter(r => r.category === 'page').map((result) => {
                const globalIndex = results.indexOf(result);
                return (
                  <button
                    key={result.id}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    aria-label={`${result.label}${result.description ? ` — ${result.description}` : ''}`}
                    onClick={() => { router.push(result.href); setOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedIndex === globalIndex ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-muted-foreground" aria-hidden="true">{result.icon}</span>
                    <span className="flex-1">{result.label}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">{result.description}</span>
                    )}
                  </button>
                );
              })}

              {results.some(r => r.category === 'asset') && (
                <div className="px-3 py-1 mt-1" role="presentation">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-1" id="cmd-assets-label">Assets</p>
                </div>
              )}
              {results.filter(r => r.category === 'asset').map((result) => {
                const globalIndex = results.indexOf(result);
                return (
                  <button
                    key={result.id}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    aria-label={`${result.label}${result.description ? ` — ${result.description}` : ''}`}
                    onClick={() => { router.push(result.href); setOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedIndex === globalIndex ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-muted-foreground" aria-hidden="true">{result.icon}</span>
                    <span className="flex-1 font-medium">{result.label}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">{result.description}</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
