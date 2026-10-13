import { expect, it } from 'vitest';
import { toClientAssets, toClientQuestions } from '../../src/content/project.ts';
import { fixtureBundle } from '../fixtures/content.ts';

it('omitsEditorialSourcesFromClient', () => {
  const output = toClientQuestions(fixtureBundle());
  expect(output[0].id).toBe('question-one');
  expect(output[0]).not.toHaveProperty('sourceIds');
  expect(output[0]).not.toHaveProperty('reviewedAt');
  expect(JSON.stringify(output)).not.toContain('example.com');
});

it('rejects invalid content instead of projecting it', () => {
  const b = fixtureBundle(); b.questions[0].answer = 'missing-option';
  expect(() => toClientQuestions(b)).toThrow(/answer/i);
});

it('does not copy undocumented option metadata into the client', () => {
  const b = fixtureBundle(); b.questions[0].options[0].sourceLocator = 'internal evidence';
  expect(JSON.stringify(toClientQuestions(b))).not.toContain('internal evidence');
});

it('projects only display-safe asset metadata to the client', () => {
  const b = fixtureBundle();
  b.assets = [{ id: 'asset-one', path: '/asset.png', type: 'photo', width: 100, height: 100, alt: 'A photo', origin: 'private provenance', permissionStatus: 'unknown', suitable: true, promptSafe: false }];
  const output = toClientAssets(b);
  expect(output).toEqual([{ id: 'asset-one', path: '/asset.png', type: 'photo', width: 100, height: 100, alt: 'A photo', suitable: true, promptSafe: false }]);
  expect(JSON.stringify(output)).not.toContain('private provenance');
});
