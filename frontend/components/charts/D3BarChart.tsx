'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface D3BarChartProps {
  data: BarDataPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  horizontal?: boolean;
  showMax?: boolean;
  /** For P&L-style charts: bars extend from 0, green=positive, red=negative */
  diverging?: boolean;
  /** More space for Y-axis (currency) and X-axis (long labels like exchange names) */
  wide?: boolean;
}

const DEFAULT_COLORS = [
  '#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
];

export function D3BarChart({
  data,
  height = 280,
  formatValue = (v) => `${v.toFixed(1)}%`,
  horizontal = false,
  showMax = true,
  diverging = false,
  wide = false,
}: D3BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 400;
    const margin = wide
      ? { top: 15, right: showMax ? 50 : 15, bottom: 50, left: 72 }
      : { top: 15, right: showMax ? 50 : 15, bottom: 25, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxVal = d3.max(data, (d) => d.value) ?? 100;
    const minVal = d3.min(data, (d) => d.value) ?? 0;

    const tooltip = createD3Tooltip(containerRef.current);

    if (horizontal) {
      const yScale = d3.scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerHeight])
        .padding(0.25);

      const xScale = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .range([0, innerWidth]);

      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      g.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('y', (d) => yScale(d.label)!)
        .attr('height', yScale.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => xScale(d.value))
        .attr('fill', (d, i) => d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length])
        .attr('rx', 2)
        .attr('ry', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          tooltip.show(event, `${d.label}: ${formatValue(d.value)}`);
        })
        .on('mouseout', () => tooltip.hide());

      g.append('g')
        .attr('transform', `translate(0, 0)`)
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('fill', 'currentColor')
        .attr('font-size', 11)
        .style('opacity', 0.8);

      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat((d, _i) => formatValue(Number(d))))
        .selectAll('text')
        .attr('fill', 'currentColor')
        .attr('font-size', 10)
        .style('opacity', 0.6);

      g.selectAll('.domain, .tick line').remove();

      if (showMax) {
        g.selectAll('.bar-label')
          .data(data)
          .join('text')
          .attr('class', 'bar-label')
          .attr('x', (d) => xScale(d.value) + 4)
          .attr('y', (d) => yScale(d.label)! + yScale.bandwidth() / 2)
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'currentColor')
          .attr('font-size', 10)
          .style('opacity', 0.9)
          .text((d) => formatValue(d.value));
      }
    } else {
      const xScale = d3.scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerWidth])
        .padding(0.25);

      const range = diverging ? Math.max(Math.abs(minVal), Math.abs(maxVal)) * 1.1 : maxVal * 1.1;
      const maxValForScale = diverging ? range : maxVal * 1.1;
      const yScale = d3.scaleLinear()
        .domain(diverging ? [-range, range] : [0, maxValForScale])
        .range([innerHeight, 0]);

      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      if (diverging) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(0))
          .attr('y2', yScale(0))
          .attr('stroke', 'currentColor')
          .attr('stroke-dasharray', '4 2')
          .attr('opacity', 0.3);
      }

      g.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', (d) => xScale(d.label)!)
        .attr('width', xScale.bandwidth())
        .attr('y', (d) => (d.value >= 0 ? yScale(d.value) : yScale(0)))
        .attr('height', (d) => Math.abs(yScale(d.value) - yScale(0)))
        .attr('fill', (d, i) => diverging ? (d.value >= 0 ? '#10b981' : '#ef4444') : (d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]))
        .attr('rx', 2)
        .attr('ry', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          tooltip.show(event, `${d.label}: ${formatValue(d.value)}`);
        })
        .on('mouseout', () => tooltip.hide());

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
        .call(d3.axisLeft(yScale).ticks(5).tickFormat((d, _i) => formatValue(Number(d))))
        .selectAll('text')
        .attr('fill', 'currentColor')
        .attr('font-size', 10)
        .style('opacity', 0.6);

      g.selectAll('.domain, .tick line').remove();
    }
  }, [data, height, formatValue, horizontal, showMax, diverging, wide]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
