'use client';

import { useMemo, useId, memo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface PremiumChartProps {
  data: Array<{ timestamp: string; value: number }>;
  height?: number;
  formatValue?: (v: number) => string;
  markers?: Array<{
    timestamp: string;
    value: number;
    type: 'buy' | 'sell';
    label?: string;
  }>;
  showAxes?: boolean;
  timeRange?: string;
}

export const PremiumChart = memo(function PremiumChart({
  data,
  height = 360,
  formatValue,
  markers,
  showAxes = true,
  timeRange = '30d',
}: PremiumChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        ...(timeRange === '1y' || timeRange === 'all' ? { year: '2-digit' } : {}),
      }),
      time: new Date(item.timestamp).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }, [data, timeRange]);

  const percentChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [chartData]);

  // Single chart line color: yellow/gold. Green/red reserved for buy/sell markers only.
  const strokeColor = '#ca8a04'; // amber-600 / dourado
  const gradientColor = strokeColor;
  const reactId = useId();
  const gradientId = `premium-gradient-${reactId.replace(/:/g, '')}`;

  // Default Y-axis formatter
  const defaultYFormatter = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
    if (Math.abs(value) < 1 && value !== 0) return value.toFixed(4);
    return value.toFixed(value !== 0 && Math.abs(value) < 10 ? 2 : 0);
  };

  const yAxisFormatter = formatValue || defaultYFormatter;

  const renderTooltip = useCallback(({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown>; value?: number }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      if (!d) return null;
      const val = Number(d.value || 0);
      const time = String(d.time || '');
      const date = String(d.date || '');
      return (
        <div className="bg-card border border-border px-4 py-3 shadow-xl">
          <p className="text-base font-semibold font-display">
            {formatValue ? formatValue(val) : val.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeRange === '24h' ? time : `${date} · ${time}`}
          </p>
        </div>
      );
    }
    return null;
  }, [formatValue, timeRange]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Sem dados para este período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: showAxes ? 10 : 0, left: showAxes ? 0 : 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColor} stopOpacity={0.4} />
            <stop offset="40%" stopColor={gradientColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={gradientColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {showAxes && (
          <XAxis
            dataKey={timeRange === '24h' ? 'time' : 'date'}
            tick={{ fill: 'currentColor', opacity: 0.45, fontSize: 12, fontFamily: 'var(--font-display)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
            dy={8}
          />
        )}
        {showAxes && (
          <YAxis
            tick={{ fill: 'currentColor', opacity: 0.45, fontSize: 12, fontFamily: 'var(--font-display)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => yAxisFormatter(value)}
            width={65}
            dx={-4}
          />
        )}
        <Tooltip content={renderTooltip} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 6,
            strokeWidth: 3,
            stroke: 'hsl(var(--background))',
            fill: strokeColor,
          }}
          animationDuration={800}
          animationEasing="ease-out"
        />
        {/* Trade markers */}
        {markers?.map((m, i) => {
          const closest = chartData.reduce((prev, curr) => {
            return Math.abs(new Date(curr.timestamp).getTime() - new Date(m.timestamp).getTime()) <
              Math.abs(new Date(prev.timestamp).getTime() - new Date(m.timestamp).getTime())
              ? curr
              : prev;
          });
          return (
            <ReferenceDot
              key={`marker-${i}`}
              x={timeRange === '24h' ? closest.time : closest.date}
              y={m.value}
              r={6}
              fill={m.type === 'buy' ? '#10b981' : '#ef4444'}
              stroke="hsl(var(--background))"
              strokeWidth={3}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
});
