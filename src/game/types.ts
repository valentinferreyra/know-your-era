import type { Difficulty } from '../content/types.ts';

export type DraftAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'completion'; text: string }
  | { kind: 'ordering'; itemIds: string[] }
  | { kind: 'matching'; pairs: Record<string, string> };
export interface Correction { id: string; label: string; submitted: string; expected: string; correct: boolean }
export interface Grade {
  fullyCorrect: boolean; earnedPoints: number; maximumPoints: number;
  correctParts: number; totalParts: number; corrections: Correction[];
}
export interface DifficultyState { level: Difficulty; correctStreak: number; zeroStreak: number }
