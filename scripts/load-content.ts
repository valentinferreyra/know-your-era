import { readFile } from 'node:fs/promises';
import type { ContentBundle } from '../src/content/types.ts';

export async function loadContent(): Promise<ContentBundle> {
  const read = async (name: string) => JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), 'utf8'));
  const [events, sources, facts, assets] = await Promise.all(['events', 'sources', 'facts', 'assets'].map(read));
  const questionFiles = ['main-event', 'order-history', 'champion-entering', 'odd-one-out', 'rebuild-card'];
  const questions = (await Promise.all(questionFiles.map(name => read(`questions/${name}`)))).flat();
  return { version: 'v1', events, sources, facts, assets, questions };
}
