'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ConvergeLogoProps {
  /** Size in pixels (width and height) */
  size?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Force light icon (white) - e.g. on dark backgrounds */
  invert?: boolean;
  /** Force black icon - e.g. on white/light backgrounds. Overrides theme. */
  forceBlack?: boolean;
}

/**
 * Official Converge logo. Adapts to theme:
 * - Light mode: black
 * - Dark mode: white/light
 * Use invert=true when the logo sits on a dark background (e.g. landing nav).
 */
export function ConvergeLogo({ size = 28, className = '', invert = false, forceBlack = false }: ConvergeLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const useLightIcon = forceBlack ? false : (invert || isDark);
  const src = useLightIcon ? '/icons/converge_invertido_branco.svg' : '/icons/converge_preto.svg';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="object-contain w-full h-full"
        unoptimized
      />
    </span>
  );
}
