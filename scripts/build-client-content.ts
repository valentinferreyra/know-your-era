import { mkdir, writeFile } from 'node:fs/promises';
import { loadContent } from './load-content.ts';
import { validateBundle } from '../src/content/validate.ts';
import { toClientQuestions } from '../src/content/project.ts';

const bundle = await loadContent();
const errors = validateBundle(bundle, true);
if (errors.length) throw new Error(errors.join('\n'));
const directory = new URL('../src/content/generated/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('questions.json', directory), JSON.stringify({ version: bundle.version, questions: toClientQuestions(bundle) }));
console.log(`Built ${bundle.questions.length} client questions without editorial sources.`);
