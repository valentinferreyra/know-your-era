import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Know Your Era' })).toBeVisible();
  await page.getByLabel('Your name').fill('Ringside Fan');
  await page.getByRole('button', { name: 'Play daily challenge' }).click();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  if (await page.locator('.question-arena img').count() === 0)
    await expect(page.locator('.question-arena')).toHaveCSS('display', 'none');
}

test('home is centered, portrait-free, and copy avoids WWF/source/range labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Know Your Era' })).toBeVisible();
  await expect(page.getByText('10 questions. A new challenge every day.')).toBeVisible();
  await expect(page.getByText('Fan-made · Unofficial')).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/\bWWF\b|source|1998\s*(?:–|-|to)\s*2004/i);
  const main = await page.locator('.screen').boundingBox();
  expect(main).not.toBeNull();
  expect(main!.width).toBeLessThanOrEqual(1000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.getByLabel('Your name').fill('The Most Unstoppable Ringside Commentator');
  await expect(page.getByLabel('Your name')).toHaveValue('The Most Unstoppable Ringsid');
});

test('choice can be changed and Confirm remains the shared submit label', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 10 && await page.locator('[data-kind]').getAttribute('data-kind') !== 'choice'; i++) {
    await answerCurrent(page);
  }
  await expect(page.locator('[data-kind="choice"]')).toBeVisible();
  const options = page.getByRole('radio');
  await options.nth(0).check();
  await options.nth(1).check();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeEnabled();
});

test('all interaction types support complete answers without drag and show immediate corrections', async ({ page }) => {
  await start(page);
  const found = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const kind = await page.locator('[data-kind]').getAttribute('data-kind');
    if (kind) found.add(kind);
    await answerCurrent(page);
  }
  expect([...found].sort()).toEqual(['choice', 'matching', 'ordering']);
  await expect(page.locator('input[type="text"], textarea')).toHaveCount(0);
  await expect(page.getByText('Daily challenge complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review answers' })).toBeVisible();
});

test('matching pairs can be created by keyboard and replacing a pairing stays one-to-one', async ({ page }) => {
  await start(page);
  while (await page.locator('[data-kind]').getAttribute('data-kind') !== 'matching') await answerCurrent(page);
  const left = page.locator('[data-match-left]');
  const right = page.locator('[data-match-right]');
  await left.nth(0).click();
  await right.nth(0).press('Enter');
  await expect(page.getByText(/1 of \d+ pairs connected/i)).toBeVisible();
  await expect(page.locator('svg.match-lines line')).toHaveCount(1);
  await page.setViewportSize({ width: 812, height: 375 });
  await expect(page.locator('svg.match-lines line')).toHaveCount(1);
  await left.nth(1).click();
  await right.nth(0).click();
  await expect(page.getByText(/1 of \d+ pairs connected/i)).toBeVisible();
  await page.locator('[data-match-left]').nth(1).click();
  await page.locator('[data-match-left]').nth(1).click();
  await expect(page.getByText(/0 of \d+ pairs connected/i)).toBeVisible();
  await page.getByRole('button', { name: 'Reset pairs' }).click();
  await expect(page.getByText(/0 of \d+ pairs connected/i)).toBeVisible();
});

test('draft and immediate feedback survive a reload without changing the pinned question', async ({ page }) => {
  await start(page);
  const before = await page.locator('[data-kind]').getAttribute('data-kind');
  if (before === 'choice') await page.getByRole('radio').first().check();
  else if (before === 'ordering') await page.locator('[data-order-item]').first().click();
  else if (before === 'matching') {
    await page.locator('[data-match-left]').first().click();
    await page.locator('[data-match-right]').first().click();
  }
  const savedId = await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.selectedQuestions[0].questionId);
  await page.reload();
  await expect(page.locator(`[data-kind="${before}"]`)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('know-your-era.progress.v1')!).session.selectedQuestions[0].questionId)).toBe(savedId);
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.reload();
  await expect(page.locator('.feedback-content')).toContainText(/correct|incorrect|partially correct/i);
  await expect(page.locator('.feedback-content')).toContainText('points earned');
});

test('storage failure stays playable and is clearly disclosed', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'know-your-era.progress.v1') throw new DOMException('Storage disabled', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await start(page);
  await expect(page.getByRole('status').filter({ hasText: 'only in memory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  while (await page.locator('[data-kind]').getAttribute('data-kind') !== 'choice') await answerCurrent(page);
  await page.getByRole('radio').first().check();
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeEnabled();
});

test('reduced-motion and landscape sizing keep the game usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await page.setViewportSize({ width: 812, height: 375 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  const duration = await page.locator('.button').first().evaluate(node => getComputedStyle(node).transitionDuration);
  expect(duration.split(',').every(value => parseFloat(value) <= 0.01)).toBe(true);
});

test('ordering supports undo and reset; answer entry stays closed-choice', async ({ page }) => {
  await start(page);
  while (await page.locator('[data-kind]').getAttribute('data-kind') !== 'ordering') await answerCurrent(page);
  const items = page.locator('[data-order-item]');
  await items.nth(0).click();
  await items.nth(1).click();
  await expect(page.getByText(/2 of \d+ placed/i)).toBeVisible();
  await page.getByRole('button', { name: 'Undo last' }).click();
  await expect(page.getByText(/1 of \d+ placed/i)).toBeVisible();
  await page.getByRole('button', { name: 'Reset order' }).click();
  await expect(page.getByText(/0 of \d+ placed/i)).toBeVisible();
  await expect(page.locator('input[type="text"], textarea')).toHaveCount(0);
});

async function answerCurrent(page: Page) {
  await fillCurrent(page);
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(/correct|incorrect/i).first()).toBeVisible();
  await expect(page.locator('.screen h1')).toBeFocused();
  const next = page.getByRole('button', { name: /next question|view results/i });
  await next.click();
}

async function fillCurrent(page: Page) {
  const kind = await page.locator('[data-kind]').getAttribute('data-kind');
  if (kind === 'choice') {
    await page.getByRole('radio').first().check();
  } else if (kind === 'ordering') {
    const items = page.locator('[data-order-item]');
    const count = await items.count();
    for (let i = 0; i < count; i++) await items.first().click();
  } else if (kind === 'matching') {
    const left = page.locator('[data-match-left]');
    const right = page.locator('[data-match-right]');
    for (let i = 0; i < await left.count(); i++) {
      await left.nth(i).click();
      await right.nth(i).click();
    }
  } else throw new Error(`Unexpected interaction: ${kind}`);
}
