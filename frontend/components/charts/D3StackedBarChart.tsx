'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface StackedSegment {
  asset: string;
  value: number;
  color?: string;
}

export interface StackedBarPoint {
  month: string;
  segments: StackedSegment[];
}

const DEFAULT_COLORS = [
  '#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
  '#f7931a', '#627eea',
];

interface D3StackedBarChartProps {
  data: StackedBarPoint[];
  height?: number;
  assetColors?: Record<string, string>;
  formatValue?: (v: number) => string;
}

function getAssetColor(asset: string, assetColors?: Record<string, string>, index?: number): string {
  if (assetColors?.[asset]) return assetColors[asset];
  return DEFAULT_COLORS[(index ?? 0) % DEFAULT_COLORS.length];
}

export function D3StackedBarChart({
  data,
  height = 280,
  assetColors,
  formatValue = (v) => `${v.toFixed(0)}%`,
}: D3StackedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 28, right: 15, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const months = data.map((d) => d.month);
    const allAssets = Array.from(new Set(data.flatMap((d) => d.segments.map((s) => s.asset))));

    const xScale = d3.scaleBand()
      .domain(months)
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0])
      .nice();

    const colorScale = (asset: string, i: number) => getAssetColor(asset, assetColors, i);

    const stack = d3.stack<StackedBarPoint, string>()
      .keys(allAssets)
      .value((d, key) => {
        const seg = d.segments.find((s) => s.asset === key);
        return seg?.value ?? 0;
      })
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stacked = stack(data);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const tooltip = createD3Tooltip(containerRef.current);

    const layer = g.selectAll('.layer')
      .data(stacked)
      .join('g')
      .attr('class', 'layer')
      .attr('fill', (d) => colorScale(d.key, allAssets.indexOf(d.key)));

    layer.selectAll('rect')
      .data((d) => d.map((dp) => ({ ...dp, key: d.key })))
      .join('rect')
      .attr('x', (d) => xScale(d.data.month) ?? 0)
      .attr('y', (d) => yScale(d[1]))
      .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth())
      .attr('rx', 1)
      .attr('ry', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.9);
        const pct = ((d[1] - d[0])).toFixed(1);
        tooltip.show(event, `${d.data.month} — ${d.key}: ${pct}%`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.hide();
      });

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.7)
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d, _i) => `${Number(d)}%`))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.6);

    g.selectAll('.domain, .tick line').remove();

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0, -8)`);
    allAssets.slice(0, 8).forEach((asset, i) => {
      legend.append('rect')
        .attr('x', i * 55)
        .attr('y', 0)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', colorScale(asset, i));
      legend.append('text')
        .attr('x', i * 55 + 14)
        .attr('y', 8)
        .attr('font-size', 9)
        .attr('fill', 'currentColor')
        .style('opacity', 0.8)
        .text(asset);
    });
  }, [data, height, assetColors, formatValue]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
