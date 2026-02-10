/**
 * Creates a D3 tooltip that follows the cursor and shows custom content.
 * Usage: call show(element, content) on mouseover, hide() on mouseout.
 * Reuses existing tooltip if present (call before each chart render).
 */
export function createD3Tooltip(container: HTMLElement) {
  const existing = container.querySelector<HTMLDivElement>('.chart-tooltip');
  const tooltip: HTMLDivElement = existing ?? (() => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tooltip');
    el.className = 'chart-tooltip';
    el.style.cssText = `
    position: absolute;
    z-index: 9999;
    pointer-events: none;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    background: #171717;
    color: #fafafa;
    border: 1px solid #404040;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    opacity: 0;
    transform: translate(-50%, -100%) translateY(-8px);
    transition: opacity 0.15s ease;
    white-space: nowrap;
    max-width: 280px;
  `;
    container.style.position = 'relative';
    container.appendChild(el);
    return el;
  })();

  function show(
    el: { clientX: number; clientY: number } | DOMRect | SVGGraphicsElement,
    content: string | Node
  ) {
    tooltip.innerHTML = '';
    if (typeof content === 'string') {
      tooltip.textContent = content;
    } else {
      tooltip.appendChild(content);
    }
    tooltip.style.opacity = '1';

    const rect = container.getBoundingClientRect();
    let x: number;
    let y: number;

    if (el && typeof (el as { clientX?: number }).clientX === 'number') {
      const e = el as { clientX: number; clientY: number };
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else if (el && 'getBoundingClientRect' in el) {
      const r = (el as SVGGraphicsElement).getBoundingClientRect();
      x = r.left - rect.left + r.width / 2;
      y = r.top - rect.top - 4;
    } else {
      x = rect.width / 2;
      y = rect.height / 2;
    }

    tooltip.style.left = `${Math.min(Math.max(x, 0), rect.width - 20)}px`;
    tooltip.style.top = `${Math.max(y, 0)}px`;
    tooltip.style.transform = 'translate(-50%, -100%) translateY(-8px)';
  }

  function hide() {
    tooltip.style.opacity = '0';
  }

  return { show, hide, element: tooltip };
}
