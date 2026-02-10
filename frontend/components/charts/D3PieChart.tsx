'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

interface D3PieChartProps {
  data: PieSlice[];
  width?: number;
  height?: number;
  innerRadius?: number; // 0 = pie, >0 = donut
  formatValue?: (v: number) => string;
}

const DEFAULT_COLORS = [
  '#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
];

export function D3PieChart({
  data,
  width = 280,
  height = 280,
  innerRadius = 0,
  formatValue = (v) => v.toLocaleString(),
}: D3PieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const total = d3.sum(data, (d) => d.value);
    if (total <= 0) return;

    const radius = Math.min(width, height) / 2 - 20;
    const colorScale = d3.scaleOrdinal<string>()
      .domain(data.map((d) => d.label))
      .range(data.map((d, i) => d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]));

    const arc = d3.arc<d3.PieArcDatum<PieSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .padAngle(0.02)
      .cornerRadius(0);

    const pie = d3.pie<PieSlice>()
      .value((d) => d.value)
      .sort((a, b) => b.value - a.value);

    const arcs = pie(data);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const tooltip = createD3Tooltip(containerRef.current);

    g.selectAll('path')
      .data(arcs)
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => colorScale(d.data.label))
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.85);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        tooltip.show(event, `${d.data.label}: ${pct}%`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.hide();
      });

  }, [data, width, height, innerRadius, formatValue]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <svg ref={svgRef} className="overflow-visible" />
    </div>
  );
}
