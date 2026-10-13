import { mkdir, writeFile } from 'node:fs/promises';
import { loadContent } from './load-content.ts';
import { validateBundle } from '../src/content/validate.ts';
import { toClientAssets, toClientQuestions } from '../src/content/project.ts';
import { makeDailySlots } from '../src/game/day.ts';
import { canCompleteDailySchedule } from '../src/game/select.ts';

const bundle = await loadContent();
const errors = validateBundle(bundle, true);
if (errors.length) throw new Error(errors.join('\n'));
const questions = toClientQuestions(bundle);
for (let day = 1; day <= 14; day++) {
  const dayKey = `2026-10-${String(day).padStart(2, '0')}`;
  if (!canCompleteDailySchedule(questions, makeDailySlots(dayKey, bundle.version), dayKey, bundle.version)) {
    throw new Error(`Question pool cannot complete the daily schedule for ${dayKey}.`);
  }
}
const directory = new URL('../src/content/generated/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('questions.json', directory), JSON.stringify({ version: bundle.version, questions }));
await writeFile(new URL('assets.json', directory), JSON.stringify(toClientAssets(bundle)));
console.log(`Built ${bundle.questions.length} client questions without editorial sources.`);
