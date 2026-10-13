import { expect, it } from 'vitest';
import { loadContent } from '../../scripts/load-content.ts';
import { validateBundle } from '../../src/content/validate.ts';

it('hasSixtyReviewedQuestionsInThreeBalancedTiers', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'odd-one-out');
  expect(questions).toHaveLength(60);
  for (const tier of ['easy', 'medium', 'hard']) expect(questions.filter(q => q.difficulty === tier)).toHaveLength(20);
  expect(new Set(questions.map(q => q.familyId)).size).toBe(60);
  expect(validateBundle(bundle, false)).toEqual([]);
});

it('exactlyOneOptionDoesNotBelong', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'odd-one-out');
  expect(questions.length).toBeGreaterThan(0);
  for (const q of questions) {
    if (q.kind !== 'choice') throw new Error('Odd-one-out must be a choice.');
    const fact = bundle.facts.find(f => q.factIds.includes(f.id) && f.participants)!;
    expect(fact).toBeDefined();
    const outsiders = q.options.filter(o => !fact.participants!.includes(o.label));
    expect(outsiders).toHaveLength(1);
    expect(outsiders[0].id).toBe(q.answer);
  }
});
