import type { SavedProgress } from '../storage.ts';
import { brandLogo, button, element, pageShell } from './dom.ts';
import type { Session } from '../game/session.ts';
import { dailyKey } from '../game/day.ts';

export interface HomeActions { onStart(name: string, abandonPrevious: boolean): void; onContinue(): void; onReview(): void; onReset(): void }

export function renderHome(progress: SavedProgress, session: Session | null, actions: HomeActions,
  message = ''): HTMLElement {
  const content = element('div', 'home-content');
  const title = element('h1', 'home-title'); title.setAttribute('aria-label', 'Know Your Era');
  const brand = brandLogo(); brand.querySelector('img')!.alt = ''; title.append(brand);
  content.append(title, element('p', 'home-intro', '10 questions. A new challenge every day.'));
  const form = element('form', 'home-form');
  const label = element('label', 'field-label', 'Your name'); label.htmlFor = 'player-name';
  const name = element('input', 'text-answer'); name.id = 'player-name'; name.name = 'name'; name.maxLength = 28;
  name.value = session?.nickname ?? progress.nickname; name.required = true; name.placeholder = 'Enter your name';
  const continuingToday = session?.dayKey === dailyKey(new Date()) && (session.phase === 'question' || session.phase === 'feedback');
  const submit = element('button', 'button button-primary', continuingToday ? 'Continue challenge' : 'Play daily challenge'); submit.type = 'submit';
  form.append(label, name, submit);
  form.addEventListener('submit', event => { event.preventDefault(); if (name.value.trim()) actions.onStart(name.value.trim(), false); });
  content.append(form);
  if (message) { const notice = element('p', 'notice', message); notice.setAttribute('role', 'status'); content.append(notice); }
  if (message.includes('unfinished challenge')) {
    content.append(button('Start today and close the old challenge', () => actions.onStart(name.value || session?.nickname || progress.nickname, true), 'button button-secondary home-secondary'));
  }
  if (session && !continuingToday && (session.phase === 'question' || session.phase === 'feedback')) {
    content.append(button('Continue challenge', actions.onContinue, 'button button-secondary home-secondary'));
  }
  if (session && session.phase === 'complete') content.append(button('Review answers', actions.onReview, 'button button-secondary home-secondary'));
  if (progress.revision > 0 || message.toLowerCase().includes('reset')) content.append(button('Reset local progress', actions.onReset, 'text-button reset-progress'));
  return pageShell(content);
}
