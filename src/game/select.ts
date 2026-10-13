import type { ClientQuestion, Difficulty } from '../content/types.ts';
import { difficulties } from '../content/types.ts';
import type { PriorGrade, SelectedQuestion, SelectionRequest, Slot } from './types.ts';

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

function rank<T extends { id: string }>(entries: T[], seed: string): T[] {
  return [...entries].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id));
}

function ukAllowed(index: number, grades: PriorGrade[]): boolean {
  if (index < 7 || grades.length < 2) return false;
  const recent = grades.slice(-2);
  return recent.every(grade => grade.difficulty === 'hard' && grade.fullyCorrect);
}

function eligible(question: ClientQuestion, slot: Slot, level: Difficulty | undefined, index: number, grades: PriorGrade[]): boolean {
  return question.category === slot.category && question.kind === slot.kind
    && (level === undefined || question.difficulty === level)
    && (!question.ukOnly || (question.difficulty === 'hard' && ukAllowed(index, grades)));
}

function hasContinuation(pool: ClientQuestion[], slots: Slot[], start: number, usedFamilies: Set<string>, usedConflicts: Set<string>, grades: PriorGrade[]): boolean {
  const stop = Math.min(slots.length, start + 3);
  function search(index: number, families: Set<string>, conflicts: Set<string>, history: PriorGrade[]): boolean {
    if (index >= stop) return true;
    const slot = slots[index]!;
    const candidates = pool.filter(question => eligible(question, slot, undefined, index, history)
      && !families.has(question.familyId) && !question.conflictGroups.some(group => conflicts.has(group)));
    for (const candidate of rank(candidates, `lookahead:${index}:${history.length}`)) {
      const nextFamilies = new Set(families).add(candidate.familyId);
      const nextConflicts = new Set(conflicts);
      candidate.conflictGroups.forEach(group => nextConflicts.add(group));
      // An all-correct path is possible, so hard answers may unlock a UK question later.
      const nextHistory = [...history, { difficulty: candidate.difficulty, fullyCorrect: true }];
      if (search(index + 1, nextFamilies, nextConflicts, nextHistory)) return true;
    }
    return false;
  }
  return search(start, usedFamilies, usedConflicts, grades);
}

function displayOrder(question: ClientQuestion, seed: string): SelectedQuestion['displayOrder'] {
  if (question.kind === 'choice') return { primary: rank(question.options, seed).map(item => item.id) };
  if (question.kind === 'ordering') return { primary: rank(question.items, seed).map(item => item.id) };
  if (question.kind === 'matching') return {
    primary: rank(question.left, `${seed}:left`).map(item => item.id),
    secondary: rank(question.right, `${seed}:right`).map(item => item.id)
  };
  return { primary: [] };
}

export function selectQuestion(pool: ClientQuestion[], request: SelectionRequest): SelectedQuestion {
  const slot = request.slots[request.slotIndex];
  if (!slot) throw new Error(`No daily slot exists at index ${request.slotIndex}.`);
  const usedFamilies = new Set(request.usedFamilies);
  const usedConflicts = new Set(request.usedConflictGroups);
  const baseCandidates = pool.filter(question => eligible(question, slot, request.level, request.slotIndex, request.priorGradedDifficulties)
    && !usedFamilies.has(question.familyId) && !question.conflictGroups.some(group => usedConflicts.has(group)));
  const recent = new Set(request.recentQuestionIds);
  const seed = `${request.dayKey}:${request.contentVersion}:${request.slotIndex}`;
  const candidates = rank(baseCandidates, seed).sort((a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id))
    || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`));
  for (const question of candidates) {
    const nextFamilies = new Set(usedFamilies).add(question.familyId);
    const nextConflicts = new Set(usedConflicts);
    question.conflictGroups.forEach(group => nextConflicts.add(group));
    const nextGrades = [...request.priorGradedDifficulties, { difficulty: question.difficulty, fullyCorrect: true }];
    if (!hasContinuation(pool, request.slots, request.slotIndex + 1, nextFamilies, nextConflicts, nextGrades)) continue;
    return { question, displayOrder: displayOrder(question, seed) };
  }
  const description = `${slot.category}/${slot.kind} at ${request.level} difficulty in slot ${request.slotIndex + 1}`;
  throw new Error(`Question pool cannot continue: no eligible ${description} question preserves a valid schedule.`);
}

export function canCompleteDailySchedule(pool: ClientQuestion[], slots: Slot[], dayKey: string, contentVersion: string): boolean {
  const families = new Set<string>(), conflicts = new Set<string>();
  const initial: SelectionRequest = { dayKey, contentVersion, slots, slotIndex: 0, level: difficulties[0],
    usedFamilies: [], usedConflictGroups: [], recentQuestionIds: [], priorGradedDifficulties: [] };
  try {
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const chosen = selectQuestion(pool, { ...initial, slotIndex, level: difficulties[0],
        usedFamilies: [...families], usedConflictGroups: [...conflicts],
        priorGradedDifficulties: Array.from({ length: slotIndex }, () => ({ difficulty: 'hard' as const, fullyCorrect: true })) });
      families.add(chosen.question.familyId);
      chosen.question.conflictGroups.forEach(group => conflicts.add(group));
    }
    return true;
  } catch {
    return false;
  }
}
