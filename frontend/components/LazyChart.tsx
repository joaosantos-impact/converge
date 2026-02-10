'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy-loaded chart components.
 * D3-based charts are loaded on demand to keep the initial bundle smaller.
 */

export const LazyPerformanceChart = dynamic(
  () => import('@/components/PerformanceChart').then(m => ({ default: m.PerformanceChart })),
  {
    loading: () => (
      <div className="h-[380px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

export const LazyPremiumChart = dynamic(
  () => import('@/components/PremiumChart').then(m => ({ default: m.PremiumChart })),
  {
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      </div>
    ),
    ssr: false,
  }
);
