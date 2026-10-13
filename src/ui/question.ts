import type { ClientQuestion } from '../content/types.ts';
import type { DraftAnswer } from '../game/types.ts';
import type { Session } from '../game/session.ts';
import type { Difficulty } from '../content/types.ts';
import eventRecords from '../../content/events.json';
import { element, heading, pageShell, progressBar, button } from './dom.ts';
import { renderChoice } from './interactions/choice.ts';
import { renderOrdering } from './interactions/ordering.ts';
import { renderMatching } from './interactions/matching.ts';

export type DisplayOrderedQuestion = ClientQuestion & { displayOrder?: { primary: string[]; secondary?: string[] } };
export interface QuestionActions { onDraft(draft: DraftAnswer): void; onConfirm(): void }
const categoryName: Record<string, string> = {
  'main-event': 'Main event', 'order-history': 'Order the history',
  'champion-entering': 'Champion entering', 'odd-one-out': 'Odd one out', 'rebuild-card': 'Rebuild the card'
};

export function renderQuestion(session: Session, actions: QuestionActions): HTMLElement {
  const index = session.questionIndex;
  const selection = session.selectedQuestions[index];
  const question = session.contentSnapshot.questions.find(item => item.id === selection?.questionId);
  if (!question) return pageShell(heading('Question unavailable', 'Your saved question could not be found.'));
  const ordered: DisplayOrderedQuestion = Object.assign({}, question, { displayOrder: selection?.displayOrder });
  const content = element('div', 'question-content');
  const top = element('div', 'question-topline');
  top.append(element('span', 'player-name', session.nickname), element('span', 'score-label', `${session.score} points`));
  content.append(top, progressBar(index));
  const difficulty: Difficulty = question.difficulty;
  const metadata = element('div', 'question-meta');
  metadata.append(element('span', 'category-pill', categoryName[question.category] ?? question.category), element('span', `difficulty-tag difficulty-${difficulty}`, `${difficulty} · ${question.kind}`));
  const event = eventRecords.find(record => question.eventIds.includes(record.id));
  if (event) metadata.append(element('span', 'event-tag', `${event.name} · ${event.date.slice(0, 4)}`));
  content.append(metadata, heading(question.prompt));
  const arena = element('div', 'question-arena');
  const asset = findAsset(question.promptAssetId ?? question.logoAssetId);
  if (asset) { const image = element('img', 'question-art'); image.src = asset.path; image.alt = asset.alt; image.loading = 'lazy'; arena.append(image); }
  content.append(arena);
  const interaction = element('div', 'answer-interaction'); interaction.dataset.kind = question.kind;
  const current = session.drafts[index] ?? undefined;
  let control: HTMLElement;
  switch (question.kind) {
    case 'choice': control = renderChoice(ordered as Extract<DisplayOrderedQuestion, { kind: 'choice' }>, current, actions.onDraft); break;
    case 'ordering': control = renderOrdering(ordered as Extract<DisplayOrderedQuestion, { kind: 'ordering' }>, current, actions.onDraft); break;
    case 'matching': control = renderMatching(ordered as Extract<DisplayOrderedQuestion, { kind: 'matching' }>, current, actions.onDraft); break;
  }
  interaction.append(control); content.append(interaction);
  const confirmed = isComplete(question, current);
  const confirm = button('Confirm', actions.onConfirm, 'button button-primary confirm-button'); confirm.disabled = !confirmed;
  content.append(confirm);
  return pageShell(content, 'Daily challenge');
}

function findAsset(id?: string): { path: string; alt: string } | undefined {
  if (!id) return undefined;
  const assets = (window as Window & { eraAssets?: { id: string; path: string; alt: string; suitable?: boolean; promptSafe?: boolean }[] }).eraAssets;
  const asset = assets?.find(item => item.id === id && item.suitable && item.promptSafe);
  return asset ? { path: asset.path, alt: asset.alt } : undefined;
}

export function isComplete(question: ClientQuestion, draft: DraftAnswer | undefined): boolean {
  if (!draft || draft.kind !== question.kind) return false;
  if (draft.kind === 'choice') return question.kind === 'choice' && question.options.some(item => item.id === draft.optionId);
  if (draft.kind === 'ordering') return question.kind === 'ordering' && draft.itemIds.length === question.items.length;
  return question.kind === 'matching' && Object.keys(draft.pairs).length === question.left.length;
}
