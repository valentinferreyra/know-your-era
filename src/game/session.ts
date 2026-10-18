import type { ClientContent, ClientQuestion, Difficulty } from '../content/types.ts';
import { dailyKey, makeDailySlots } from './day.ts';
import { advanceDifficulty } from './difficulty.ts';
import { gradeAnswer } from './grade.ts';
import { selectQuestion } from './select.ts';
import { scoreAnswer } from './timing.ts';
import type { DraftAnswer, PriorGrade, SelectedQuestion, Slot } from './types.ts';

export interface PinnedQuestion { questionId: string; displayOrder: SelectedQuestion['displayOrder'] }
export interface Session {
  version: 1;
  id: string;
  revision: number;
  dayKey: string;
  contentVersion: string;
  nickname: string;
  contentSnapshot: ClientContent;
  recentQuestionIds: string[];
  slots: Slot[];
  selectedQuestions: (PinnedQuestion | null)[];
  drafts: (DraftAnswer | null)[];
  responses: (DraftAnswer | null)[];
  timings?: ({ startedAt: number; elapsedMs: number | null } | null)[];
  questionIndex: number;
  score: number;
  difficultyState: { level: Difficulty; correctStreak: number; zeroStreak: number };
  phase: 'question' | 'feedback' | 'complete' | 'incomplete';
}

function selectedQuestion(session: Session, index = session.questionIndex): ClientQuestion {
  const id = session.selectedQuestions[index]?.questionId;
  const question = session.contentSnapshot.questions.find(entry => entry.id === id);
  if (!question) throw new Error(`Pinned question is missing from the session snapshot at slot ${index + 1}.`);
  return question;
}

function priorGrades(session: Session): PriorGrade[] {
  return session.responses.flatMap((response, index) => {
    if (!response) return [];
    const selected = session.selectedQuestions[index];
    const question = selected && session.contentSnapshot.questions.find(entry => entry.id === selected.questionId);
    if (!question) return [];
    return [{ difficulty: question.difficulty, fullyCorrect: gradeAnswer(question, response).fullyCorrect }];
  });
}

function pin(question: SelectedQuestion): PinnedQuestion {
  return { questionId: question.question.id, displayOrder: question.displayOrder };
}

export function startSession(nickname: string, now: Date, content: ClientContent, recentQuestionIds: string[] = []): Session {
  const cleanName = nickname.trim();
  if (!cleanName) throw new Error('Enter a name to start the daily challenge.');
  if (!content.version || !Array.isArray(content.questions) || !content.questions.length) throw new Error('Question content is unavailable.');
  const dayKey = dailyKey(now);
  const slots = makeDailySlots(dayKey, content.version);
  const first = selectQuestion(content.questions, { dayKey, contentVersion: content.version, slots, slotIndex: 0,
    level: 'easy', usedFamilies: [], usedConflictGroups: [], recentQuestionIds, priorGradedDifficulties: [] });
  return {
    version: 1, id: `${dayKey}:${content.version}`, revision: 0, dayKey, contentVersion: content.version,
    nickname: cleanName, contentSnapshot: structuredClone(content), recentQuestionIds: [...recentQuestionIds], slots,
    selectedQuestions: [pin(first), ...Array.from({ length: 9 }, () => null)],
    drafts: Array.from({ length: 10 }, () => null), responses: Array.from({ length: 10 }, () => null),
    timings: Array.from({ length: 10 }, () => null),
    questionIndex: 0, score: 0, difficultyState: { level: 'easy', correctStreak: 0, zeroStreak: 0 }, phase: 'question'
  };
}

export function setDraft(session: Session, draft: DraftAnswer): Session {
  if (session.phase !== 'question') throw new Error('Answers can only be changed during a question.');
  const question = selectedQuestion(session);
  if (draft.kind !== question.kind) throw new Error('The answer type does not match this question.');
  const drafts = [...session.drafts];
  drafts[session.questionIndex] = structuredClone(draft);
  return { ...session, revision: session.revision + 1, drafts };
}

