'use client';

/**
 * Square spinner — the standard loading indicator for Converge.
 * Use this everywhere instead of circular spinners or raw skeleton blocks.
 */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <div className={`${sizeClass} border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin ${className}`} />
  );
}

/**
 * Full-height centered spinner — use for page-level loading states.
 */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Inline spinner for use within skeleton layouts — centered inside skeleton blocks.
 */
export function SkeletonSpinner({ height = 'h-[400px]' }: { height?: string }) {
  return (
    <div className={`${height} flex items-center justify-center`}>
      <Spinner />
    </div>
  );
}
