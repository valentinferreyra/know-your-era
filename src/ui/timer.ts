import type { Session } from '../game/session.ts';
import { bonusRate } from '../game/timing.ts';
import { questionAt } from './feedback.ts';
import { element } from './dom.ts';

export function renderTimer(): HTMLElement {
  const timer = element('div', 'question-timer');
  timer.setAttribute('aria-busy', 'true');
  const face = element('div', 'clock-face');
  const clock = element('span', 'elapsed-time', '…');
  clock.dataset.elapsed = '';
  clock.setAttribute('role', 'timer');
  clock.setAttribute('aria-label', 'Time spent on this question');
  clock.setAttribute('aria-live', 'off');
  const bonus = element('span', 'speed-bonus'); bonus.dataset.speedBonus = '';
  face.append(clock, bonus, element('span', 'clock-label', 'Speed bonus'));
  timer.append(face);
  return timer;
}

export function attachQuestionTimer(root: HTMLElement, session: Session, onReady: () => Session | null): () => void {
  let cancelled = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  const stage = root.querySelector<HTMLElement>('.question-stage');
  const start = () => {
    if (cancelled || !root.isConnected) return;
    const active = onReady();
    if (!active || cancelled) return;
    const timing = active.timings?.[active.questionIndex];
    const question = questionAt(active, active.questionIndex);
    if (!timing || !question) return;
    if (stage) stage.inert = false;
    const clock = root.querySelector<HTMLElement>('[data-elapsed]');
    const bonus = root.querySelector<HTMLElement>('[data-speed-bonus]');
    const timer = root.querySelector<HTMLElement>('.question-timer');
    timer?.setAttribute('aria-busy', 'false');
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - timing.startedAt);
      const seconds = Math.floor(elapsed / 1_000);
      if (clock) clock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      const rate = bonusRate(question.kind, elapsed);
      if (bonus) bonus.textContent = `+${Math.round(rate * 100)}%`;
      timer?.style.setProperty('--remaining', `${rate / 0.25 * 100}%`);
    };
    tick();
    interval = setInterval(tick, 250);
  };
  if (session.timings?.[session.questionIndex]) start();
  else {
    if (stage) stage.inert = true;
    void Promise.all([document.fonts.ready, ...Array.from(root.querySelectorAll('img'), image => image.decode().catch(() => {}))]).then(start);
  }
  return () => { cancelled = true; clearInterval(interval); };
}
