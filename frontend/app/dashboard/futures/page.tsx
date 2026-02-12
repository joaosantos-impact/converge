'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeHistoryView } from '@/components/TradeHistoryView';

export default function FuturesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
      <TradeHistoryView
        marketType="future"
        title="Futuros"
        emptyMessage="Sem operações de futuros encontradas"
      />
    </Suspense>
  );
}
