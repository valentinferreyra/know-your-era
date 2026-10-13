import type { ClientAsset, ClientQuestion, ContentBundle, Item } from './types.ts';
import { validateBundle } from './validate.ts';

export function toClientQuestions(bundle: ContentBundle): ClientQuestion[] {
  const errors = validateBundle(bundle, false);
  if (errors.length) throw new Error(errors.join('\n'));
  const items = (entries: Item[]) => entries.map(({ id, label }) => ({ id, label }));
  return bundle.questions.map((q): ClientQuestion => {
    const shared = {
      id: q.id, familyId: q.familyId, conflictGroups: q.conflictGroups, category: q.category,
      difficulty: q.difficulty, prompt: q.prompt, explanation: q.explanation,
      eventIds: q.eventIds, ukOnly: q.ukOnly,
      ...(q.promptAssetId ? { promptAssetId: q.promptAssetId } : {}),
      ...(q.answerAssetId ? { answerAssetId: q.answerAssetId } : {}),
      ...(q.logoAssetId ? { logoAssetId: q.logoAssetId } : {})
    };
    switch (q.kind) {
      case 'choice': return { ...shared, kind: q.kind, options: items(q.options), answer: q.answer };
      case 'matching': return { ...shared, kind: q.kind, left: items(q.left), right: items(q.right), answer: q.answer };
      case 'ordering': return { ...shared, kind: q.kind, items: q.items.map(({ id, label }) => ({ id, label })), answer: q.answer, orderMode: q.orderMode };
    }
  });
}

export function toClientAssets(bundle: ContentBundle): ClientAsset[] {
  return bundle.assets.map(({ id, path, type, width, height, alt, suitable, promptSafe }) =>
    ({ id, path, type, width, height, alt, suitable, promptSafe }));
}
