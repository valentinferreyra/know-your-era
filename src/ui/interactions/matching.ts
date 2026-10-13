import type { DisplayOrderedQuestion } from '../question.ts';
import type { DraftAnswer } from '../../game/types.ts';
import { button, element } from '../dom.ts';
import { updateConnectors } from '../connectors.ts';
import { artImage, portraitIn } from '../art.ts';

export function renderMatching(question: Extract<DisplayOrderedQuestion, { kind: 'matching' }>, draft: DraftAnswer | undefined,
  onChange: (draft: DraftAnswer) => void): HTMLElement {
  const group = element('div', 'matching-interaction');
  const pairs = draft?.kind === 'matching' ? { ...draft.pairs } : {};
  const leftOrder = question.displayOrder?.primary ?? question.left.map(item => item.id);
  const rightOrder = question.displayOrder?.secondary ?? question.right.map(item => item.id);
  let activeLeft = '';
  let observer: ResizeObserver | undefined;
  const emit = (next: Record<string, string>) => { observer?.disconnect(); onChange({ kind: 'matching', pairs: next }); };
  const board = element('div', 'matching-board');
  const list = (side: 'left' | 'right', ids: string[]) => {
    const column = element('div', `matching-column matching-${side}`);
    for (const id of ids) {
      const item = (side === 'left' ? question.left : question.right).find(entry => entry.id === id); if (!item) continue;
      const connected = side === 'left' ? Boolean(pairs[id]) : Object.values(pairs).includes(id);
      const node = button(item.label, () => {
        if (side === 'left') {
          if (activeLeft === id && pairs[id]) {
            const next = { ...pairs }; delete next[id]; activeLeft = ''; emit(next); return;
          }
          activeLeft = activeLeft === id ? '' : id;
          board.querySelectorAll('[data-match-left]').forEach(entry => entry.classList.toggle('is-active', entry.getAttribute('data-match-left') === activeLeft));
          return;
        }
        if (!activeLeft) {
          const key = Object.keys(pairs).find(leftId => pairs[leftId] === id);
          if (key) { const next = { ...pairs }; delete next[key]; emit(next); }
          return;
        }
        const next = { ...pairs };
        for (const key of Object.keys(next)) if (next[key] === id || key === activeLeft) delete next[key];
        next[activeLeft] = id; activeLeft = '';
        board.querySelectorAll('[data-match-left]').forEach(entry => entry.classList.remove('is-active'));
        emit(next);
      }, `match-option${connected ? ' is-connected' : ''}`);
      node.dataset[side === 'left' ? 'matchLeft' : 'matchRight'] = id;
      node.setAttribute('aria-pressed', String(side === 'left' ? activeLeft === id : connected));
      const art = portraitIn(item.label);
      if (art) { const image = artImage(art, 'match-avatar'); image.alt = ''; node.prepend(image); }
      column.append(node);
    }
    return column;
  };
  board.append(list('left', leftOrder));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('match-lines'); board.append(svg);
  board.append(list('right', rightOrder)); group.append(board);
  const status = element('p', 'interaction-status', `${Object.keys(pairs).length} of ${question.left.length} pairs connected`); status.setAttribute('aria-live', 'polite'); group.append(status);
  const readable = element('ul', 'pair-readout'); readable.setAttribute('aria-label', 'Connected pairs');
  for (const [leftId, rightId] of Object.entries(pairs)) {
    const left = question.left.find(item => item.id === leftId), right = question.right.find(item => item.id === rightId);
    if (left && right) readable.append(element('li', '', `${left.label} — ${right.label}`));
  }
  group.append(readable);
  group.append(button('Reset pairs', () => emit({}), 'text-button'));
  requestAnimationFrame(() => {
    updateConnectors(board, pairs);
    observer = new ResizeObserver(() => updateConnectors(board, pairs));
    observer.observe(board);
    void document.fonts?.ready.then(() => updateConnectors(board, pairs));
  });
  return group;
}
