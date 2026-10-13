import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import type { AssetRecord } from '../../src/content/types.ts';
import { validateBundle } from '../../src/content/validate.ts';
import { fixtureBundle } from '../fixtures/content.ts';

it('assetPathsExist', async () => {
  const assets = JSON.parse(await readFile(resolve('content/assets.json'), 'utf8')) as AssetRecord[];
  for (const asset of assets) await access(resolve('public', asset.path.replace(/^\//, '')));
});

it('promptAssetsDoNotRevealAnswers', async () => {
  const bundle = fixtureBundle();
  bundle.assets = JSON.parse(await readFile(resolve('content/assets.json'), 'utf8')) as AssetRecord[];
  for (const question of bundle.questions) {
    if (question.promptAssetId) expect(bundle.assets.find((asset: AssetRecord) => asset.id === question.promptAssetId)?.promptSafe).toBe(true);
  }
});

it('contradictoryEditionNeedsOverride', () => {
  const bundle = fixtureBundle();
  bundle.events.push({ id: 'other-event', name: 'Different event', date: '1999-01-01', mainBroadcast: true, uk: false });
  const asset: AssetRecord = { id: 'explicit-edition', path: '/assets/explicit.png', type: 'logo', width: 200, height: 100,
    alt: 'Explicitly dated event logo', origin: 'Owner-provided image', permissionStatus: 'unknown', suitable: true,
    promptSafe: false, visibleYear: 1999, visibleEventIds: ['other-event'] };
  bundle.assets.push(asset);
  bundle.questions[0]!.answerAssetId = asset.id;
  expect(validateBundle(bundle, false).join(' ')).toMatch(/contradictory|edition/i);
  asset.overrideEventIds = ['event-one'];
  expect(validateBundle(bundle, false)).toEqual([]);
});
