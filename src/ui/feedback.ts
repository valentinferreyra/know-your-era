import type { ClientQuestion } from '../content/types.ts';
import { gradeAnswer } from '../game/grade.ts';
import type { DraftAnswer } from '../game/types.ts';
import type { Session } from '../game/session.ts';
import { button, element, heading, pageShell, progressBar } from './dom.ts';

export function renderFeedback(session: Session, onNext: () => void, assetLookup: (id?: string) => { path: string; alt: string } | undefined): HTMLElement {
  const index = session.questionIndex;
  const question = questionAt(session, index);
  const answer = session.responses[index];
  if (!question || !answer) return pageShell(heading('Answer unavailable'));
  const grade = gradeAnswer(question, answer);
  const content = element('div', 'feedback-content');
  content.append(progressBar(index));
  content.append(element('span', grade.fullyCorrect ? 'result-kicker is-correct' : 'result-kicker is-incorrect', grade.fullyCorrect ? '✓ Correct' : grade.earnedPoints > 0 ? '◐ Partially correct' : '× Incorrect'));
  content.append(heading(question.prompt));
  const points = element('p', 'points-earned', `${grade.earnedPoints} points earned`); content.append(points);
  if (!grade.fullyCorrect && grade.corrections.length === 1) {
    const reveal = element('div', 'answer-reveal');
    reveal.append(element('p', 'submitted-answer', `Your answer: ${grade.corrections[0]!.submitted}`));
    reveal.append(element('p', 'expected-answer', `Correct answer: ${grade.corrections[0]!.expected}`));
    content.append(reveal);
  } else if (grade.corrections.length === 1) {
    content.append(element('p', 'submitted-answer', `Your answer: ${grade.corrections[0]!.submitted}`));
    content.append(element('p', 'expected-answer', `Correct answer: ${grade.corrections[0]!.expected}`));
  }
  if (grade.corrections.length > 1) {
    const list = element('ul', 'correction-list');
    for (const row of grade.corrections) {
      const entry = element('li', `correction-row${row.correct ? ' is-correct' : ' is-incorrect'}`);
      entry.append(element('span', 'correction-status', row.correct ? '✓' : '×'), element('span', '', `${row.label}: ${row.submitted}`), element('span', 'correction-expected', row.correct ? 'Correct' : `Expected ${row.expected}`)); list.append(entry);
    }
    content.append(list);
  }
  const asset = assetLookup(question.answerAssetId);
  if (asset) { const image = element('img', 'answer-art'); image.src = asset.path; image.alt = asset.alt; image.loading = 'lazy'; content.append(image); }
  content.append(element('p', 'explanation', question.explanation));
  content.append(button(index === 9 ? 'View results' : 'Next question', onNext, 'button button-primary'));
  return pageShell(content, 'Answer');
}

export function questionAt(session: Session, index: number): ClientQuestion | undefined {
  const id = session.selectedQuestions[index]?.questionId;
  return session.contentSnapshot.questions.find(question => question.id === id);
}
export function answerAt(session: Session, index: number): DraftAnswer | null { return session.responses[index] ?? null; }
