import bundle from './content/generated/questions.json';
import type { ClientContent } from './content/types.ts';
import { loadProgress, saveProgress, recentQuestionHistory, watchForNewerProgress, type SavedProgress, type StorageLike } from './storage.ts';
import { abandonSession, nextQuestion, renameSession, resolveDailySession, setDraft, confirmAnswer, type Session } from './game/session.ts';
import { renderHome } from './ui/home.ts';
import { renderQuestion } from './ui/question.ts';
import { renderFeedback } from './ui/feedback.ts';
import { renderResults } from './ui/results.ts';
import { renderReview } from './ui/review.ts';
import { element } from './ui/dom.ts';

const content = bundle as unknown as ClientContent;
const host = document.querySelector<HTMLElement>('#app');
if (!host) throw new Error('App mount point is missing.');
const safeStorage: StorageLike = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key)
};
const loaded = loadProgress(safeStorage);
let progress: SavedProgress = loaded.status === 'ok' ? loaded.progress : { version: 1, revision: 0, nickname: '', session: null, recentSessions: [] };
let screen: 'home' | 'question' | 'feedback' | 'results' | 'review' = progress.session ? questionScreenFor(progress.session) : 'home';
let notice = loaded.status === 'unavailable' ? 'Storage is unavailable. This run will only last until you close the page.'
  : loaded.status === 'corrupt' ? 'Saved progress could not be read. Reset it to start a fresh challenge.' : '';
let syncPending = false;
let memoryOnly = loaded.status === 'unavailable';

function questionScreenFor(session: Session): typeof screen {
  if (session.phase === 'question') return 'question';
  if (session.phase === 'feedback') return 'feedback';
  return 'results';
}
function commit(session: Session): boolean {
  const next: SavedProgress = { ...progress, revision: progress.revision + 1, nickname: session.nickname, session };
  if (memoryOnly) {
    progress = next;
    notice = 'Progress is only in memory right now. It may not survive a page reload.';
    return true;
  }
  const result = saveProgress(safeStorage, next, progress.revision);
  if (result.status === 'saved') { progress = result.progress; notice = ''; syncPending = false; return true; }
  if (result.status === 'unavailable') {
    memoryOnly = true; progress = next;
    notice = 'Progress is only in memory right now. It may not survive a page reload.';
    return true;
  }
  if (result.status === 'corrupt') { notice = 'Saved progress needs to be reset before it can be updated.'; render(); return false; }
  notice = 'Progress changed in another tab. Reload before continuing so neither attempt is overwritten.';
  syncPending = true; render(); return false;
}

function start(name: string, abandonPrevious: boolean): void {
  const now = new Date();
  let previous = progress.session;
  if (previous && previous.dayKey !== new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
    && previous.phase !== 'complete' && previous.phase !== 'incomplete') {
    if (!abandonPrevious) {
      notice = 'You have an unfinished challenge from a previous day. Starting today will close it as incomplete.';
      render(); return;
    }
    previous = abandonSession(previous);
    if (!commit(previous)) return;
  }
  if (previous && previous.phase === 'complete' && previous.dayKey === new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)) {
    screen = 'results'; render(); return;
  }
  const resolution = resolveDailySession(previous, name, now, content, recentQuestionHistory(progress), abandonPrevious);
  if (resolution.status === 'confirm-abandon') {
    notice = 'You have an unfinished challenge from a previous day. Starting today will close it as incomplete.';
    render(); return;
  }
  const session = resolution.session;
  if (resolution.status === 'started' || session.revision !== (progress.session?.revision ?? -1)) {
    if (!commit(session)) return;
  }
  screen = questionScreenFor(session); render(true);
}

function render(moveFocus = false): void {
  if (!host) return;
  host.replaceChildren();
  if (notice) {
    const banner = element('div', `global-notice${syncPending ? ' is-warning' : ''}`, notice);
    banner.setAttribute('role', syncPending ? 'alert' : 'status'); host.append(banner);
    if (syncPending) {
      const reload = element('button', 'text-button', 'Reload progress'); reload.type = 'button'; reload.addEventListener('click', () => location.reload()); banner.append(reload);
    }
  }
  const session = progress.session;
  const onHome = () => { screen = 'home'; render(true); };
  if (screen === 'home') {
    host.append(renderHome(progress, session, {
      onStart: start,
      onContinue: () => { if (session) { screen = questionScreenFor(session); render(true); } },
      onReview: () => { if (session?.phase === 'complete') { screen = 'review'; render(true); } },
      onReset: () => {
        const confirmed = window.confirm('Reset all saved progress on this browser? This cannot be undone.');
        if (!confirmed) return;
        try { window.localStorage.removeItem('know-your-era.progress.v1'); memoryOnly = false; } catch { memoryOnly = true; /* in-memory reset still recovers the app */ }
        progress = { version: 1, revision: 0, nickname: '', session: null, recentSessions: [] }; notice = ''; screen = 'home'; render(true);
      }
    }, notice));
  } else if (screen === 'question' && session) {
    host.append(renderQuestion(session, {
      onHome,
      onDraft: draft => {
        const focus = answerFocusSelector();
        const updated = setDraft(progress.session!, draft); commit(updated); render();
        if (focus) (host.querySelector<HTMLElement>(focus) ?? host.querySelector<HTMLElement>('.order-choice, .match-option'))?.focus({ preventScroll: true });
      },
      onConfirm: () => {
        if (!progress.session) return;
        try { const updated = confirmAnswer(progress.session); if (commit(updated)) { screen = 'feedback'; render(true); } }
        catch (error) { notice = error instanceof Error ? error.message : 'Could not confirm this answer.'; render(); }
      }
    }));
  } else if (screen === 'feedback' && session) {
    host.append(renderFeedback(session, () => {
      try { const updated = nextQuestion(progress.session!); if (commit(updated)) { screen = questionScreenFor(updated); render(true); } }
      catch (error) { notice = error instanceof Error ? error.message : 'Could not continue.'; render(); }
    }, onHome));
  } else if (screen === 'results' && session) {
    host.append(renderResults(session, () => { screen = 'review'; render(true); }, onHome));
  } else if (screen === 'review' && session) {
    host.append(renderReview(session, onHome));
  } else {
    screen = 'home'; render();
  }
  if (moveFocus) requestAnimationFrame(() => {
    const title = host.querySelector<HTMLElement>('.screen h1');
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  });
}

function answerFocusSelector(): string | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  for (const key of ['data-match-left', 'data-match-right', 'data-match-remove', 'data-order-item', 'value']) {
    const value = active.getAttribute(key);
    if (value !== null) return `[${key}="${CSS.escape(value)}"]`;
  }
}

watchForNewerProgress(window, progress.revision, newer => {
  if (newer.revision > progress.revision) { notice = 'Progress changed in another tab. Reload before continuing so neither attempt is overwritten.'; syncPending = true; render(); }
});

render(Boolean(progress.session));
