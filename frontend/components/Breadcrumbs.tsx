'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Fragment, useMemo } from 'react';

// ── Map each route segment to its label ──
const ROUTE_LABELS: Record<string, string> = {
  portfolio: 'Portfolio',
  history: 'Trades',
  integrations: 'Integrações',
  taxes: 'Impostos',
  alerts: 'Estatísticas',
  analytics: 'Estatísticas',
  feed: 'Feed',
  leaderboard: 'Leaderboard',
  news: 'Notícias',
  compare: 'Comparador',
  dca: 'DCA Calculator',
  journal: 'Journal',
  settings: 'Definições',
  blog: 'Blog',
  exchanges: 'Exchanges',
  add: 'Adicionar',
};

// ── Map each first-level route to its sidebar section ──
// Mirrors the sidebar groups from AppSidebar.tsx
const SECTION_MAP: Record<string, { label: string }> = {
  // Principal
  portfolio:     { label: 'Principal' },
  integrations:  { label: 'Principal' },
  history:       { label: 'Principal' },
  alerts:        { label: 'Principal' },
  analytics:     { label: 'Principal' },
  taxes:         { label: 'Principal' },
  exchanges:     { label: 'Principal' },
  // Ferramentas
  dca:           { label: 'Ferramentas' },
  compare:       { label: 'Ferramentas' },
  journal:       { label: 'Ferramentas' },
  // Comunidade
  feed:          { label: 'Comunidade' },
  leaderboard:   { label: 'Comunidade' },
  news:          { label: 'Comunidade' },
  blog:          { label: 'Comunidade' },
  // Conta
  settings:      { label: 'Conta' },
};

function ChevronIcon() {
  return (
    <svg className="w-3 h-3 text-muted-foreground/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    // Only render inside /dashboard/* (but not on /dashboard itself)
    if (parts[0] !== 'dashboard' || parts.length < 2) return null;

    const firstSegment = parts[1]; // e.g. "portfolio", "dca", "feed"
    const section = SECTION_MAP[firstSegment];

    // Build the crumb trail
    const items: Array<{ label: string; href: string; isLast: boolean }> = [];

    // Start with the section name (non-linkable — it's just a category)
    const sectionLabel = section?.label || 'Principal';

    // Add each route segment after "dashboard"
    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i];
      const href = '/' + parts.slice(0, i + 1).join('/');
      const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ label, href, isLast: i === parts.length - 1 });
    }

    return { sectionLabel, items };
  }, [pathname]);

  if (!crumbs) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-4 min-w-0">
      {/* Section label — not a link, just context */}
      <span className="text-muted-foreground/60">{crumbs.sectionLabel}</span>

      {crumbs.items.map((crumb) => (
        <Fragment key={crumb.href}>
          <ChevronIcon />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
