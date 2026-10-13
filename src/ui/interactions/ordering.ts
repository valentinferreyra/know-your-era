import type { DisplayOrderedQuestion } from '../question.ts';
import type { DraftAnswer } from '../../game/types.ts';
import { button, element } from '../dom.ts';

export function renderOrdering(question: Extract<DisplayOrderedQuestion, { kind: 'ordering' }>, draft: DraftAnswer | undefined,
  onChange: (draft: DraftAnswer) => void): HTMLElement {
  const group = element('div', 'ordering-interaction');
  const selected = draft?.kind === 'ordering' ? [...draft.itemIds] : [];
  const list = element('ol', 'ordering-list');
  const pending = question.displayOrder?.primary ?? question.items.map(item => item.id);
  for (const id of selected) {
    const item = question.items.find(entry => entry.id === id); if (!item) continue;
    const row = element('li', 'order-placed'); row.dataset.orderPlaced = id;
    row.append(element('span', 'order-number', String(selected.indexOf(id) + 1)), element('span', 'order-label', item.label)); list.append(row);
  }
  group.append(list);
  const available = element('div', 'order-choices'); available.setAttribute('aria-label', 'Choose the next event');
  for (const id of pending) {
    const item = question.items.find(entry => entry.id === id); if (!item || selected.includes(id)) continue;
    const choice = button(item.label, () => onChange({ kind: 'ordering', itemIds: [...selected, id] }), 'order-choice');
    choice.dataset.orderItem = id; available.append(choice);
  }
  group.append(available);
  const status = element('p', 'interaction-status', `${selected.length} of ${question.items.length} placed`); status.setAttribute('aria-live', 'polite'); group.append(status);
  const controls = element('div', 'interaction-controls');
  controls.append(button('Undo last', () => onChange({ kind: 'ordering', itemIds: selected.slice(0, -1) }), 'text-button'));
  controls.append(button('Reset order', () => onChange({ kind: 'ordering', itemIds: [] }), 'text-button'));
  group.append(controls);
  return group;
}
