import type { Category, QuestionKind } from '../content/types.ts';
import type { Slot } from './types.ts';

const schedule: Record<Category, QuestionKind[]> = {
  'main-event': ['choice', 'completion'],
  'order-history': ['ordering', 'ordering'],
  'champion-entering': ['choice', 'completion'],
  'odd-one-out': ['choice', 'choice'],
  'rebuild-card': ['matching', 'matching']
};

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

export function dailyKey(now: Date): string {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function makeDailySlots(dayKey: string, contentVersion: string): Slot[] {
  const seed = `${dayKey}:${contentVersion}`;
  const pending = Object.entries(schedule).map(([category, kinds]) => ({
    category: category as Category,
    kinds: [...kinds].sort((a, b) => hash(`${seed}:${category}:${a}`) - hash(`${seed}:${category}:${b}`))
  })).sort((a, b) => hash(`${seed}:${a.category}`) - hash(`${seed}:${b.category}`));
  const result: Slot[] = [];
  const counts = new Map(pending.map(entry => [entry.category, entry.kinds.length]));

  function append(): boolean {
    if (result.length === 10) return true;
    const options = pending.filter(entry => (counts.get(entry.category) ?? 0) > 0
      && result.at(-1)?.category !== entry.category)
      .sort((a, b) => hash(`${seed}:${result.length}:${a.category}`) - hash(`${seed}:${result.length}:${b.category}`));
    for (const entry of options) {
      const kind = entry.kinds.shift()!;
      counts.set(entry.category, (counts.get(entry.category) ?? 0) - 1);
      result.push({ category: entry.category, kind });
      if (append()) return true;
      result.pop();
      entry.kinds.unshift(kind);
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    return false;
  }

  if (!append()) throw new Error('Unable to create a daily question schedule.');
  return result;
}
