import type { Session } from '../game/session.ts';
import { gradeAnswer } from '../game/grade.ts';
import { button, element, heading, pageShell } from './dom.ts';
import { questionAt } from './feedback.ts';

export function renderReview(session: Session, onHome: () => void): HTMLElement {
  const content = element('div', 'review-content'); content.append(heading('Answer review', 'Your answers and the moments behind them.'));
  const list = element('ol', 'review-list');
  for (let index = 0; index < 10; index++) {
    const question = questionAt(session, index), answer = session.responses[index];
    if (!question || !answer) continue;
    const grade = gradeAnswer(question, answer);
    const item = element('li', `review-item${grade.fullyCorrect ? ' is-correct' : ' is-incorrect'}`);
    item.append(element('span', 'review-status', grade.fullyCorrect ? '✓ Correct' : grade.earnedPoints > 0 ? '◐ Partial' : '× Incorrect'), element('h2', 'review-question', `Q${index + 1}. ${question.prompt}`));
    for (const correction of grade.corrections) item.append(element('p', 'review-answer', `${correction.label}: ${correction.submitted}${correction.correct ? '' : ` · Correct: ${correction.expected}`}`));
    item.append(element('p', 'review-explanation', question.explanation)); list.append(item);
  }
  content.append(list, button('Back to home', onHome, 'button button-secondary'));
  return pageShell(content, 'Review');
}
