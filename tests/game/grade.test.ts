import { expect, it } from 'vitest';
import { gradeAnswer } from '../../src/game/grade.ts';
import { toClientQuestions } from '../../src/content/project.ts';
import { fixtureBundle } from '../fixtures/content.ts';
import type { ClientQuestion } from '../../src/content/types.ts';

const base = () => toClientQuestions(fixtureBundle())[0];
const matching = (difficulty: 'easy' | 'medium' | 'hard'): ClientQuestion => {
  const count = { easy: 2, medium: 3, hard: 4 }[difficulty];
  return { ...base(), category: 'rebuild-card', kind: 'matching', difficulty,
    left: Array.from({ length: count }, (_, n) => ({ id: `l${n}`, label: `Left ${n}` })),
    right: Array.from({ length: count }, (_, n) => ({ id: `r${n}`, label: `Right ${n}` })),
    answer: Object.fromEntries(Array.from({ length: count }, (_, n) => [`l${n}`, `r${n}`])) };
};

it('awards 100 for a correct easy choice and zero for a wrong choice', () => {
  const q = base();
  if (q.kind !== 'choice') throw new Error('fixture');
  expect(gradeAnswer(q, { kind: 'choice', optionId: q.answer }).earnedPoints).toBe(100);
  expect(gradeAnswer(q, { kind: 'choice', optionId: q.options.find(o => o.id !== q.answer)!.id }).earnedPoints).toBe(0);
});
it.each([
  ['easy', { l0: 'r1', l1: 'r0' }, 0, 0],
  ['medium', { l0: 'r0', l1: 'r2', l2: 'r1' }, 50, 1],
  ['hard', { l0: 'r0', l1: 'r1', l2: 'r3', l3: 'r2' }, 100, 2]
] as const)('grades a complete %s matching response proportionally', (tier, pairs, points, parts) => {
  const result = gradeAnswer(matching(tier), { kind: 'matching', pairs });
  expect(result.earnedPoints).toBe(points);
  expect(result.correctParts).toBe(parts);
  expect(result.fullyCorrect).toBe(false);
});
it('rejects repeated partners, unknown IDs, incomplete responses and mismatched interactions', () => {
  expect(() => gradeAnswer(matching('medium'), { kind: 'matching', pairs: { l0: 'r0', l1: 'r0', l2: 'r2' } })).toThrow();
  expect(() => gradeAnswer(base(), { kind: 'choice', optionId: 'unknown' })).toThrow();
  expect(() => gradeAnswer(matching('easy'), { kind: 'matching', pairs: { l0: 'r0' } })).toThrow();
  expect(() => gradeAnswer(base(), { kind: 'ordering', itemIds: [] })).toThrow();
});
it.each([['easy', 100], ['medium', 150], ['hard', 200]] as const)('awards the full %s value only when all pairs are correct', (tier, points) => {
  const q = matching(tier);
  if (q.kind !== 'matching') throw new Error('fixture');
  const grade = gradeAnswer(q, { kind: 'matching', pairs: q.answer });
  expect(grade.earnedPoints).toBe(points);
  expect(grade.fullyCorrect).toBe(true);
});
it('wrong ordering earns zero and the correction preserves all positions', () => {
  const q: ClientQuestion = { ...base(), kind: 'ordering', category: 'order-history', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], answer: ['a', 'b', 'c'], orderMode: 'date' };
  const grade = gradeAnswer(q, { kind: 'ordering', itemIds: ['a', 'c', 'b'] });
  expect(grade.earnedPoints).toBe(0);
  expect(grade.corrections.map(c => c.expected)).toEqual(['A', 'B', 'C']);
  expect(() => gradeAnswer(q, { kind: 'ordering', itemIds: ['a', 'a', 'c'] })).toThrow();
});
