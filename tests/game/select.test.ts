import { expect, it } from 'vitest';
import { toClientQuestions } from '../../src/content/project.ts';
import { fixtureBundle } from '../fixtures/content.ts';
import { selectQuestion } from '../../src/game/select.ts';
import type { Category, ClientQuestion, Difficulty, QuestionKind } from '../../src/content/types.ts';
import type { Slot } from '../../src/game/types.ts';

const slots: Slot[] = [
  { category: 'main-event', kind: 'choice' }, { category: 'odd-one-out', kind: 'choice' },
  { category: 'order-history', kind: 'ordering' }, { category: 'champion-entering', kind: 'choice' },
  { category: 'rebuild-card', kind: 'matching' }, { category: 'main-event', kind: 'choice' },
  { category: 'odd-one-out', kind: 'choice' }, { category: 'order-history', kind: 'ordering' },
  { category: 'champion-entering', kind: 'choice' }, { category: 'rebuild-card', kind: 'matching' }
];

function makeQuestion(id: string, category: Category, kind: QuestionKind, difficulty: Difficulty,
  conflictGroups = [`conflict-${id}`], ukOnly = false): ClientQuestion {
  const base = toClientQuestions(fixtureBundle())[0]!;
  const shared = { ...base, id, familyId: `family-${id}`, category, difficulty, kind, conflictGroups, ukOnly };
  if (kind === 'choice') return { ...shared, kind, options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }], answer: 'a' };
  if (kind === 'ordering') return { ...shared, kind, items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], answer: ['a', 'b', 'c'], orderMode: 'date' };
  return { ...shared, kind, left: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], right: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }], answer: { a: 'x', b: 'y' } };
}

const request = (slotIndex: number, overrides: Record<string, unknown> = {}) => ({
  slots: slots.slice(0, slotIndex + 1), dayKey: '2026-10-13', contentVersion: 'v1', slotIndex, level: 'easy' as Difficulty,
  usedFamilies: [], usedConflictGroups: [], recentQuestionIds: [], priorGradedDifficulties: [], ...overrides
});

it('returns a stable question and frozen display orders for the same selection path', () => {
  const pool = Array.from({ length: 4 }, (_, i) => makeQuestion(`q${i}`, 'main-event', 'choice', 'easy'));
  expect(selectQuestion(pool, request(0))).toEqual(selectQuestion(pool, request(0)));
  const result = selectQuestion(pool, request(0));
  expect(result.displayOrder.primary).toHaveLength(4);
  expect(new Set(result.displayOrder.primary)).toEqual(new Set(['a', 'b', 'c', 'd']));
});

it('excludes used families and cross-category conflicts', () => {
  const blocked = makeQuestion('blocked', 'main-event', 'choice', 'easy', ['fact-used']);
  const eligible = makeQuestion('eligible', 'main-event', 'choice', 'easy');
  expect(selectQuestion([blocked, eligible], request(0, { usedConflictGroups: ['fact-used'] })).question.id).toBe('eligible');
  expect(selectQuestion([blocked, eligible], request(0, { usedFamilies: ['family-blocked'] })).question.id).toBe('eligible');
});

it('prefers questions outside recent history but relaxes recency when that is the only option', () => {
  const recent = makeQuestion('recent', 'main-event', 'choice', 'easy');
  const fresh = makeQuestion('fresh', 'main-event', 'choice', 'easy');
  expect(selectQuestion([recent, fresh], request(0, { recentQuestionIds: ['recent'] })).question.id).toBe('fresh');
  expect(selectQuestion([recent], request(0, { recentQuestionIds: ['recent'] })).question.id).toBe('recent');
});

it('gates UK questions to late slots after two consecutive hard full successes', () => {
  const uk = makeQuestion('uk', 'order-history', 'ordering', 'hard', ['uk-fact'], true);
  const domestic = makeQuestion('domestic', 'order-history', 'ordering', 'hard');
  const lateSlots = slots.slice(0, 8).map((slot, i) => i === 7 ? { category: 'order-history' as const, kind: 'ordering' as const } : slot);
  const noQualification = { ...request(7), slots: lateSlots, level: 'hard' as const,
    priorGradedDifficulties: [{ difficulty: 'hard' as const, fullyCorrect: true }, { difficulty: 'medium' as const, fullyCorrect: true }] };
  expect(selectQuestion([uk, domestic], noQualification).question.id).toBe('domestic');
  const qualified = { ...noQualification, priorGradedDifficulties: [
    { difficulty: 'hard' as const, fullyCorrect: true }, { difficulty: 'hard' as const, fullyCorrect: true }
  ] };
  expect(selectQuestion([uk], qualified).question.id).toBe('uk');
  expect(() => selectQuestion([uk], { ...qualified, slotIndex: 6 })).toThrow(/UK|pool|eligible/i);
});

it('keeps a valid continuation when the highest-ranked question blocks the next slot', () => {
  const current = [
    { category: 'main-event' as const, kind: 'choice' as const },
    { category: 'odd-one-out' as const, kind: 'choice' as const }
  ];
  const deadEnd = makeQuestion('dead-end', 'main-event', 'choice', 'easy', ['needed-later']);
  const safe = makeQuestion('safe', 'main-event', 'choice', 'easy');
  const future = makeQuestion('future', 'odd-one-out', 'choice', 'easy', ['needed-later']);
  const result = selectQuestion([deadEnd, safe, future], { ...request(0), slots: current });
  expect(result.question.id).toBe('safe');
});
