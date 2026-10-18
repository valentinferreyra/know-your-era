import type { ClientQuestion, Difficulty } from './content/types.ts';
import { gradeAnswer } from './game/grade.ts';
import { recomputeSessionScore } from './game/session.ts';
import type { Session } from './game/session.ts';

export const STORAGE_KEY = 'know-your-era.progress.v1';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface RecentSession { dayKey: string; questionIds: string[]; score: number; fullyCorrect: number }
export interface SavedProgress { version: 1; revision: number; nickname: string; session: Session | null; recentSessions: RecentSession[] }
export type LoadResult = { status: 'ok'; progress: SavedProgress } | { status: 'unavailable' | 'corrupt' };
export type SaveResult = { status: 'saved'; progress: SavedProgress } | { status: 'unavailable' | 'corrupt' | 'conflict' } | { status: 'newer'; progress: SavedProgress };

const emptyProgress = (): SavedProgress => ({ version: 1, revision: 0, nickname: '', session: null, recentSessions: [] });
const validDifficulty = (value: unknown): value is Difficulty => value === 'easy' || value === 'medium' || value === 'hard';
const isObject = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null && !Array.isArray(value);

function validateSession(value: unknown): value is Session {
  if (!isObject(value) || value.version !== 1 || typeof value.id !== 'string' || !Number.isInteger(value.revision)
    || typeof value.dayKey !== 'string' || typeof value.contentVersion !== 'string' || typeof value.nickname !== 'string'
    || !isObject(value.contentSnapshot) || !Array.isArray(value.contentSnapshot.questions) || !Array.isArray(value.recentQuestionIds)
    || !Array.isArray(value.slots) || value.slots.length !== 10 || !Array.isArray(value.selectedQuestions) || value.selectedQuestions.length !== 10
    || !Array.isArray(value.drafts) || value.drafts.length !== 10 || !Array.isArray(value.responses) || value.responses.length !== 10
    || !Number.isInteger(value.questionIndex) || value.questionIndex < 0 || value.questionIndex > 9
    || !Number.isFinite(value.score) || !isObject(value.difficultyState) || !validDifficulty(value.difficultyState.level)
    || !Number.isInteger(value.difficultyState.correctStreak) || value.difficultyState.correctStreak < 0
    || !Number.isInteger(value.difficultyState.zeroStreak) || value.difficultyState.zeroStreak < 0
    || value.difficultyState.correctStreak > 1 || value.difficultyState.zeroStreak > 1
    || (value.difficultyState.correctStreak > 0 && value.difficultyState.zeroStreak > 0)
    || !['question', 'feedback', 'complete', 'incomplete'].includes(value.phase)) return false;
  if (value.timings !== undefined) {
    if (!Array.isArray(value.timings) || value.timings.length !== 10) return false;
    for (let index = 0; index < 10; index++) {
      const timing = value.timings[index];
      if (timing === null) continue;
      if (!isObject(timing) || !Number.isFinite(timing.startedAt) || timing.startedAt < 0
        || index > value.questionIndex || !value.selectedQuestions[index]
        || (timing.elapsedMs !== null && (!Number.isFinite(timing.elapsedMs) || timing.elapsedMs < 0))
        || (value.responses[index] === null ? timing.elapsedMs !== null : timing.elapsedMs === null)) return false;
    }
  }
  if (value.contentSnapshot.version !== value.contentVersion || !value.contentSnapshot.questions.every((question: unknown) => isObject(question) && typeof question.id === 'string')
    || new Set(value.contentSnapshot.questions.map((question: ClientQuestion) => question.id)).size !== value.contentSnapshot.questions.length
    || new Set(value.recentQuestionIds).size !== value.recentQuestionIds.length) return false;
  const questionById = new Map<string, ClientQuestion>(value.contentSnapshot.questions.map((question: ClientQuestion) => [question.id, question]));
  for (let index = 0; index < 10; index++) {
    const pin = value.selectedQuestions[index];
    if (pin === null) {
      if (index <= value.questionIndex || value.drafts[index] !== null || value.responses[index] !== null) return false;
      continue;
    }
    if (!isObject(pin) || typeof pin.questionId !== 'string' || !isObject(pin.displayOrder)) return false;
    const question = questionById.get(pin.questionId);
    if (!question || !Array.isArray(pin.displayOrder.primary)) return false;
    const expected: string[] = question.kind === 'choice' ? question.options.map((item: { id: string }) => item.id)
      : question.kind === 'ordering' ? question.items.map((item: { id: string }) => item.id)
        : question.kind === 'matching' ? question.left.map((item: { id: string }) => item.id) : [];
    if (pin.displayOrder.primary.length !== expected.length || new Set(pin.displayOrder.primary).size !== expected.length
      || !pin.displayOrder.primary.every((id: unknown) => expected.includes(String(id)))) return false;
    if (question.kind === 'matching') {
      const right = question.right.map((item: { id: string }) => item.id);
      if (!Array.isArray(pin.displayOrder.secondary) || pin.displayOrder.secondary.length !== right.length
        || new Set(pin.displayOrder.secondary).size !== right.length
        || !pin.displayOrder.secondary.every((id: unknown) => right.includes(String(id)))) return false;
    }
    const response = value.responses[index];
    if (response !== null) {
      if (index > value.questionIndex) return false;
      try { gradeAnswer(question, response as Parameters<typeof gradeAnswer>[1]); } catch { return false; }
    }
    const draft = value.drafts[index];
    if (draft !== null) {
      if (!isObject(draft) || draft.kind !== question.kind) return false;
      if (question.kind === 'choice' && (typeof draft.optionId !== 'string' || !question.options.some(item => item.id === draft.optionId))) return false;
      if (question.kind === 'ordering' && (!Array.isArray(draft.itemIds) || new Set(draft.itemIds).size !== draft.itemIds.length
        || !draft.itemIds.every((id: unknown) => question.items.some(item => item.id === id)))) return false;
      if (question.kind === 'matching' && (!isObject(draft.pairs) || Object.keys(draft.pairs).some(id => !question.left.some(item => item.id === id))
        || Object.values(draft.pairs).some((id: unknown) => !question.right.some(item => item.id === id))
        || new Set(Object.values(draft.pairs)).size !== Object.keys(draft.pairs).length)) return false;
    }
  }
  if (!value.selectedQuestions[value.questionIndex]) return false;
  if (value.phase === 'question' && value.responses[value.questionIndex] !== null) return false;
  if ((value.phase === 'feedback' || value.phase === 'complete') && value.responses[value.questionIndex] === null) return false;
  if (value.phase !== 'incomplete' && value.responses.slice(0, value.questionIndex).some((response: unknown) => response === null)) return false;
  if (value.phase === 'complete' && value.responses.some((response: unknown) => response === null)) return false;
  try { value.score = recomputeSessionScore(value as Session); } catch { return false; }
  return true;
}

