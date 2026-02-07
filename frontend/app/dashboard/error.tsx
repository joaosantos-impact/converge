'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-6">
      <div className="w-12 h-12 bg-muted flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-medium mb-1">Erro na página</p>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">
        Ocorreu um erro inesperado. Tenta recarregar.
      </p>
      <Button size="sm" variant="outline" onClick={() => reset()}>
        Tentar novamente
      </Button>
    </div>
  );
}
