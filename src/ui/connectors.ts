export function updateConnectors(container: HTMLElement, pairs: Record<string, string>): void {
  const svg = container.querySelector<SVGSVGElement>('svg.match-lines');
  if (!svg) return;
  const bounds = container.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  svg.replaceChildren();
  for (const [leftId, rightId] of Object.entries(pairs)) {
    const left = container.querySelector<HTMLElement>(`[data-match-left="${CSS.escape(leftId)}"]`);
    const right = container.querySelector<HTMLElement>(`[data-match-right="${CSS.escape(rightId)}"]`);
    if (!left || !right) continue;
    const a = left.getBoundingClientRect(), b = right.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a.right - bounds.left)); line.setAttribute('y1', String(a.top + a.height / 2 - bounds.top));
    line.setAttribute('x2', String(b.left - bounds.left)); line.setAttribute('y2', String(b.top + b.height / 2 - bounds.top));
    line.setAttribute('class', 'match-line'); svg.append(line);
  }
}
