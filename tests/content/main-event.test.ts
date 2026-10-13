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
    expect(pool.filter((q: any) => q.kind === 'choice')).toHaveLength(20);
  }
  expect(new Set(questions.map((q: any) => q.familyId)).size).toBe(60);
  expect(questions.every((q: any) => q.kind === 'choice' && q.options.length === 4)).toBe(true);
});
it('mainEventIsClosingBroadcastMatch', async () => {
  const bundle = await loadContent();
  expect(questions.length).toBeGreaterThan(0);
  for (const q of questions) {
    expect(q.category).toBe('main-event');
    const fact = bundle.facts.find((f: any) => q.factIds.includes(f.id) && f.mainEvent === true);
    expect(fact).toBeDefined();
    if (!fact) throw new Error(`Missing main-event evidence for ${q.id}`);
    const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    expect(normalized(fact.statement)).toContain(normalized(q.options.find((option: any) => option.id === q.answer).label));
  }
  expect(validateBundle(bundle, false)).toEqual([]);
});
