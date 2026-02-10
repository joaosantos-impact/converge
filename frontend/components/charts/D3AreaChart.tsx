'use client';

import { useEffect, useRef, useId } from 'react';
import * as d3 from 'd3';
import { createD3Tooltip } from '@/lib/d3-tooltip';

export interface AreaDataPoint {
  timestamp: string;
  value: number;
}

export interface AreaChartMarker {
  timestamp: string;
  value: number;
  type: 'buy' | 'sell';
  label?: string;
  cost?: number;
  amount?: number;
}

interface D3AreaChartProps {
  data: AreaDataPoint[];
  height?: number;
  strokeColor?: string;
  formatValue?: (v: number) => string;
  formatDate?: (ts: string) => string;
  /** When true, renders "Max X" inside the chart. When false, parent renders max in header. */
  showMax?: boolean;
  markers?: AreaChartMarker[];
  /** Enable zoom (scroll) and pan (drag). Default true. */
  interactive?: boolean;
}

export function D3AreaChart({
  data,
  height = 320,
  strokeColor = '#ca8a04',
  formatValue = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  formatDate = (ts) => new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
  showMax = true,
  markers,
  interactive = true,
}: D3AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = Math.max(containerRef.current.clientWidth || 400, 300);
    const margin = { top: 20, right: 20, bottom: 30, left: 84 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale0 = d3.scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth]);
    let xScale = xScale0.copy();

    const maxVal = d3.max(data, (d) => d.value) ?? 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.05])
      .range([innerHeight, 0])
      .nice();

    const area = d3.area<AreaDataPoint>()
      .y0(innerHeight)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const line = d3.line<AreaDataPoint>()
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    g.append('defs').append('linearGradient')
      .attr('id', `area-gradient-${gradientId}`)
      .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1)
      .selectAll('stop')
      .data([
        { offset: '0%', opacity: 0.35 },
        { offset: '100%', opacity: 0.02 },
      ])
      .join('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', strokeColor)
      .attr('stop-opacity', (d) => d.opacity);

    const areaPath = g.append('path')
      .datum(data)
      .attr('fill', `url(#area-gradient-${gradientId})`);

    const linePath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2.5);

    const tooltip = createD3Tooltip(containerRef.current);
    const bisect = d3.bisector((d: AreaDataPoint) => new Date(d.timestamp).getTime()).left;

    const crosshair = g.append('line')
      .attr('class', 'chart-crosshair')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.5)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('display', 'none');

    const xAxisG = g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`);

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => formatValue(Number(d))))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', 11)
      .style('opacity', 0.6);

    g.selectAll('.domain, .tick line').remove();

    let markerGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    if (markers?.length && data.length > 0) {
      markerGroup = g.append('g').attr('class', 'markers');
    }

    const redraw = () => {
      area.x((d) => xScale(new Date(d.timestamp)));
      line.x((d) => xScale(new Date(d.timestamp)));
      areaPath.attr('d', area);
      linePath.attr('d', line);
      xAxisG
        .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => formatDate(String(d) as string)))
        .selectAll('text')
        .attr('fill', 'currentColor')
        .attr('font-size', 11)
        .style('opacity', 0.6);
      xAxisG.selectAll('.domain, .tick line').remove();
      if (markerGroup && markers?.length) {
        markerGroup.selectAll('*').remove();
        markers.forEach((m) => {
          const x = xScale(new Date(m.timestamp));
          const y = yScale(m.value);
          const circle = markerGroup!
            .append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 3)
            .attr('fill', m.type === 'buy' ? '#10b981' : '#ef4444')
            .attr('stroke', 'hsl(var(--background))')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');

          const costStr = m.cost != null ? formatValue(m.cost) : null;
          const amountStr = m.amount != null ? m.amount.toLocaleString('pt-PT', { maximumFractionDigits: 4, minimumFractionDigits: 0 }) : null;
          const tooltipParts: string[] = [];
          if (m.type === 'buy') tooltipParts.push('Compra');
          else tooltipParts.push('Venda');
          if (amountStr != null) tooltipParts.push(`${amountStr} ${m.type === 'buy' ? 'comprados' : 'vendidos'}`);
          if (costStr != null) tooltipParts.push(`${costStr} €`);

          if (tooltipParts.length > 1) {
            circle
              .on('mouseover', (event) => {
                event.stopPropagation();
                tooltip.show(event, tooltipParts.join(' · '));
              })
              .on('mouseout', (event) => {
                event.stopPropagation();
                tooltip.hide();
              });
          }
        });
      }
    };

    redraw();

    const zoomRect = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', interactive ? 'grab' : 'crosshair');

    if (interactive) {
      const dataExtent = xScale0.domain() as [Date, Date];
      const t0 = dataExtent[0].getTime();
      const t1 = dataExtent[1].getTime();

      const constrainTransform = (t: d3.ZoomTransform) => {
        const s = t.rescaleX(xScale0);
        const [d0, d1] = s.domain();
        const d0t = d0.getTime();
        const d1t = d1.getTime();
        const clampedD0 = Math.max(d0t, t0);
        const clampedD1 = Math.min(d1t, t1);
        if (clampedD0 !== d0t || clampedD1 !== d1t) {
          const k = (t1 - t0) / (clampedD1 - clampedD0);
          const tx = -k * xScale0(new Date(clampedD0));
          return new d3.ZoomTransform(k, tx, 0);
        }
        return t;
      };

      const zoom = d3.zoom<SVGRectElement, unknown>()
        .scaleExtent([1, 40])
        .extent([[0, 0], [innerWidth, innerHeight]])
        .constrain(constrainTransform)
        .on('zoom', function (event) {
          xScale = event.transform.rescaleX(xScale0);
          redraw();
        })
        .on('end', function () {
          d3.select(this).style('cursor', 'grab');
        })
        .on('start', function () {
          d3.select(this).style('cursor', 'grabbing');
        });
      zoomRect.call(zoom);
    }

    zoomRect
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event, this);
        const date = xScale.invert(mx);
        const idx = Math.min(bisect(data, date), data.length - 1);
        const d = data[idx];
        crosshair.attr('x1', mx).attr('x2', mx).style('display', null);
        if (d) {
          tooltip.show(event, `${formatDate(d.timestamp)}: ${formatValue(d.value)}`);
        }
      })
      .on('mouseout', () => {
        crosshair.style('display', 'none');
        tooltip.hide();
      });

    if (showMax && data.length > 0) {
      const maxPoint = data.reduce((a, b) => (a.value >= b.value ? a : b));
      g.append('text')
        .attr('x', innerWidth + 8)
        .attr('y', yScale(maxPoint.value))
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'currentColor')
        .attr('font-size', 10)
        .style('opacity', 0.7)
        .text(`Max ${formatValue(maxPoint.value)}`);
    }
  }, [data, height, strokeColor, formatValue, formatDate, showMax, gradientId, markers, interactive]);

  if (!data.length) return null;

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" style={{ height }} />
    </div>
  );
}
