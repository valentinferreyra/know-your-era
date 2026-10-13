import { expect, it } from 'vitest';
import { validateBundle } from '../../src/content/validate.ts';
import { fixtureBundle } from '../fixtures/content.ts';

it('requiresMainBroadcastScope', () => {
  const b = fixtureBundle(); b.events[0].mainBroadcast = false;
  expect(validateBundle(b, false).join(' ')).toMatch(/main broadcast/);
});

it('requiresSupportingEvidenceForReviewedFacts', () => {
  const b = fixtureBundle(); b.sources[0].locator = '';
  expect(validateBundle(b, false).join(' ')).toMatch(/supporting passage/);
});

function withinShowFixture() {
  const b = fixtureBundle();
  b.facts = [1, 2, 3].map(n => ({ ...b.facts[0], id: `fact-${n}`, sequence: n }));
  Object.assign(b.questions[0], {
    category: 'order-history', kind: 'ordering', orderMode: 'show',
    prompt: 'Order these moments as they happened during the show.',
    factIds: ['fact-1', 'fact-2', 'fact-3'], answer: ['a', 'b', 'c'],
    items: [{ id: 'a', label: 'First', factId: 'fact-1' }, { id: 'b', label: 'Second', factId: 'fact-2' }, { id: 'c', label: 'Third', factId: 'fact-3' }]
  });
  return b;
}

it('rejectsUnverifiedSequence', () => {
  const b = withinShowFixture(); delete b.facts[1].sequence;
  expect(validateBundle(b, false).join(' ')).toMatch(/verified sequence/);
});

it('requires questions to cite the evidence supporting their facts', () => {
  const b = fixtureBundle(); b.sources.push({ ...b.sources[0], id: 'unrelated-source' });
  b.questions[0].sourceIds = ['unrelated-source'];
  expect(validateBundle(b, false).join(' ')).toMatch(/fact evidence is not cited/);
});

it('requires an explicit within-show instruction', () => {
  const b = withinShowFixture(); b.questions[0].prompt = 'Order these moments.';
  expect(validateBundle(b, false).join(' ')).toMatch(/within-show instruction/);
});

it('rejects a champion whose reign began during the event', () => {
  const b = fixtureBundle();
  Object.assign(b.facts[0], { champion: 'Winner', championship: 'WWE Championship', reignStart: b.events[0].date, reignEnd: '2004-07-12' });
  expect(validateBundle(b, false).join(' ')).toMatch(/holder before the match/);
});
