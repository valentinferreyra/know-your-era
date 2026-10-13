import type { DisplayOrderedQuestion } from '../question.ts';
import type { DraftAnswer } from '../../game/types.ts';
import { element } from '../dom.ts';

export function renderChoice(question: Extract<DisplayOrderedQuestion, { kind: 'choice' }>, draft: DraftAnswer | undefined,
  onChange: (draft: DraftAnswer) => void): HTMLElement {
  const group = element('fieldset', 'answer-options');
  const legend = element('legend', 'sr-only', 'Choose one answer'); group.append(legend);
  const selected = draft?.kind === 'choice' ? draft.optionId : '';
  for (const item of question.displayOrder?.primary ?? question.options.map(entry => entry.id)) {
    const option = question.options.find(entry => entry.id === item);
    if (!option) continue;
    const label = element('label', `choice-option${selected === option.id ? ' is-selected' : ''}`);
    const input = element('input'); input.type = 'radio'; input.name = `answer-${question.id}`; input.value = option.id;
    input.checked = selected === option.id;
    input.addEventListener('change', () => onChange({ kind: 'choice', optionId: option.id }));
    label.append(input, element('span', 'choice-letter', String.fromCharCode(65 + (question.displayOrder?.primary ?? question.options.map(x => x.id)).indexOf(option.id))));
    label.append(element('span', 'choice-copy', option.label));
    group.append(label);
  }
  return group;
}
