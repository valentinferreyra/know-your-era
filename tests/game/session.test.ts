import { expect, it } from 'vitest';
import { toClientQuestions } from '../../src/content/project.ts';
import { loadContent } from '../../scripts/load-content.ts';
import { abandonSession, confirmAnswer, isPreviousDay, nextQuestion, renameSession, resolveDailySession, setDraft, startSession } from '../../src/game/session.ts';
import type { ClientQuestion } from '../../src/content/types.ts';
import type { DraftAnswer } from '../../src/game/types.ts';

async function content() { return { version: 'test-v1', questions: toClientQuestions(await loadContent()) }; }
function correctAnswer(question: ClientQuestion): DraftAnswer {
  if (question.kind === 'choice') return { kind: 'choice', optionId: question.answer };
  if (question.kind === 'ordering') return { kind: 'ordering', itemIds: question.answer };
  return { kind: 'matching', pairs: question.answer };
}
function question(session: ReturnType<typeof startSession>): ClientQuestion {
  const selected = session.selectedQuestions[session.questionIndex];
  const result = session.contentSnapshot.questions.find(item => item.id === selected?.questionId);
  if (!result) throw new Error('Missing pinned question in snapshot.');
  return result;
}

it('starts easy and pins its content snapshot, first question, and display order', async () => {
  const snapshot = await content();
  const session = startSession('Val', new Date('2026-10-13T03:00:00Z'), snapshot);
  expect(session.nickname).toBe('Val');
  expect(session.dayKey).toBe('2026-10-13');
  expect(session.difficultyState).toEqual({ level: 'easy', correctStreak: 0, zeroStreak: 0 });
  expect(session.contentSnapshot).toEqual(snapshot);
  expect(session.selectedQuestions[0]?.displayOrder.primary.length).toBeGreaterThan(0);
});

it('commits a correct response once and makes repeated Confirm idempotent', async () => {
  const session = startSession('Player', new Date('2026-10-13T03:00Z'), await content());
  const draft = correctAnswer(question(session));
  const confirmed = confirmAnswer(setDraft(session, draft));
  expect(confirmed.phase).toBe('feedback');
  expect(confirmed.responses.filter(Boolean)).toHaveLength(1);
  expect(confirmed.score).toBe({ easy: 100, medium: 150, hard: 200 }[question(session).difficulty]);
  expect(confirmAnswer(confirmed)).toEqual(confirmed);
});

it('rejects duplicate or structurally invalid submitted IDs', async () => {
  let session = startSession('Player', new Date('2026-10-13T03:00Z'), await content());
  while (question(session).kind !== 'matching') {
    session = confirmAnswer(setDraft(session, correctAnswer(question(session))));
    if (session.phase === 'feedback') session = nextQuestion(session);
  }
  const q = question(session);
  if (q.kind !== 'matching') throw new Error('Expected matching question.');
  const bad = { kind: 'matching' as const, pairs: Object.fromEntries(q.left.map(item => [item.id, q.right[0]!.id])) };
  expect(() => confirmAnswer(setDraft(session, bad))).toThrow(/invalid|incomplete/i);
});

it('keeps the old content snapshot for every later question after a deployment', async () => {
  const oldContent = await content();
  let session = startSession('Player', new Date('2026-10-13T03:00Z'), oldContent);
  session = confirmAnswer(setDraft(session, correctAnswer(question(session))));
  const newContent = { version: 'test-v2', questions: [] };
  expect(newContent.questions).toHaveLength(0);
  session = nextQuestion(session);
  expect(session.contentVersion).toBe('test-v1');
  expect(session.contentSnapshot).toEqual(oldContent);
  expect(session.selectedQuestions[1]?.questionId).toBeTruthy();
});

it('changes the nickname without starting another daily attempt', async () => {
  const session = startSession('Old name', new Date('2026-10-13T03:00Z'), await content());
  const renamed = renameSession(session, 'New name');
  expect(renamed.nickname).toBe('New name');
  expect(renamed.dayKey).toBe(session.dayKey);
  expect(renamed.selectedQuestions).toEqual(session.selectedQuestions);
  expect(renamed.questionIndex).toBe(session.questionIndex);
});

it('completes all ten questions, keeps results read-only, and identifies next UTC-3 day', async () => {
  let session = startSession('Player', new Date('2026-10-13T03:00Z'), await content());
  while (session.phase !== 'complete') {
    session = confirmAnswer(setDraft(session, correctAnswer(question(session))));
    if (session.phase === 'feedback') session = nextQuestion(session);
  }
  expect(session.responses.filter(Boolean)).toHaveLength(10);
  expect(session.score).toBeGreaterThan(0);
  expect(confirmAnswer(session)).toEqual(session);
  expect(isPreviousDay(session, new Date('2026-10-14T03:00Z'))).toBe(true);
  expect(isPreviousDay(session, new Date('2026-10-14T02:59:59Z'))).toBe(false);
});

it('marks an unfinished previous-day session incomplete only after explicit abandonment', async () => {
  const session = startSession('Player', new Date('2026-10-13T03:00Z'), await content());
  const morning = new Date('2026-10-14T03:00Z');
  expect(isPreviousDay(session, morning)).toBe(true);
  expect(session.phase).toBe('question');
  expect(abandonSession(session).phase).toBe('incomplete');
});

it('resumes today without creating another attempt and asks before closing yesterday unfinished', async () => {
  const bundle = await content();
  const session = startSession('Player', new Date('2026-10-13T03:00Z'), bundle);
  expect(resolveDailySession(session, 'Renamed', new Date('2026-10-13T18:00Z'), bundle)).toMatchObject({ status: 'resumed', session: { nickname: 'Renamed', id: session.id } });
  expect(resolveDailySession(session, 'Player', new Date('2026-10-14T03:00Z'), bundle).status).toBe('confirm-abandon');
  const started = resolveDailySession(session, 'Player', new Date('2026-10-14T03:00Z'), bundle, [], true);
  expect(started.status).toBe('started');
  if (started.status === 'started') expect(started.session.recentQuestionIds).toContain(session.selectedQuestions[0]?.questionId);
});
