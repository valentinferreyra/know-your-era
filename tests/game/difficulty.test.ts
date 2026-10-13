import { expect, it } from 'vitest';
import { advanceDifficulty } from '../../src/game/difficulty.ts';

const win = { fullyCorrect: true, earnedPoints: 100, maximumPoints: 100, correctParts: 1, totalParts: 1, corrections: [] };
const zero = { ...win, fullyCorrect: false, earnedPoints: 0, correctParts: 0 };
const partial = { ...zero, earnedPoints: 50, correctParts: 1, totalParts: 3 };
it('raises one level after two full successes and resets streaks', () => {
  const first = advanceDifficulty({ level: 'easy', correctStreak: 0, zeroStreak: 0 }, win);
  expect(first).toEqual({ level: 'easy', correctStreak: 1, zeroStreak: 0 });
  expect(advanceDifficulty(first, win)).toEqual({ level: 'medium', correctStreak: 0, zeroStreak: 0 });
});
it('lowers after two zeros and keeps difficulty bounded', () => {
  const first = advanceDifficulty({ level: 'hard', correctStreak: 0, zeroStreak: 0 }, zero);
  expect(advanceDifficulty(first, zero)).toEqual({ level: 'medium', correctStreak: 0, zeroStreak: 0 });
  expect(advanceDifficulty({ level: 'easy', correctStreak: 0, zeroStreak: 1 }, zero).level).toBe('easy');
  expect(advanceDifficulty({ level: 'hard', correctStreak: 1, zeroStreak: 0 }, win).level).toBe('hard');
});
it('partial credit leaves level unchanged and clears both streaks', () => {
  expect(advanceDifficulty({ level: 'medium', correctStreak: 1, zeroStreak: 0 }, partial)).toEqual({ level: 'medium', correctStreak: 0, zeroStreak: 0 });
});
