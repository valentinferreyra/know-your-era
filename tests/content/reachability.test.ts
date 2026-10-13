import { expect, it } from 'vitest';
import { toClientQuestions } from '../../src/content/project.ts';
import { dailyKey, makeDailySlots } from '../../src/game/day.ts';
import { advanceDifficulty } from '../../src/game/difficulty.ts';
import { selectQuestion } from '../../src/game/select.ts';
import { loadContent } from '../../scripts/load-content.ts';

it('can complete the daily schedule across dates and adaptive level paths', async () => {
  const pool = toClientQuestions(await loadContent());
  const paths = Array.from({ length: 1024 }, (_, value) =>
    Array.from({ length: 10 }, (_, index) => (value & (1 << index)) !== 0));
  for (let day = 1; day <= 3; day++) for (const outcomes of paths) {
    const dayKey = `2026-10-${String(day).padStart(2, '0')}`;
    const slots = makeDailySlots(dayKey, 'v1');
    let level: 'easy' | 'medium' | 'hard' = 'easy';
    let correctStreak = 0, zeroStreak = 0;
    const usedFamilies: string[] = [], usedConflictGroups: string[] = [], priorGradedDifficulties: { difficulty: 'easy' | 'medium' | 'hard'; fullyCorrect: boolean }[] = [];
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const selected = selectQuestion(pool, { dayKey, contentVersion: 'v1', slots, slotIndex, level,
        usedFamilies, usedConflictGroups, recentQuestionIds: [], priorGradedDifficulties });
      usedFamilies.push(selected.question.familyId);
      usedConflictGroups.push(...selected.question.conflictGroups);
      const fullyCorrect = outcomes[slotIndex]!;
      priorGradedDifficulties.push({ difficulty: selected.question.difficulty, fullyCorrect });
      const next = advanceDifficulty({ level, correctStreak, zeroStreak }, {
        fullyCorrect, earnedPoints: fullyCorrect ? 100 : 0, maximumPoints: 100,
        correctParts: fullyCorrect ? 1 : 0, totalParts: 1, corrections: []
      });
      ({ level, correctStreak, zeroStreak } = next);
    }
    expect(new Set(usedFamilies).size).toBe(10);
  }
}, 15000);

it('uses the specified fixed UTC-3 date boundary for selection inputs', () => {
  expect(dailyKey(new Date('2026-10-13T02:59:59.000Z'))).toBe('2026-10-12');
});
