import { expect, it } from 'vitest';
import { loadContent } from '../../scripts/load-content.ts';
import { validateBundle } from '../../src/content/validate.ts';

it('hasSixtyReviewedQuestionsInThreeBalancedTiers', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'champion-entering');
  expect(questions).toHaveLength(60);
  for (const tier of ['easy', 'medium', 'hard']) {
    const pool = questions.filter(q => q.difficulty === tier);
    expect(pool.filter(q => q.kind === 'choice')).toHaveLength(20);
    for (const q of pool) if (q.kind === 'choice') expect(q.options).toHaveLength(4);
  }
  expect(new Set(questions.map(q => q.familyId)).size).toBe(60);
  expect(validateBundle(bundle, false)).toEqual([]);
});

it('championIsHolderBeforeMatch', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'champion-entering');
  expect(questions.length).toBeGreaterThan(0);
  for (const q of questions) {
    const fact = bundle.facts.find(f => q.factIds.includes(f.id) && 'champion' in f) as any;
    expect(fact).toBeDefined();
    expect(fact.reignStart < fact.date).toBe(true);
    expect(fact.reignEnd >= fact.date).toBe(true);
    if (q.kind === 'choice') expect(q.options.find(o => o.id === q.answer)?.label).toBe(fact.champion);
  }
});