function decodeProgress(text: string | null): LoadResult {
  if (text === null) return { status: 'ok', progress: emptyProgress() };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isObject(parsed) || parsed.version !== 1 || !Number.isInteger(parsed.revision) || parsed.revision < 1
      || typeof parsed.nickname !== 'string' || !Array.isArray(parsed.recentSessions)
      || (parsed.session !== null && !validateSession(parsed.session))) return { status: 'corrupt' };
    if (parsed.session && parsed.session.nickname !== parsed.nickname) return { status: 'corrupt' };
    if (parsed.recentSessions.length > 14) return { status: 'corrupt' };
    const seenDays = new Set<string>();
    for (const recent of parsed.recentSessions) {
      if (!isObject(recent) || typeof recent.dayKey !== 'string' || !Array.isArray(recent.questionIds)
        || !recent.questionIds.every((id: unknown) => typeof id === 'string') || !Number.isFinite(recent.score)
        || !Number.isInteger(recent.fullyCorrect) || recent.fullyCorrect < 0 || recent.fullyCorrect > 10
        || seenDays.has(recent.dayKey)) return { status: 'corrupt' };
      seenDays.add(recent.dayKey);
    }
    return { status: 'ok', progress: parsed as unknown as SavedProgress };
  } catch { return { status: 'corrupt' }; }
}

export function loadProgress(storage: StorageLike): LoadResult {
  try { return decodeProgress(storage.getItem(STORAGE_KEY)); }
  catch { return { status: 'unavailable' }; }
}

export function saveProgress(storage: StorageLike, progress: SavedProgress, expectedRevision: number): SaveResult {
  let current: LoadResult;
  try { current = decodeProgress(storage.getItem(STORAGE_KEY)); }
  catch { return { status: 'unavailable' }; }
  if (current.status === 'corrupt') return { status: 'corrupt' };
  if (current.status !== 'ok') return { status: 'unavailable' };
  if (current.progress.revision > expectedRevision) return { status: 'newer', progress: current.progress };
  if (current.progress.revision !== expectedRevision || progress.revision !== expectedRevision + 1) return { status: 'conflict' };
  const next = structuredClone(progress);
  if (next.session && !validateSession(next.session)) return { status: 'corrupt' };
  if (next.session) {
    next.session.score = recomputeSessionScore(next.session);
    next.nickname = next.session.nickname;
    if (next.session.phase === 'complete' || next.session.phase === 'incomplete') {
      const questionIds = next.session.selectedQuestions.map(entry => entry?.questionId).filter((id): id is string => Boolean(id));
      const fullyCorrect = next.session.responses.filter(Boolean).reduce((count, answer, index) => {
        const id = next.session!.selectedQuestions[index]?.questionId;
        const question = next.session!.contentSnapshot.questions.find(item => item.id === id);
        return count + (question && answer && gradeAnswer(question, answer).fullyCorrect ? 1 : 0);
      }, 0);
      next.recentSessions = [...next.recentSessions.filter(item => item.dayKey !== next.session!.dayKey), {
        dayKey: next.session.dayKey, questionIds, score: next.session.score, fullyCorrect
      }].slice(-14);
    }
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { status: 'saved', progress: next };
  } catch { return { status: 'unavailable' }; }
}

export function resetProgress(storage: StorageLike): boolean {
  try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}

export function recentQuestionHistory(progress: SavedProgress): string[] {
  return progress.recentSessions.flatMap(session => session.questionIds);
}

export function watchForNewerProgress(target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  currentRevision: number, onNewer: (progress: SavedProgress) => void): () => void {
  const listener = (event: Event) => {
    const change = event as StorageEvent;
    if (change.key !== STORAGE_KEY || change.newValue === null) return;
    const result = decodeProgress(change.newValue);
    if (result.status === 'ok' && result.progress.revision > currentRevision) onNewer(result.progress);
  };
  target.addEventListener('storage', listener);
  return () => target.removeEventListener('storage', listener);
}

