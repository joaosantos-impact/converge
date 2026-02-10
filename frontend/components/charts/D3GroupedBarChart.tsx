'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface GroupedBarPoint {
  label: string;
  [seriesKey: string]: string | number;
}

interface D3GroupedBarChartProps {
  data: GroupedBarPoint[];
  seriesKeys: string[];
  seriesColors?: Record<string, string>;
  height?: number;
  formatValue?: (v: number) => string;
  formatLabel?: (x: string) => string;
}

const DEFAULT_COLORS = ['rgba(255,255,255,0.6)', 'rgba(239,68,68,0.6)', '#3b82f6', '#10b981'];

export function D3GroupedBarChart({
  data,
  seriesKeys,
  seriesColors = {},
  height = 160,
  formatValue = (v) => v.toFixed(0),
  formatLabel = (x) => x,
}: D3GroupedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 10, right: 10, bottom: 30, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxVal = d3.max(data, (d) =>
      Math.max(...seriesKeys.map((k) => Number(d[k]) ?? 0))
    ) ?? 1;

    const xScale = d3.scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const subScale = d3.scaleBand()
      .domain(seriesKeys)
      .range([0, xScale.bandwidth()])
      .padding(0.05);

    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([innerHeight, 0]);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    data.forEach((d) => {
      const x0 = xScale(d.label) ?? 0;
      seriesKeys.forEach((key, i) => {
        const val = Number(d[key]) ?? 0;
        const color = seriesColors[key] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        g.append('rect')
          .attr('x', x0 + (subScale(key) ?? 0))
          .attr('y', yScale(val))
          .attr('width', subScale.bandwidth())
          .attr('height', innerHeight - yScale(val))
          .attr('fill', color)
          .attr('rx', 1)
          .attr('ry', 1);
      });
    });

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d, _i) => formatLabel(String(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.3);

    g.selectAll('.domain, .tick line').remove();
  }, [data, seriesKeys, height, formatValue, formatLabel, seriesColors]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
