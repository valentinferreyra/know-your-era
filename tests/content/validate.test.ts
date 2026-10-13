import { describe, expect, it } from 'vitest';
import { validateBundle } from '../../src/content/validate.ts';
import { fixtureBundle } from '../fixtures/content.ts';

describe('editorial content validation', () => {
  it('accepts a valid non-release fixture', () => expect(validateBundle(fixtureBundle(), false)).toEqual([]));
  it('rejectsDuplicateIds', () => {
    const b = fixtureBundle(); b.questions.push(structuredClone(b.questions[0]));
    expect(validateBundle(b, false).join(' ')).toMatch(/duplicate question/i);
  });
  it('rejectsAmbiguousChoice', () => {
    const b = fixtureBundle(); b.questions[0].options[1].label = ' ALPHA ';
    expect(validateBundle(b, false).join(' ')).toMatch(/duplicate option label/i);
  });
  it('rejectsMissingFacts', () => {
    const b = fixtureBundle(); b.questions[0].factIds = ['missing'];
    expect(validateBundle(b, false).join(' ')).toMatch(/unknown fact/i);
  });
  it('rejectsOutOfScopeEvents', () => {
    const b = fixtureBundle(); b.events[0].date = '2004-08-01';
    expect(validateBundle(b, false).join(' ')).toMatch(/outside scope/i);
  });
  it('rejectsInvalidOrdering', () => {
    const b = fixtureBundle(); Object.assign(b.questions[0], { category: 'order-history', kind: 'ordering',
      items: [{ id: 'a', label: 'First', factId: 'fact-one' }, { id: 'b', label: 'Second', factId: 'fact-one' }, { id: 'c', label: 'Third', factId: 'fact-one' }],
      answer: ['a', 'b', 'c'], orderMode: 'date' });
    expect(validateBundle(b, false).join(' ')).toMatch(/tied chronology/i);
  });
  it('rejectsInvalidPairCount', () => {
    const b = fixtureBundle(); Object.assign(b.questions[0], { category: 'rebuild-card', kind: 'matching',
      left: [{ id: 'a', label: 'Left' }], right: [{ id: 'b', label: 'Right' }], answer: { a: 'b' } });
    expect(validateBundle(b, false).join(' ')).toMatch(/requires 2 pairs/i);
  });
  it('rejects unreviewed or unsupported evidence', () => {
    const b = fixtureBundle(); b.facts[0].sourceIds = [];
    expect(validateBundle(b, false).join(' ')).toMatch(/supporting source/i);
  });
  it('does not accept a smaller bank for release', () => {
    expect(validateBundle(fixtureBundle(), true).join(' ')).toMatch(/300/);
  });
  it('reports malformed input without crashing', () => {
    expect(validateBundle({ questions: [null] } as any, false).length).toBeGreaterThan(0);
  });
  it('rejects malformed release input without throwing', () => {
    expect(validateBundle({} as any, true).length).toBeGreaterThan(0);
  });
  it('rejects retired free-text completion records', () => {
    const b = fixtureBundle(); Object.assign(b.questions[0], { kind: 'completion', prefix: 'The champion was', suffix: '.', answer: 'Alpha', aliases: ['Alpha'] });
    expect(validateBundle(b, false).join(' ')).toMatch(/invalid category and interaction combination/);
  });
});
