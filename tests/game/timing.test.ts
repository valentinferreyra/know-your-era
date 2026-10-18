import { expect, it } from 'vitest';
import { speedBonus } from '../../src/game/timing.ts';

it.each([
  ['choice', 0, 25], ['choice', 10_000, 25], ['choice', 17_500, 13],
  ['choice', 25_000, 0], ['choice', 90_000, 0],
  ['ordering', 15_000, 25], ['ordering', 30_000, 13], ['ordering', 45_000, 0],
  ['matching', 15_000, 25], ['matching', 37_500, 13], ['matching', 60_000, 0]
] as const)('awards the speed bonus for %s at %i ms', (kind, elapsed, bonus) => {
  expect(speedBonus(100, kind, elapsed)).toBe(bonus);
});

it('does not add points for wrong answers or untimed legacy responses', () => {
  expect(speedBonus(0, 'choice', 1_000)).toBe(0);
  expect(speedBonus(100, 'choice', null)).toBe(0);
  expect(speedBonus(100, 'choice', undefined)).toBe(0);
  expect(speedBonus(50, 'matching', 10_000)).toBe(13);
  expect(speedBonus(200, 'choice', 10_000)).toBe(50);
});
