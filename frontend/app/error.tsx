'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 mx-auto mb-6 bg-muted flex items-center justify-center">
          <svg
            className="w-7 h-7 text-muted-foreground"
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
        <h2 className="text-lg font-medium mb-2">Algo correu mal</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ocorreu um erro inesperado. Tenta recarregar a página.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Tentar novamente
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/'}>
            Ir para o início
          </Button>
        </div>
      </div>
    </div>
  );
}
