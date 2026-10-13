import type { DisplayOrderedQuestion } from '../question.ts';
import type { DraftAnswer } from '../../game/types.ts';
import { button, element } from '../dom.ts';
import { updateConnectors } from '../connectors.ts';

export function renderMatching(question: Extract<DisplayOrderedQuestion, { kind: 'matching' }>, draft: DraftAnswer | undefined,
  onChange: (draft: DraftAnswer) => void): HTMLElement {
  const group = element('div', 'matching-interaction');
  const pairs = draft?.kind === 'matching' ? { ...draft.pairs } : {};
  const leftOrder = question.displayOrder?.primary ?? question.left.map(item => item.id);
  const rightOrder = question.displayOrder?.secondary ?? question.right.map(item => item.id);
  let active: { side: 'left' | 'right'; id: string } | null = null;
  let observer: ResizeObserver | undefined;
  const emit = (next: Record<string, string>) => { observer?.disconnect(); onChange({ kind: 'matching', pairs: next }); };
  const hint = element('p', 'interaction-hint', 'Select a name in either column, then its partner.');
  hint.id = `matching-hint-${question.id}`; hint.setAttribute('role', 'status'); group.append(hint);
  const board = element('div', 'matching-board');
  const showSelection = () => {
    board.querySelectorAll<HTMLButtonElement>('.match-option').forEach(node => {
      const selected = active !== null && node.dataset[active.side === 'left' ? 'matchLeft' : 'matchRight'] === active.id;
      node.classList.toggle('is-active', selected); node.setAttribute('aria-pressed', String(selected));
    });
    const name = active && (active.side === 'left' ? question.left : question.right).find(item => item.id === active!.id)?.label;
    hint.textContent = name ? `${name} selected. Choose a partner in the other column.` : 'Select a name in either column, then its partner.';
  };
  const list = (side: 'left' | 'right', ids: string[]) => {
    const column = element('div', `matching-column matching-${side}`);
    for (const id of ids) {
      const item = (side === 'left' ? question.left : question.right).find(entry => entry.id === id); if (!item) continue;
      const leftId = side === 'left' ? id : Object.keys(pairs).find(key => pairs[key] === id);
      const connected = leftId !== undefined && Boolean(pairs[leftId]);
      const node = button('', () => {
        if (!active || active.side === side) {
          active = active?.side === side && active.id === id ? null : { side, id };
          showSelection(); return;
        }
        const nextLeft = side === 'left' ? id : active.id;
        const nextRight = side === 'right' ? id : active.id;
        const next = { ...pairs };
        for (const key of Object.keys(next)) if (key === nextLeft || next[key] === nextRight) delete next[key];
        next[nextLeft] = nextRight; active = null; emit(next);
      }, `match-option${connected ? ' is-connected' : ''}`);
      node.dataset[side === 'left' ? 'matchLeft' : 'matchRight'] = id;
      node.setAttribute('aria-pressed', 'false'); node.setAttribute('aria-describedby', hint.id);
      const badge = element('span', 'match-badge', connected ? String(leftOrder.indexOf(leftId!) + 1) : '');
      badge.setAttribute('aria-hidden', 'true');
      const label = element('span', 'match-label', item.label);
      node.append(...(side === 'left' ? [label, badge] : [badge, label]));
      node.addEventListener('keydown', event => {
        if (event.key === 'Escape') { active = null; showSelection(); }
        if (active?.side === side && event.key === (side === 'left' ? 'ArrowRight' : 'ArrowLeft')) {
          event.preventDefault(); board.querySelector<HTMLButtonElement>(side === 'left' ? '[data-match-right]' : '[data-match-left]')?.focus();
        }
      });
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
    if (!left || !right) continue;
    const row = element('li');
    const badge = element('span', 'pair-number', String(leftOrder.indexOf(leftId) + 1)); badge.setAttribute('aria-hidden', 'true');
    const remove = button('×', () => { const next = { ...pairs }; delete next[leftId]; emit(next); }, 'remove-pair');
    remove.dataset.matchRemove = leftId; remove.setAttribute('aria-label', `Remove ${left.label} pairing`); remove.title = 'Remove pair';
    row.append(badge, element('span', '', `${left.label} — ${right.label}`), remove); readable.append(row);
  }
  group.append(readable);
  const reset = button('Reset pairs', () => emit({}), 'text-button'); reset.disabled = Object.keys(pairs).length === 0; group.append(reset);
  requestAnimationFrame(() => {
    if (!board.isConnected) return;
    updateConnectors(board, pairs);
    observer = new ResizeObserver(() => {
      if (!board.isConnected) { observer?.disconnect(); return; }
      updateConnectors(board, pairs);
    });
    observer.observe(board);
    void document.fonts?.ready.then(() => { if (board.isConnected) updateConnectors(board, pairs); });
  });
  return group;
}
