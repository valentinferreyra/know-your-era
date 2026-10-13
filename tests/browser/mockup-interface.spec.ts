import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ClientContent, ClientQuestion } from '../../src/content/types.ts';
import { startSession } from '../../src/game/session.ts';

const content = JSON.parse(readFileSync('src/content/generated/questions.json', 'utf8')) as ClientContent;
async function showQuestion(page: Page, question: ClientQuestion) {
  const session = startSession('Valentin', new Date('2026-10-13T12:00:00Z'), content);
  session.slots[0] = { category: question.category, kind: question.kind };
  session.selectedQuestions[0] = { questionId: question.id, displayOrder: question.kind === 'choice'
    ? { primary: question.options.map(item => item.id) }
    : question.kind === 'ordering' ? { primary: question.items.map(item => item.id) }
    : { primary: question.left.map(item => item.id), secondary: question.right.map(item => item.id) } };
  await page.evaluate(progress => localStorage.setItem('know-your-era.progress.v1', JSON.stringify(progress)), {
    version: 1, revision: 1, nickname: session.nickname, session, recentSessions: []
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
}

test('mockup composition uses loaded brand art, portraits, event logos and real fonts', async ({ page }, info) => {
  await page.goto('/');
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true });
  expect(await page.evaluate(() => document.fonts.check('600 18px "Barlow Condensed"'))).toBe(true);
  const question = content.questions.find(q => q.prompt.includes('with Steve Austin at WrestleMania XIV'))!;
  await showQuestion(page, question);
  await expect(page.locator('.question-arena img')).toHaveAttribute('alt', 'Steve Austin');
  await expect(page.locator('.event-logo')).toHaveAttribute('alt', 'WrestleMania XIV');
  await expect(page.locator('.answer-interaction img')).toHaveCount(0);
  expect(await page.locator('.question-arena img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.screenshot({ path: info.outputPath('main-event.png'), fullPage: true });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue challenge' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue challenge' }).click();
  await expect(page.getByRole('heading', { name: question.prompt })).toBeVisible();
  if (question.kind === 'choice') {
    const answer = page.locator(`input[value="${question.answer}"]`);
    await answer.check();
    await expect(answer).toBeFocused();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('.feedback-art img')).toBeVisible();
    await page.screenshot({ path: info.outputPath('feedback.png'), fullPage: true });
  }
  for (const category of ['champion-entering', 'rebuild-card', 'order-history']) {
    await showQuestion(page, content.questions.find(q => q.category === category && q.difficulty === 'easy')!);
    await expect(page.locator('.answer-interaction img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    await page.screenshot({ path: info.outputPath(`${category}.png`), fullPage: true });
  }
});

test('an unavailable portrait leaves a compact playable layout', async ({ page }) => {
  await page.route('**/assets/stone_cold.webp', route => route.abort());
  await page.goto('/');
  await showQuestion(page, content.questions.find(q => q.prompt.includes('with Steve Austin at WrestleMania XIV'))!);
  await expect(page.locator('.question-arena')).toHaveCount(0);
  await expect(page.locator('.question-stage')).not.toHaveClass(/has-art/);
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
});
