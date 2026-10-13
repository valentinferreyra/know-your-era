import { expect, test, type Page } from '@playwright/test';

type Saved = { session: { dayKey: string; questionIndex: number; score: number; phase: string; selectedQuestions: { questionId: string }[]; contentSnapshot: { questions: Question[] } } };
type Question = { id: string; kind: string; difficulty: string; options?: { id: string }[]; answer: string | string[] | Record<string, string>; items?: { id: string }[]; left?: { id: string }[]; right?: { id: string }[] };

test('one daily run includes all interactions, immediate explanations, results, and read-only review', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T12:00:00.000Z') });
  await page.goto('/');
  await page.getByLabel('Your name').fill('Ringside Fan');
  await page.getByRole('button', { name: 'Play daily challenge' }).click();
  const seen = new Set<string>();
  let partialMatch = false;
  for (let index = 0; index < 10; index++) {
    const current = await getCurrentQuestion(page);
    seen.add(current.kind);
    const canUsePartial = current.kind === 'matching' && (current.left?.length ?? 0) >= 3;
    await submitAnswer(page, current, canUsePartial && !partialMatch);
    if (canUsePartial && !partialMatch) {
      partialMatch = true;
      await expect(page.getByText(/Partially correct/i)).toBeVisible();
    } else await expect(page.getByText(/Correct/i).first()).toBeVisible();
    await expect(page.locator('.explanation')).toBeVisible();
    if (index < 9) await page.getByRole('button', { name: 'Next question' }).click();
  }
  expect([...seen].sort()).toEqual(['choice', 'matching', 'ordering']);
  expect(partialMatch).toBe(true);
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(page.getByText('Daily challenge complete')).toBeVisible();
  await expect(page.getByText('Fully correct')).toBeVisible();
  const savedBeforeReview = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.score);
  await page.getByRole('button', { name: 'Review answers' }).click();
  await expect(page.getByRole('heading', { name: 'Answer review' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.score)).toBe(savedBeforeReview);
  await expect(page.locator('main')).not.toContainText(/\bWWF\b|Source|1998\s*(?:–|-|to)\s*2004/i);
});

test('a run started before UTC-3 midnight resumes after it; a new day starts easy', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T02:59:00.000Z') });
  await page.goto('/');
  await page.getByLabel('Your name').fill('Late Night Fan');
  await page.getByRole('button', { name: 'Play daily challenge' }).click();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  let current = await getCurrentQuestion(page);
  expect(current.difficulty).toBe('easy');
  await submitAnswer(page, current);
  await page.clock.setFixedTime(new Date('2026-10-15T03:01:00.000Z'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
  const old = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!));
  expect(old.session.dayKey).toBe('2026-10-14');
  await page.getByRole('button', { name: 'Next question' }).click();
  current = await getCurrentQuestion(page);
  await expect(page.locator('.progress-track')).toHaveAttribute('aria-label', 'Question 2 of 10');
  // Continue the old attempt through its result screen, then deliberately begin the new date.
  for (let index = 1; index < 10; index++) {
    await submitAnswer(page, await getCurrentQuestion(page));
    await page.getByRole('button', { name: index === 9 ? 'View results' : 'Next question' }).click();
  }
  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Play daily challenge' }).click();
  const nextDay = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!));
  expect(nextDay.session.dayKey).toBe('2026-10-15');
  expect(nextDay.session.difficultyState.level).toBe('easy');
});

async function getCurrentQuestion(page: Page): Promise<Question> {
  return page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('know-your-era.progress.v1')!);
    const session = saved.session;
    const id = session.selectedQuestions[session.questionIndex].questionId;
    return session.contentSnapshot.questions.find((question: Question) => question.id === id);
  });
}

async function submitAnswer(page: Page, question: Question, partial = false): Promise<void> {
  if (question.kind === 'choice') {
    await page.locator(`input[type="radio"][value="${question.answer}"]`).check();
  } else if (question.kind === 'ordering') {
    for (const id of question.answer as string[]) await page.locator(`[data-order-item="${id}"]`).click();
  } else if (question.kind === 'matching') {
    const pairs = question.answer as Record<string, string>;
    const entries = Object.entries(pairs);
    if (partial && entries.length >= 2) {
      const [[leftA, rightA], [leftB, rightB]] = entries as [string, string][];
      entries[0] = [leftA!, rightB!]; entries[1] = [leftB!, rightA!];
    }
    for (const [leftId, rightId] of entries) {
      await page.locator(`[data-match-left="${leftId}"]`).click();
      await page.locator(`[data-match-right="${rightId}"]`).click();
    }
  }
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm' }).click();
}
