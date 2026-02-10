'use client';

import { useEffect, useRef, useId } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface LineDataPoint {
  x: string;
  value: number;
}

export interface MultiLineDataPoint {
  x: string;
  [seriesKey: string]: string | number;
}

interface D3LineChartProps {
  /** Single line: { x, value }[] | Multi-line: { x, ...seriesKeys }[] */
  data: LineDataPoint[] | MultiLineDataPoint[];
  /** Multi-line: pass seriesKeys. Each seriesKey maps to a numeric value in data */
  seriesKeys?: string[];
  /** Optional labels for tooltip (e.g. { volumeVenda: 'Venda', volumeCompra: 'Compra' }) */
  seriesLabels?: Record<string, string>;
  seriesColors?: Record<string, string>;
  height?: number;
  formatValue?: (v: number) => string;
  formatLabel?: (x: string) => string;
  showMax?: boolean;
  /** Fill area below each line (to y=0) */
  showArea?: boolean;
  /** Enable overlay with crosshair + tooltip on hover */
  showCrosshair?: boolean;
  /** Wider left margin for long y-axis labels */
  wide?: boolean;
}

const DEFAULT_SERIES_COLORS = ['#ca8a04', '#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444'];

export function D3LineChart({
  data,
  seriesKeys,
  seriesLabels = {},
  seriesColors = {},
  height = 260,
  formatValue = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  formatLabel = (x) => x,
  showMax = false,
  showArea = false,
  showCrosshair = false,
  wide = false,
}: D3LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId().replace(/:/g, '');

  const isMulti = Boolean(seriesKeys && seriesKeys.length > 0);
  const keys = seriesKeys ?? ['value'];

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 15, right: showMax ? 50 : 15, bottom: 30, left: wide ? 72 : 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const dataArr = data as MultiLineDataPoint[];
    const tooltip = createD3Tooltip(containerRef.current);

    const xScale = d3.scaleBand()
      .domain(dataArr.map((d) => d.x))
      .range([0, innerWidth])
      .padding(0.1);

    let maxVal = 0;
    keys.forEach((k) => {
      const m = d3.max(dataArr, (d) => Number(d[k]) ?? 0) ?? 0;
      if (m > maxVal) maxVal = m;
    });

    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.05])
      .range([innerHeight, 0])
      .nice();

    const getX = (d: { x: string }) => (xScale(d.x) ?? 0) + xScale.bandwidth() / 2;
    const line = d3.line<LineDataPoint | MultiLineDataPoint>()
      .x(getX)
      .curve(d3.curveMonotoneX);

    const area = d3.area<{ x: string; y: number }>()
      .x((d) => getX(d))
      .y0(innerHeight)
      .y1((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    const defs = showArea ? g.append('defs') : null;

    keys.forEach((key, i) => {
      const color = seriesColors[key] ?? DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
      const pathData = dataArr.map((d) => ({ ...d, y: Number(d[key]) ?? 0 })).filter((d) => !Number.isNaN(d.y));
      if (pathData.length === 0) return;

      if (showArea && defs) {
        defs.append('linearGradient')
          .attr('id', `line-grad-${gradientId}-${i}`)
          .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1)
          .selectAll('stop')
          .data([{ offset: '0%', opacity: 0.25 }, { offset: '100%', opacity: 0.02 }])
          .join('stop')
          .attr('offset', (d) => d.offset)
          .attr('stop-color', color)
          .attr('stop-opacity', (d) => d.opacity);
        g.append('path')
          .datum(pathData as Array<{ x: string; y: number }>)
          .attr('fill', `url(#line-grad-${gradientId}-${i})`)
          .attr('d', area);
      }

      const lineGen = line.y((d) => yScale(Number((d as unknown as { y: number }).y)));
      g.append('path')
        .datum(pathData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', (d) => lineGen(d as Array<{ x: string; y: number }>) ?? '');

      g.selectAll(`.dot-${key}`)
        .data(pathData)
        .join('circle')
        .attr('class', `dot-${key}`)
        .attr('cx', (d) => (xScale(d.x) ?? 0) + xScale.bandwidth() / 2)
        .attr('cy', (d) => yScale((d as { y: number }).y))
        .attr('r', 3)
        .attr('fill', color)
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          const val = (d as { y: number }).y;
          const displayKey = seriesLabels[key] ?? key;
          const label = keys.length > 1 ? `${displayKey}: ${formatValue(val)}` : formatValue(val);
          tooltip.show(event, `${formatLabel(d.x)} — ${label}`);
        })
        .on('mouseout', () => tooltip.hide());
    });

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d, _i) => formatLabel(String(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.6)
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d, _i) => formatValue(Number(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 10)
      .style('opacity', 0.6);

    g.selectAll('.domain, .tick line').remove();

    if (showMax && keys.length === 1 && dataArr.length > 0) {
      const maxPoint = dataArr.reduce((a, b) => {
        const va = Number(a[keys[0]]) ?? 0;
        const vb = Number(b[keys[0]]) ?? 0;
        return va >= vb ? a : b;
      });
      const maxV = Number(maxPoint[keys[0]]) ?? 0;
      g.append('text')
        .attr('x', innerWidth + 8)
        .attr('y', yScale(maxV))
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'currentColor')
        .attr('font-size', 10)
        .style('opacity', 0.7)
        .text(`Max ${formatValue(maxV)}`);
    }

    if (showCrosshair) {
      const crosshair = g.append('line')
        .attr('class', 'chart-crosshair')
        .attr('stroke', 'currentColor')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 4')
        .attr('opacity', 0.5)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .style('display', 'none');

      g.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event, this);
          const domain = xScale.domain();
          let closest = domain[0];
          let bestDist = Infinity;
          domain.forEach((val) => {
            const cx = (xScale(val) ?? 0) + xScale.bandwidth() / 2;
            const dist = Math.abs(mx - cx);
            if (dist < bestDist) {
              bestDist = dist;
              closest = val;
            }
          });
          const xVal = closest;
          const d = dataArr.find((r) => r.x === xVal);
          if (d) {
            const cx = (xScale(xVal) ?? 0) + xScale.bandwidth() / 2;
            crosshair.attr('x1', cx).attr('x2', cx).style('display', null);
            const parts = keys.map((k) => `${seriesLabels[k] ?? k}: ${formatValue(Number(d[k]) ?? 0)}`).join(' · ');
            tooltip.show(event, `${formatLabel(xVal)} — ${parts}`);
          }
        })
        .on('mouseout', () => {
          crosshair.style('display', 'none');
          tooltip.hide();
        });
    }
  }, [data, keys, height, formatValue, formatLabel, showMax, showArea, showCrosshair, wide, seriesColors, seriesLabels, isMulti, gradientId]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
