'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface ScatterPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface ScatterSeries {
  key: string;
  data: ScatterPoint[];
  color: string;
}

interface D3ScatterChartProps {
  series: ScatterSeries[];
  height?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Optional tooltip render. Receives the point data. */
  tooltipContent?: (d: ScatterPoint) => string;
}

export function D3ScatterChart({
  series,
  height = 144,
  formatX = (v) => new Date(v).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }),
  formatY = (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)),
  tooltipContent,
}: D3ScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const allPoints = series.flatMap((s) => s.data);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || allPoints.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 5, right: 10, left: 45, bottom: 25 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xMin = d3.min(allPoints, (d) => d.x) ?? 0;
    const xMax = d3.max(allPoints, (d) => d.x) ?? 1;
    const yMin = 0;
    const yMax = (d3.max(allPoints, (d) => d.y) ?? 1) * 1.05;

    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    series.forEach((s) => {
      g.selectAll(`circle.${s.key}`)
        .data(s.data)
        .join('circle')
        .attr('class', s.key)
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => yScale(d.y))
        .attr('r', 4)
        .attr('fill', s.color)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          const content = tooltipContent?.(d) ?? `${formatX(d.x)} · ${formatY(d.y)}`;
          const rect = (event.target as SVGElement).getBoundingClientRect();
          setTooltip({ x: rect.left + rect.width / 2, y: rect.top, content });
        })
        .on('mouseout', () => setTooltip(null));
    });

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((d, _i) => formatX(Number(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.3);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickFormat((d, _i) => formatY(Number(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.3);

    g.selectAll('.domain, .tick line').remove();
  }, [series, height, formatX, formatY, tooltipContent, allPoints.length]);

  return (
    <div ref={containerRef} className="w-full relative">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 text-xs bg-card border border-border shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%) translateY(-6px)' }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
