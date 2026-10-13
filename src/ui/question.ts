import type { ClientQuestion } from '../content/types.ts';
import type { DraftAnswer } from '../game/types.ts';
import type { Session } from '../game/session.ts';
import type { Difficulty } from '../content/types.ts';
import { artImage, eventFor, eventLogo, questionArt } from './art.ts';
import { element, heading, pageShell, progressBar, button } from './dom.ts';
import { renderChoice } from './interactions/choice.ts';
import { renderOrdering } from './interactions/ordering.ts';
import { renderMatching } from './interactions/matching.ts';

export type DisplayOrderedQuestion = ClientQuestion & { displayOrder?: { primary: string[]; secondary?: string[] } };
export interface QuestionActions { onDraft(draft: DraftAnswer): void; onConfirm(): void; onHome(): void }
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
  top.append(element('span', 'player-name', session.nickname), element('span', 'question-count', `Question ${index + 1} of 10`), element('span', 'score-label', `${session.score} points`));
  content.append(top, progressBar(index));
  const stage = element('div', 'question-stage');
  const art = questionArt(question);
  const arena = element('div', 'question-arena');
  if (art) { arena.append(artImage(art, 'stage-art')); stage.classList.add('has-art'); }
  stage.append(arena);
  const body = element('div', 'question-body');
  const event = eventFor(question);
  if (event) {
    const banner = element('div', 'event-heading');
    const logo = eventLogo(question);
    if (logo) banner.append(artImage(logo, 'event-logo'));
    else banner.append(element('span', 'event-name', event.name));
    banner.append(element('span', 'event-year', event.date.slice(0, 4))); body.append(banner);
  }
  const difficulty: Difficulty = question.difficulty;
  const metadata = element('div', 'question-meta');
  metadata.append(element('span', 'category-pill', categoryName[question.category] ?? question.category), element('span', `difficulty-tag difficulty-${difficulty}`, difficulty));
  body.append(metadata, heading(question.prompt));
  const interaction = element('div', 'answer-interaction'); interaction.dataset.kind = question.kind;
  const current = session.drafts[index] ?? undefined;
  let control: HTMLElement;
  switch (question.kind) {
    case 'choice': control = renderChoice(ordered as Extract<DisplayOrderedQuestion, { kind: 'choice' }>, current, actions.onDraft); break;
    case 'ordering': control = renderOrdering(ordered as Extract<DisplayOrderedQuestion, { kind: 'ordering' }>, current, actions.onDraft); break;
    case 'matching': control = renderMatching(ordered as Extract<DisplayOrderedQuestion, { kind: 'matching' }>, current, actions.onDraft); break;
  }
  interaction.append(control); body.append(interaction);
  const confirmed = isComplete(question, current);
  const confirm = button('Confirm', actions.onConfirm, 'button button-primary confirm-button'); confirm.disabled = !confirmed;
  body.append(confirm); stage.append(body); content.append(stage);
  return pageShell(content, 'Daily challenge', actions.onHome);
}

export function isComplete(question: ClientQuestion, draft: DraftAnswer | undefined): boolean {
  if (!draft || draft.kind !== question.kind) return false;
  if (draft.kind === 'choice') return question.kind === 'choice' && question.options.some(item => item.id === draft.optionId);
  if (draft.kind === 'ordering') return question.kind === 'ordering' && draft.itemIds.length === question.items.length;
  return question.kind === 'matching' && Object.keys(draft.pairs).length === question.left.length;
}
