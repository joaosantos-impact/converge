'use client';

import dynamic from 'next/dynamic';

const TokenIconDynamic = dynamic(
  () => import('@web3icons/react/dynamic').then((m) => m.TokenIcon),
  { ssr: false }
);

interface AssetIconProps {
  symbol: string;
  size?: number;
  className?: string;
  variant?: 'mono' | 'branded' | 'background';
}

/**
 * Crypto asset logo using @web3icons/react TokenIcon.
 * Falls back to first 2 characters of symbol when icon is not available.
 */
export function AssetIcon({ symbol, size = 24, className, variant = 'branded' }: AssetIconProps) {
  const fallback = (
    <div
      className="flex items-center justify-center bg-muted text-muted-foreground font-semibold text-[10px] shrink-0"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  );

  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <TokenIconDynamic
        symbol={symbol.toUpperCase()}
        size={size}
        variant={variant}
        className={className}
        fallback={fallback}
      />
    </span>
  );
}
