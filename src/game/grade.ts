import type { ClientQuestion } from '../content/types.ts';
import type { Correction, DraftAnswer, Grade } from './types.ts';

export function gradeAnswer(question: ClientQuestion, answer: DraftAnswer): Grade {
  const invalid = () => { throw new Error('Invalid or incomplete response.'); };
  const corrections: Correction[] = [];
  if (question.kind !== answer.kind) return invalid();
  if (question.kind === 'choice' && answer.kind === 'choice') {
    const submitted = question.options.find(o => o.id === answer.optionId);
    const expected = question.options.find(o => o.id === question.answer);
    if (!submitted || !expected) return invalid();
    corrections.push({ id: 'answer', label: 'Answer', submitted: submitted.label, expected: expected.label, correct: submitted.id === expected.id });
  } else if (question.kind === 'ordering' && answer.kind === 'ordering') {
    if (!Array.isArray(answer.itemIds) || answer.itemIds.length !== question.items.length
      || new Set(answer.itemIds).size !== question.items.length
      || !answer.itemIds.every(id => question.items.some(item => item.id === id))) return invalid();
    question.answer.forEach((id, index) => corrections.push({ id: `position-${index + 1}`, label: `Position ${index + 1}`,
      submitted: question.items.find(item => item.id === answer.itemIds[index])!.label,
      expected: question.items.find(item => item.id === id)!.label, correct: id === answer.itemIds[index] }));
  } else if (question.kind === 'matching' && answer.kind === 'matching') {
    if (!answer.pairs || typeof answer.pairs !== 'object' || Array.isArray(answer.pairs)
      || Object.keys(answer.pairs).length !== question.left.length
      || !question.left.every(l => question.right.some(r => r.id === answer.pairs[l.id]))
      || new Set(Object.values(answer.pairs)).size !== question.right.length) return invalid();
    for (const item of question.left) corrections.push({ id: item.id, label: item.label,
      submitted: question.right.find(r => r.id === answer.pairs[item.id])!.label,
      expected: question.right.find(r => r.id === question.answer[item.id])!.label,
      correct: answer.pairs[item.id] === question.answer[item.id] });
  } else return invalid();
  const maximumPoints = { easy: 100, medium: 150, hard: 200 }[question.difficulty];
  const correctParts = corrections.filter(c => c.correct).length;
  const fullyCorrect = correctParts === corrections.length;
  return { fullyCorrect, earnedPoints: question.kind === 'matching' ? Math.floor(maximumPoints * correctParts / corrections.length) : fullyCorrect ? maximumPoints : 0,
    maximumPoints, correctParts, totalParts: corrections.length, corrections };
}
