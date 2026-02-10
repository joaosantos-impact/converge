'use client';

import { useEffect, useRef, useId } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface DualAreaPoint {
  timestamp: string;
  date: string;
  a: number;
  b: number;
}

interface D3DualAreaChartProps {
  data: DualAreaPoint[];
  height?: number;
  colorA?: string;
  colorB?: string;
  formatValue?: (v: number) => string;
  formatDate?: (d: string) => string;
  labelA?: string;
  labelB?: string;
}

export function D3DualAreaChart({
  data,
  height = 280,
  colorA = '#8b5cf6',
  colorB = '#f97316',
  formatValue = (v) => v.toFixed(1),
  formatDate = (d) => d,
  labelA = 'A',
  labelB = 'B',
}: D3DualAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientIdA = useId().replace(/:/g, '') + 'a';
  const gradientIdB = useId().replace(/:/g, '') + 'b';

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 20, right: 20, bottom: 30, left: 84 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const baseValue = Math.min(
      d3.min(data, (d) => d.a) ?? 0,
      d3.min(data, (d) => d.b) ?? 0
    );
    const maxVal = Math.max(
      d3.max(data, (d) => d.a) ?? 0,
      d3.max(data, (d) => d.b) ?? 0
    );

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([Math.min(baseValue, 0) * 1.05, maxVal * 1.05])
      .range([innerHeight, 0])
      .nice();

    const areaA = d3.area<DualAreaPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(yScale(baseValue))
      .y1((d) => yScale(d.a))
      .curve(d3.curveMonotoneX);

    const areaB = d3.area<DualAreaPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(yScale(baseValue))
      .y1((d) => yScale(d.b))
      .curve(d3.curveMonotoneX);

    const lineA = d3.line<DualAreaPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.a))
      .curve(d3.curveMonotoneX);

    const lineB = d3.line<DualAreaPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.b))
      .curve(d3.curveMonotoneX);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    defs.append('linearGradient')
      .attr('id', `dual-grad-${gradientIdA}`)
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1)
      .selectAll('stop')
      .data([{ offset: '0%', opacity: 0.35 }, { offset: '100%', opacity: 0 }])
      .join('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', colorA)
      .attr('stop-opacity', (d) => d.opacity);
    defs.append('linearGradient')
      .attr('id', `dual-grad-${gradientIdB}`)
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1)
      .selectAll('stop')
      .data([{ offset: '0%', opacity: 0.25 }, { offset: '100%', opacity: 0 }])
      .join('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', colorB)
      .attr('stop-opacity', (d) => d.opacity);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    g.append('path')
      .datum(data)
      .attr('fill', `url(#dual-grad-${gradientIdA})`)
      .attr('d', areaA);

    g.append('path')
      .datum(data)
      .attr('fill', `url(#dual-grad-${gradientIdB})`)
      .attr('d', areaB);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colorA)
      .attr('stroke-width', 2.5)
      .attr('d', lineA);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colorB)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 3')
      .attr('d', lineB);

    const tooltip = createD3Tooltip(containerRef.current);
    const bisect = d3.bisector((d: DualAreaPoint) => new Date(d.timestamp).getTime()).left;

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
        const date = xScale.invert(mx);
        const idx = Math.min(bisect(data, date), data.length - 1);
        const d = data[idx];
        crosshair.attr('x1', mx).attr('x2', mx).style('display', null);
        if (d) {
          tooltip.show(event, `${formatDate(d.timestamp)} — ${labelA}: ${formatValue(d.a)} · ${labelB}: ${formatValue(d.b)}`);
        }
      })
      .on('mouseout', () => {
        crosshair.style('display', 'none');
        tooltip.hide();
      });

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat((d) => formatDate((d as Date).toISOString())))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 11)
      .style('opacity', 0.6);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d, _i) => formatValue(Number(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 11)
      .style('opacity', 0.6);

    g.selectAll('.domain, .tick line').remove();
  }, [data, height, colorA, colorB, formatValue, formatDate, gradientIdA, gradientIdB, labelA, labelB]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
