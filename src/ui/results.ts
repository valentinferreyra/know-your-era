import type { Session } from '../game/session.ts';
import { gradeAnswer } from '../game/grade.ts';
import { button, element, heading, pageShell } from './dom.ts';
import { questionAt } from './feedback.ts';

export function renderResults(session: Session, onReview: () => void, onHome: () => void): HTMLElement {
  const correct = session.responses.reduce((count, response, index) => {
    const question = questionAt(session, index);
    return count + (question && response && gradeAnswer(question, response).fullyCorrect ? 1 : 0);
  }, 0);
  const accuracy = Math.round(correct / 10 * 100);
  const content = element('div', 'results-content');
  content.append(element('span', 'result-kicker', 'Daily challenge complete'), heading(`That’s your day, ${session.nickname}.`, 'Ten questions. Your score is on the board.'));
  const belt = element('img', 'results-belt'); belt.src = '/assets/world_heavyweight_title.webp'; belt.alt = ''; belt.width = 320; belt.height = 160; content.append(belt);
  const score = element('div', 'final-score'); score.append(element('strong', '', String(session.score)), element('span', '', 'points')); content.append(score);
  const stats = element('dl', 'result-stats');
  for (const [label, value] of [['Fully correct', `${correct} / 10`], ['Accuracy', `${accuracy}%`], ['Questions', '10 / 10']]) {
    const item = element('div', 'result-stat'); item.append(element('dt', '', label), element('dd', '', value)); stats.append(item);
  }
  content.append(stats, element('p', 'renewal-note', 'A new challenge arrives at midnight (UTC-3).'));
  content.append(button('Review answers', onReview, 'button button-primary'), button('Back to home', onHome, 'button button-secondary'));
  return pageShell(content, 'Final score', onHome);
}
