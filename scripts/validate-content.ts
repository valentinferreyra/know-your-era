import { loadContent } from './load-content.ts';
import { validateBundle } from '../src/content/validate.ts';

try {
  const bundle = await loadContent();
  const errors = validateBundle(bundle, !process.argv.includes('--draft'));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Validated ${bundle.questions.length} reviewed questions.`);
} catch (error) {
  console.error(`Content validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
