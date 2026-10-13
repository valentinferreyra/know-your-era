import { expect, it } from 'vitest';
import { loadContent } from '../../scripts/load-content.ts';
import { validateBundle } from '../../src/content/validate.ts';

it('hasSixtyReviewedQuestionsInThreeBalancedTiers', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'rebuild-card');
  expect(questions).toHaveLength(60);
  for (const tier of ['easy', 'medium', 'hard']) expect(questions.filter(q => q.difficulty === tier)).toHaveLength(20);
  expect(new Set(questions.map(q => q.familyId)).size).toBe(60);
  expect(validateBundle(bundle, false)).toEqual([]);
});

it('eachPairHasOneUnambiguousPartner', async () => {
  const bundle = await loadContent();
  const questions = bundle.questions.filter(q => q.category === 'rebuild-card');
  expect(questions.length).toBeGreaterThan(0);
  const sets = new Set<string>();
  for (const q of questions) {
    if (q.kind !== 'matching') throw new Error('Rebuild-card must use matching.');
    expect(q.left).toHaveLength({ easy: 2, medium: 3, hard: 4 }[q.difficulty]);
    expect(new Set(Object.values(q.answer)).size).toBe(q.right.length);
    const signature = q.factIds.slice().sort().join('|');
    expect(sets.has(signature)).toBe(false);
    sets.add(signature);
    for (const left of q.left) {
      const right = q.right.find(r => r.id === q.answer[left.id])!;
      const supporting = bundle.facts.find(f => q.factIds.includes(f.id) && f.statement.includes(left.label) && f.statement.includes(right.label));
      expect(supporting).toBeDefined();
    }
  }
});
