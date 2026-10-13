import { expect, it } from 'vitest';
import { toClientQuestions } from '../../src/content/project.ts';
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
