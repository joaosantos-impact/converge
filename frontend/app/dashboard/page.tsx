'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Dashboard removed. Redirect to Portfolio as the main entry point.
 */
export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/portfolio');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
    </div>
  );
}
