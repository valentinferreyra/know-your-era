import type { Category, ClientQuestion, Difficulty, QuestionKind } from '../content/types.ts';

export type DraftAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'ordering'; itemIds: string[] }
  | { kind: 'matching'; pairs: Record<string, string> };
export interface Correction { id: string; label: string; submitted: string; expected: string; correct: boolean }
export interface Grade {
  fullyCorrect: boolean; earnedPoints: number; maximumPoints: number;
  correctParts: number; totalParts: number; corrections: Correction[];
}
export interface DifficultyState { level: Difficulty; correctStreak: number; zeroStreak: number }
export interface Slot { category: Category; kind: QuestionKind }
export interface PriorGrade { difficulty: Difficulty; fullyCorrect: boolean }
export interface SelectionRequest {
  dayKey: string;
  contentVersion: string;
  slots: Slot[];
  slotIndex: number;
  level: Difficulty;
  usedFamilies: string[];
  usedConflictGroups: string[];
  recentQuestionIds: string[];
  priorGradedDifficulties: PriorGrade[];
}
export interface SelectedQuestion {
  question: ClientQuestion;
  displayOrder: { primary: string[]; secondary?: string[] };
}
