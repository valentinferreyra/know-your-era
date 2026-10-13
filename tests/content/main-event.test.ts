import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { loadContent } from '../../scripts/load-content.ts';
import { validateBundle } from '../../src/content/validate.ts';

const questions = JSON.parse(await readFile(new URL('../../content/questions/main-event.json', import.meta.url), 'utf8'));
it('hasSixtyReviewedQuestionsInThreeBalancedTiers', () => {
  expect(questions).toHaveLength(60);
  for (const tier of ['easy', 'medium', 'hard']) {
    const pool = questions.filter((q: any) => q.difficulty === tier);
    expect(pool).toHaveLength(20);
    expect(pool.filter((q: any) => q.kind === 'choice')).toHaveLength(10);
    expect(pool.filter((q: any) => q.kind === 'completion')).toHaveLength(10);
  }
  expect(new Set(questions.map((q: any) => q.familyId)).size).toBe(60);
});
it('mainEventIsClosingBroadcastMatch', async () => {
  const bundle = await loadContent();
  expect(questions.length).toBeGreaterThan(0);
  for (const q of questions) {
    expect(q.category).toBe('main-event');
    expect(q.factIds.some((id: string) => bundle.facts.find((f: any) => f.id === id)?.mainEvent === true)).toBe(true);
  }
  expect(validateBundle(bundle, false)).toEqual([]);
});
