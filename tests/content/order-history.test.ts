import { expect, it } from 'vitest';
import { loadContent } from '../../scripts/load-content.ts';
import { validateBundle } from '../../src/content/validate.ts';

it('hasSixtyReviewedQuestionsInThreeBalancedTiers', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'order-history');
  expect(questions).toHaveLength(60);
  for (const tier of ['easy', 'medium', 'hard']) {
    expect(questions.filter(q => q.difficulty === tier)).toHaveLength(20);
  }
  expect(new Set(questions.map(q => q.familyId)).size).toBe(60);
  expect(validateBundle(bundle, false)).toEqual([]);
});

it('orderingHasNoUnannouncedTies', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'order-history');
  expect(questions.length).toBeGreaterThan(0);
  const sets = new Set<string>();
  for (const q of questions) {
    expect(q.kind).toBe('ordering');
    if (q.kind !== 'ordering') continue;
    const facts = q.items.map(item => bundle.facts.find(f => f.id === item.factId)!);
    const signature = facts.map(f => f.id).sort().join('|');
    expect(sets.has(signature)).toBe(false);
    sets.add(signature);
    expect(q.items).toHaveLength(q.difficulty === 'hard' ? 4 : 3);
    if (q.orderMode === 'date') {
      expect(new Set(facts.map(f => f.date)).size).toBe(facts.length);
      const days = facts.map(f => Date.parse(f.date) / 86400000);
      const span = Math.max(...days) - Math.min(...days);
      if (q.difficulty === 'easy') expect(span).toBeGreaterThanOrEqual(730);
      if (q.difficulty === 'hard') expect(span).toBeLessThanOrEqual(120);
    } else {
      expect(q.prompt).toContain('as they happened during the show');
      expect(new Set(facts.map(f => f.sequence)).size).toBe(facts.length);
    }
  }
});
