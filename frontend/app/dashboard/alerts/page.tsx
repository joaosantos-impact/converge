'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect legacy /dashboard/alerts to new Estatísticas page.
 * Alertas were removed and replaced by Estatísticas (analytics).
 */
export default function AlertsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/analytics');
  }, [router]);
  return null;
}
