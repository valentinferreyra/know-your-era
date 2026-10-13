import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import bundle from '../../src/content/generated/questions.json';
import type { ClientQuestion } from '../../src/content/types.ts';
import { answerArt, beltIn, eventLogo, portraits, questionArt } from '../../src/ui/art.ts';

const questions = bundle.questions as ClientQuestion[];

it('only singles out a wrestler already named in the prompt', () => {
  const question = questions.find(q => q.prompt.includes('with Steve Austin at WrestleMania XIV'))!;
  expect(questionArt(question)?.alt).toBe('Steve Austin');
  expect(questionArt({ ...question, answer: 'a-different-option' } as ClientQuestion)).toEqual(questionArt(question));
  expect(questionArt({ ...question, prompt: 'Who was in this main event?' })).toBeUndefined();
  const champion = questions.find(q => q.category === 'champion-entering')!;
  expect(questionArt(champion)?.type).toBe('belt');
});

it('does not attach a single edition to a question spanning several events', () => {
  const chronology = questions.find(q => q.eventIds.length > 1)!;
  expect(eventLogo(chronology)).toBeUndefined();
});

it('all reachable interface art paths exist', async () => {
  const paths = new Set(questions.flatMap(q => [questionArt(q), answerArt(q), eventLogo(q)]).filter(a => a !== undefined).map(a => a.path));
  portraits.forEach(([, file]) => paths.add(`/assets/${file}.webp`));
  for (const name of ['World Heavyweight', 'WWE Championship', 'Intercontinental', 'United States', 'Cruiserweight', "Women's", 'Tag Team']) paths.add(beltIn(name)!.path);
  paths.add('/assets/know-your-era-brand.webp'); paths.add('/assets/smackdown-arena.webp');
  for (const path of paths) await access(resolve('public', path.slice(1)));
  expect(questions.filter(q => questionArt(q) || eventLogo(q)).length).toBeGreaterThan(150);
});
