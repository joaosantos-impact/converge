'use client';

import { memo } from 'react';
import { PremiumChart } from './PremiumChart';
import { useCurrency } from '@/app/providers';

interface PerformanceChartProps {
  data: Array<{ timestamp: string; value: number }>;
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  height?: number;
}

export const PerformanceChart = memo(function PerformanceChart({ data, timeRange, height = 360 }: PerformanceChartProps) {
  const { formatValue } = useCurrency();

  return (
    <PremiumChart
      data={data}
      height={height}
      formatValue={formatValue}
      timeRange={timeRange}
      showAxes={true}
    />
  );
});
