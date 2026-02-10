'use client';

import { memo } from 'react';
import { D3AreaChart } from './charts';

interface PremiumChartProps {
  data: Array<{ timestamp: string; value: number }>;
  height?: number;
  formatValue?: (v: number) => string;
  /** Line/gradient color (default amber). Use e.g. #22c55e green, #ef4444 red */
  strokeColor?: string;
  markers?: Array<{
    timestamp: string;
    value: number;
    type: 'buy' | 'sell';
    label?: string;
    cost?: number;
    amount?: number;
  }>;
  showAxes?: boolean;
  /** When 'year', X-axis shows only years (e.g. for comparator with little space) */
  xAxisFormat?: 'default' | 'year';
  /** When true, Max is not drawn in chart (parent renders it in header) */
  hideMaxInChart?: boolean;
  timeRange?: string;
}

const defaultYFormatter = (value: number) => {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) return value.toExponential(2);
  if (Math.abs(value) < 1 && value !== 0) return value.toFixed(4);
  return value.toFixed(value !== 0 && Math.abs(value) < 10 ? 2 : 0);
};

export const PremiumChart = memo(function PremiumChart({
  data,
  height = 360,
  formatValue: formatValueProp,
  strokeColor = '#ca8a04',
  markers,
  showAxes = true,
  xAxisFormat = 'default',
  hideMaxInChart = false,
  timeRange = '30d',
}: PremiumChartProps) {
  const formatValue = formatValueProp ?? defaultYFormatter;

  function formatDate(ts: string): string {
    if (xAxisFormat === 'year') {
      return new Date(ts).getFullYear().toString();
    }
    if (timeRange === '24h') {
      return new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(ts).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      ...(timeRange === '1y' || timeRange === 'all' ? { year: '2-digit' as const } : {}),
    });
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Sem dados para este período
      </div>
    );
  }

  return (
    <D3AreaChart
      data={data}
      height={height}
      strokeColor={strokeColor}
      formatValue={formatValue}
      formatDate={formatDate}
      showMax={showAxes && !hideMaxInChart}
      markers={markers}
    />
  );
});