export function beginQuestionTimer(session: Session, now = Date.now()): Session {
  if (session.phase !== 'question' || session.timings?.[session.questionIndex]) return session;
  const timings = session.timings ? [...session.timings] : Array.from({ length: 10 }, () => null);
  timings[session.questionIndex] = { startedAt: now, elapsedMs: null };
  return { ...session, revision: session.revision + 1, timings };
}

export function confirmAnswer(session: Session, now = Date.now()): Session {
  if (session.phase !== 'question') return session;
  const draft = session.drafts[session.questionIndex];
  if (!draft) throw new Error('Answer the question before confirming.');
  const question = selectedQuestion(session);
  const timings = session.timings ? [...session.timings] : undefined;
  const timing = timings?.[session.questionIndex];
  const elapsedMs = timing ? Math.max(0, now - timing.startedAt) : null;
  if (timings && timing) timings[session.questionIndex] = { ...timing, elapsedMs };
  const grade = scoreAnswer(question, draft, elapsedMs);
  const responses = [...session.responses];
  responses[session.questionIndex] = structuredClone(draft);
  const difficultyState = advanceDifficulty(session.difficultyState, grade);
  return { ...session, revision: session.revision + 1, responses, timings, score: session.score + grade.earnedPoints,
    difficultyState, phase: 'feedback' };
}

export function nextQuestion(session: Session): Session {
  if (session.phase !== 'feedback') throw new Error('Continue after reviewing the answer.');
  if (session.questionIndex === 9) return { ...session, revision: session.revision + 1, phase: 'complete' };
  const nextIndex = session.questionIndex + 1;
  const used = session.selectedQuestions.slice(0, nextIndex).flatMap(selection => {
    const question = selection && session.contentSnapshot.questions.find(entry => entry.id === selection.questionId);
    return question ? [question] : [];
  });
  const selected = selectQuestion(session.contentSnapshot.questions, {
    dayKey: session.dayKey, contentVersion: session.contentVersion, slots: session.slots, slotIndex: nextIndex,
    level: session.difficultyState.level, usedFamilies: used.map(question => question.familyId),
    usedConflictGroups: [...new Set(used.flatMap(question => question.conflictGroups))],
    priorGradedDifficulties: priorGrades(session), recentQuestionIds: session.recentQuestionIds
  });
  const selectedQuestions = [...session.selectedQuestions];
  selectedQuestions[nextIndex] = pin(selected);
  return { ...session, revision: session.revision + 1, selectedQuestions, questionIndex: nextIndex, phase: 'question' };
}

export function renameSession(session: Session, nickname: string): Session {
  const cleanName = nickname.trim();
  if (!cleanName) throw new Error('Name cannot be empty.');
  return cleanName === session.nickname ? session : { ...session, nickname: cleanName, revision: session.revision + 1 };
}

export function isPreviousDay(session: Session, now: Date): boolean { return dailyKey(now) !== session.dayKey; }

export function abandonSession(session: Session): Session {
  if (session.phase === 'complete' || session.phase === 'incomplete') return session;
  return { ...session, revision: session.revision + 1, phase: 'incomplete' };
}

export type DailySessionResolution =
  | { status: 'started' | 'resumed'; session: Session }
  | { status: 'confirm-abandon'; session: Session };

export function resolveDailySession(existing: Session | null, nickname: string, now: Date, content: ClientContent,
  recentQuestionIds: string[] = [], confirmAbandon = false): DailySessionResolution {
  if (existing && existing.dayKey === dailyKey(now)) return { status: 'resumed', session: renameSession(existing, nickname) };
  if (existing && existing.phase !== 'complete' && existing.phase !== 'incomplete' && !confirmAbandon)
    return { status: 'confirm-abandon', session: existing };
  const seen = existing ? existing.selectedQuestions.flatMap(question => question ? [question.questionId] : []) : [];
  return { status: 'started', session: startSession(nickname, now, content, [...new Set([...recentQuestionIds, ...seen])]) };
}

export function recomputeSessionScore(session: Session): number {
  return session.responses.reduce((sum, response, index) => {
    if (!response) return sum;
    return sum + scoreAnswer(selectedQuestion(session, index), response, session.timings?.[index]?.elapsedMs).earnedPoints;
  }, 0);
}
