import { expect, it } from 'vitest';
import { dailyKey, makeDailySlots } from '../../src/game/day.ts';

it('changes day at 03:00 UTC, the UTC-3 midnight boundary', () => {
  expect(dailyKey(new Date('2026-10-13T02:59:59.000Z'))).toBe('2026-10-12');
  expect(dailyKey(new Date('2026-10-13T03:00:00.000Z'))).toBe('2026-10-13');
});

it('uses two slots per category and all four interactions every day', () => {
  const slots = makeDailySlots('2026-10-13', 'v1');
  expect(slots).toHaveLength(10);
  const counts = slots.reduce<Record<string, number>>((result, slot) => {
    result[slot.category] = (result[slot.category] ?? 0) + 1;
    return result;
  }, {});
  expect(Object.values(counts).sort()).toEqual([2, 2, 2, 2, 2]);
  expect(new Set(slots.map(slot => slot.kind))).toEqual(new Set(['choice', 'completion', 'ordering', 'matching']));
});

it('keeps adjacent slots in different categories whenever the schedule allows it', () => {
  for (let day = 1; day <= 40; day++) {
    const slots = makeDailySlots(`2026-10-${String(day).padStart(2, '0')}`, 'v1');
    expect(slots.every((slot, index) => index === 0 || slot.category !== slots[index - 1]?.category)).toBe(true);
  }
});

it('is stable for the same day and content version', () => {
  expect(makeDailySlots('2026-10-13', 'v1')).toEqual(makeDailySlots('2026-10-13', 'v1'));
  expect(makeDailySlots('2026-10-13', 'v1')).not.toEqual(makeDailySlots('2026-10-13', 'v2'));
});
