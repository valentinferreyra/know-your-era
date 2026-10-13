import { expect, test } from '@playwright/test';

test('a stale second tab cannot overwrite newer progress', async ({ context, page }) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Tab One');
  await page.getByRole('button', { name: 'Play daily challenge' }).click();
  await submitCurrent(page);
  const stale = await context.newPage();
  await stale.goto('/');
  await expect(stale.locator('.feedback-content')).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  const indexBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.questionIndex);
  await stale.getByRole('button', { name: 'Next question' }).click();
  await expect(stale.getByRole('alert')).toContainText('changed in another tab');
  const savedIndex = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.questionIndex);
  expect(savedIndex).toBe(indexBefore);
  await stale.close();
});

async function submitCurrent(page: import('@playwright/test').Page): Promise<void> {
  const question = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session;
    const id = session.selectedQuestions[session.questionIndex].questionId;
    return session.contentSnapshot.questions.find((item: { id: string }) => item.id === id);
  });
  if (question.kind === 'choice') await page.locator(`input[type="radio"][value="${question.answer}"]`).check();
  else if (question.kind === 'ordering') for (const id of question.answer) await page.locator(`[data-order-item="${id}"]`).click();
  else for (const [left, right] of Object.entries(question.answer)) {
    await page.locator(`[data-match-left="${left}"]`).click();
    await page.locator(`[data-match-right="${right}"]`).click();
  }
  await page.getByRole('button', { name: 'Confirm' }).click();
}

test('corrupt progress has a recoverable reset path', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('know-your-era.progress.v1', '{invalid'));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await expect(page.getByRole('status').first()).toContainText('could not be read');
  await page.getByRole('button', { name: 'Reset local progress' }).click();
  await expect(page.getByRole('heading', { name: 'Know Your Era' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('know-your-era.progress.v1'))).toBeNull();
});
