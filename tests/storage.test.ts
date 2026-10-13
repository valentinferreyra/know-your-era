import { expect, it } from 'vitest';
import { loadProgress, resetProgress, saveProgress, watchForNewerProgress, STORAGE_KEY, type StorageLike } from '../src/storage.ts';
import { abandonSession, confirmAnswer, nextQuestion, setDraft, startSession } from '../src/game/session.ts';
import { loadContent } from '../scripts/load-content.ts';
import { toClientQuestions } from '../src/content/project.ts';
import type { ClientQuestion } from '../src/content/types.ts';
import type { DraftAnswer } from '../src/game/types.ts';

class MemoryStorage implements StorageLike {
  value: string | null = null;
  failRead = false;
  failWrite = false;
  getItem() { if (this.failRead) throw new Error('denied'); return this.value; }
  setItem(_key: string, value: string) { if (this.failWrite) throw new Error('quota'); this.value = value; }
  removeItem() { this.value = null; }
}

async function saved(revision = 1) {
  const bundle = await loadContent();
  const session = startSession('Player', new Date('2026-10-13T03:00Z'), { version: bundle.version, questions: toClientQuestions(bundle) });
  return { version: 1 as const, revision, nickname: 'Player', session, recentSessions: [] };
}
function answer(question: ClientQuestion): DraftAnswer {
  if (question.kind === 'choice') return { kind: 'choice', optionId: question.answer };
  if (question.kind === 'ordering') return { kind: 'ordering', itemIds: question.answer };
  return { kind: 'matching', pairs: question.answer };
}
function selectedQuestion(session: NonNullable<Awaited<ReturnType<typeof saved>>['session']>): ClientQuestion {
  const id = session.selectedQuestions[session.questionIndex]?.questionId;
  const question = session.contentSnapshot.questions.find(item => item.id === id);
  if (!question) throw new Error('missing selected question');
  return question;
}

it('loads an empty store and round-trips progress in every session phase', async () => {
  const storage = new MemoryStorage();
  expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { revision: 0, session: null } });
  const progress = await saved();
  expect(saveProgress(storage, progress, 0)).toMatchObject({ status: 'saved' });
  expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { revision: 1, session: { phase: 'question' } } });
});

it('reloads question, feedback, completed, and explicitly incomplete sessions', async () => {
  for (const phase of ['question', 'feedback', 'complete', 'incomplete'] as const) {
    const storage = new MemoryStorage();
    const progress = await saved();
    if (phase === 'feedback' || phase === 'complete') {
      let session = progress.session!;
      const questions = session.contentSnapshot.questions;
      while (session.phase !== 'feedback') {
        const current = selectedQuestion(session);
        session = confirmAnswer(setDraft(session, answer(current)));
        if (phase === 'complete' && session.questionIndex < 9) session = nextQuestion(session);
        else break;
      }
      if (phase === 'complete') {
        while (session.phase !== 'complete') {
          if (session.phase === 'feedback') session = nextQuestion(session);
          if (session.phase === 'question') session = confirmAnswer(setDraft(session, answer(selectedQuestion(session))));
        }
      }
      expect(questions.length).toBe(300);
      progress.session = session;
    } else if (phase === 'incomplete') progress.session = abandonSession(progress.session!);
    progress.revision = 1;
    expect(saveProgress(storage, progress, 0)).toMatchObject({ status: 'saved' });
    expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { session: { phase } } });
    if (phase === 'complete') expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { recentSessions: [{ fullyCorrect: 10 }] } });
    if (phase === 'incomplete') expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { recentSessions: [{ questionIds: [expect.any(String)] }] } });
  }
});

it('recomputes the score from committed answers rather than trusting saved totals', async () => {
  const storage = new MemoryStorage();
  const progress = await saved();
  progress.session!.score = 999999;
  saveProgress(storage, progress, 0);
  expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { session: { score: 0 } } });
});

it('reports denied storage and full quota without throwing', async () => {
  const storage = new MemoryStorage();
  storage.failRead = true;
  expect(loadProgress(storage)).toEqual({ status: 'unavailable' });
  storage.failRead = false;
  storage.failWrite = true;
  expect(saveProgress(storage, await saved(), 0)).toEqual({ status: 'unavailable' });
});

it('reports corrupt serialized state and a newer revision instead of overwriting it', async () => {
  const storage = new MemoryStorage();
  storage.value = '{broken';
  expect(loadProgress(storage)).toEqual({ status: 'corrupt' });
  expect(saveProgress(storage, await saved(), 0)).toEqual({ status: 'corrupt' });
  storage.value = JSON.stringify({ version: 1, revision: 3, nickname: 'Later', session: null, recentSessions: [] });
  expect(saveProgress(storage, await saved(4), 2)).toMatchObject({ status: 'newer', progress: { revision: 3 } });
});

it('requires the expected revision before saving and offers a reset for corrupt state', async () => {
  const storage = new MemoryStorage();
  expect(saveProgress(storage, await saved(2), 0)).toEqual({ status: 'conflict' });
  expect(saveProgress(storage, await saved(1), 0)).toMatchObject({ status: 'saved' });
  storage.value = 'null';
  expect(loadProgress(storage)).toEqual({ status: 'corrupt' });
  expect(saveProgress(storage, await saved(1), 0)).toEqual({ status: 'corrupt' });
  expect(resetProgress(storage)).toBe(true);
  expect(loadProgress(storage)).toMatchObject({ status: 'ok', progress: { revision: 0 } });
});

it('notifies another tab when a newer valid revision appears', async () => {
  const storage = new MemoryStorage();
  const progress = await saved();
  saveProgress(storage, progress, 0);
  const target = new EventTarget();
  const received: number[] = [];
  const unsubscribe = watchForNewerProgress(target as Window, 0, newer => received.push(newer.revision));
  const event = new Event('storage');
  Object.defineProperties(event, { key: { value: STORAGE_KEY }, newValue: { value: storage.value } });
  target.dispatchEvent(event);
  expect(received).toEqual([1]);
  unsubscribe();
});
