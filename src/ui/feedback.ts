import type { ClientQuestion } from '../content/types.ts';
import type { DraftAnswer } from '../game/types.ts';
import type { Session } from '../game/session.ts';
import { button, element, heading, pageShell, progressBar } from './dom.ts';
import { answerArt, artImage, eventFor, eventLogo } from './art.ts';
import { scoreAnswer } from '../game/timing.ts';

export function renderFeedback(session: Session, onNext: () => void, onHome: () => void): HTMLElement {
  const index = session.questionIndex;
  const question = questionAt(session, index);
  const answer = session.responses[index];
  if (!question || !answer) return pageShell(heading('Answer unavailable'));
  const grade = scoreAnswer(question, answer, session.timings?.[index]?.elapsedMs);
  const content = element('div', 'feedback-content');
  content.append(progressBar(index));
  const stage = element('div', 'feedback-stage');
  const art = answerArt(question);
  if (art) { const visual = element('div', 'feedback-art'); visual.append(artImage(art, 'stage-art')); stage.append(visual); stage.classList.add('has-art'); }
  const body = element('div', 'feedback-body');
  const logo = eventLogo(question); const event = eventFor(question);
  if (logo) { const banner = element('div', 'event-heading'); banner.append(artImage(logo, 'event-logo'), element('span', 'event-year', event!.date.slice(0, 4))); body.append(banner); }
  body.append(element('span', grade.fullyCorrect ? 'result-kicker is-correct' : 'result-kicker is-incorrect', grade.fullyCorrect ? '✓ Correct' : grade.earnedPoints > 0 ? '◐ Partially correct' : '× Incorrect'));
  body.append(heading(question.prompt));
  const points = element('p', 'points-earned', `${grade.earnedPoints} points earned`); body.append(points);
  if (session.timings?.[index]?.elapsedMs != null) {
    body.append(element('p', 'score-breakdown', `${grade.basePoints} ${grade.fullyCorrect ? 'correct' : 'base points'} + ${grade.speedBonus} speed bonus`));
  }
  if (!grade.fullyCorrect && grade.corrections.length === 1) {
    const reveal = element('div', 'answer-reveal');
    reveal.append(element('p', 'submitted-answer', `Your answer: ${grade.corrections[0]!.submitted}`));
    reveal.append(element('p', 'expected-answer', `Correct answer: ${grade.corrections[0]!.expected}`));
    body.append(reveal);
  } else if (grade.corrections.length === 1) {
    body.append(element('p', 'submitted-answer', `Your answer: ${grade.corrections[0]!.submitted}`));
    body.append(element('p', 'expected-answer', `Correct answer: ${grade.corrections[0]!.expected}`));
  }
  if (grade.corrections.length > 1) {
    const list = element('ul', 'correction-list');
    for (const row of grade.corrections) {
      const entry = element('li', `correction-row${row.correct ? ' is-correct' : ' is-incorrect'}`);
      entry.append(element('span', 'correction-status', row.correct ? '✓' : '×'), element('span', '', `${row.label}: ${row.submitted}`), element('span', 'correction-expected', row.correct ? 'Correct' : `Expected ${row.expected}`)); list.append(entry);
    }
    body.append(list);
  }
  body.append(element('p', 'explanation', question.explanation));
  body.append(button(index === 9 ? 'View results' : 'Next question', onNext, 'button button-primary'));
  stage.append(body); content.append(stage);
  return pageShell(content, 'Answer', onHome);
}

export function questionAt(session: Session, index: number): ClientQuestion | undefined {
  const id = session.selectedQuestions[index]?.questionId;
  return session.contentSnapshot.questions.find(question => question.id === id);
}
export function answerAt(session: Session, index: number): DraftAnswer | null { return session.responses[index] ?? null; }
