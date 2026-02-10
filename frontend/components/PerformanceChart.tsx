'use client';

import { memo } from 'react';
import { D3AreaChart } from './charts';
import { useCurrency } from '@/app/providers';

interface PerformanceChartProps {
  data: Array<{ timestamp: string; value: number }>;
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  height?: number;
  /** When true, Max is not drawn in chart (parent renders it in header) */
  hideMaxInChart?: boolean;
}

export const PerformanceChart = memo(function PerformanceChart({ data, timeRange, height = 360, hideMaxInChart }: PerformanceChartProps) {
  const { formatChartValue } = useCurrency();

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    if (timeRange === '24h') return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    if (timeRange === '1y' || timeRange === 'all') return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' });
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  return (
    <D3AreaChart
      data={data}
      height={height}
      formatValue={formatChartValue}
      formatDate={formatDate}
      showMax={!hideMaxInChart}
      strokeColor="#ca8a04"
    />
  );
});
