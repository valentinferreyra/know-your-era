import type { ClientQuestion, QuestionKind } from '../content/types.ts';
import { gradeAnswer } from './grade.ts';
import type { DraftAnswer } from './types.ts';

export const bonusWindow: Record<QuestionKind, { full: number; end: number }> = {
  choice: { full: 10_000, end: 25_000 },
  ordering: { full: 15_000, end: 45_000 },
  matching: { full: 15_000, end: 60_000 }
};

export function bonusRate(kind: QuestionKind, elapsedMs: number): number {
  const { full, end } = bonusWindow[kind];
  return 0.25 * Math.min(1, Math.max(0, (end - elapsedMs) / (end - full)));
}

export function speedBonus(basePoints: number, kind: QuestionKind, elapsedMs?: number | null): number {
  if (elapsedMs == null || !Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;
  return Math.round(basePoints * bonusRate(kind, elapsedMs));
}

export function scoreAnswer(question: ClientQuestion, answer: DraftAnswer, elapsedMs?: number | null) {
  const grade = gradeAnswer(question, answer);
  const bonus = speedBonus(grade.earnedPoints, question.kind, elapsedMs);
  return { ...grade, basePoints: grade.earnedPoints, speedBonus: bonus, earnedPoints: grade.earnedPoints + bonus };
}
