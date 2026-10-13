import { difficulties } from '../content/types.ts';
import type { DifficultyState, Grade } from './types.ts';

export function advanceDifficulty(state: DifficultyState, grade: Grade): DifficultyState {
  if (!grade.fullyCorrect && grade.earnedPoints > 0) return { level: state.level, correctStreak: 0, zeroStreak: 0 };
  const correctStreak = grade.fullyCorrect ? state.correctStreak + 1 : 0;
  const zeroStreak = grade.earnedPoints === 0 ? state.zeroStreak + 1 : 0;
  if (correctStreak < 2 && zeroStreak < 2) return { level: state.level, correctStreak, zeroStreak };
  const index = difficulties.indexOf(state.level);
  return { level: difficulties[Math.max(0, Math.min(2, index + (correctStreak >= 2 ? 1 : -1)))], correctStreak: 0, zeroStreak: 0 };
}
