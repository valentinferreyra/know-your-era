import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ClientContent, ClientQuestion } from '../../src/content/types.ts';
import { startSession } from '../../src/game/session.ts';

const content = JSON.parse(readFileSync('src/content/generated/questions.json', 'utf8')) as ClientContent;
const question = content.questions.find((q): q is Extract<ClientQuestion, { kind: 'choice' }> => q.kind === 'choice' && q.prompt.includes('with Steve Austin at WrestleMania XIV'))!;
const correct = question.answer;

async function openQuestion(page: Page, selected: ClientQuestion = question) {
  await page.clock.install({ time: new Date('2026-10-18T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-18T12:00:01Z'));
  await page.goto('/');
  const session = startSession('Timer Fan', new Date('2026-10-18T12:00:00Z'), content);
  session.selectedQuestions[0] = { questionId: selected.id, displayOrder: selected.kind === 'choice'
    ? { primary: selected.options.map(option => option.id) }
    : selected.kind === 'ordering' ? { primary: selected.items.map(item => item.id) }
    : { primary: selected.left.map(item => item.id), secondary: selected.right.map(item => item.id) } };
  await page.evaluate(session => localStorage.setItem('know-your-era.progress.v1', JSON.stringify({
    version: 1, revision: 1, nickname: session.nickname, session, recentSessions: []
  })), session);
  await page.reload();
}

test('timer survives selection, awards the decayed bonus, and excludes feedback time', async ({ page }, info) => {
  await openQuestion(page);
  await expect(page.locator('[data-elapsed]')).toHaveText('0:00');
  await expect(page.locator('.question-status .clock-face [data-speed-bonus]')).toHaveText('+25%');
  const circle = await page.locator('.question-timer').boundingBox();
  expect(circle!.width).toBeGreaterThanOrEqual(90);
  expect(circle!.width).toBeCloseTo(circle!.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.clock.fastForward(17_500);
  await page.locator(`input[value="${correct}"]`).check();
  await expect(page.locator('[data-elapsed]')).toHaveText('0:17');
  await expect(page.locator('.question-timer')).toHaveCSS('--remaining', '50%');
  await page.screenshot({ path: info.outputPath('timer-question.png'), fullPage: true });
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('.points-earned')).toHaveText('113 points earned');
  await expect(page.locator('.score-breakdown')).toContainText('100 correct + 13 speed bonus');
  await expect(page.locator('.question-timer')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('timer-feedback.png'), fullPage: true });
  await page.clock.fastForward(90_000);
  await page.reload();
  await expect(page.locator('.points-earned')).toHaveText('113 points earned');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.locator('[data-elapsed]')).toHaveText('0:00');
});

test('reload does not reset the clock and late answers keep their base points', async ({ page }) => {
  await openQuestion(page);
  await expect(page.locator('[data-elapsed]')).toHaveText('0:00');
  await page.clock.fastForward(12_000);
  await page.reload();
  await expect(page.locator('[data-elapsed]')).toHaveText('0:12');
  await page.clock.fastForward(120_000);
  await expect(page.locator('[data-speed-bonus]')).toHaveText('+0%');
  await expect(page.locator('.question-timer')).toHaveCSS('--remaining', '0%');
  await page.locator(`input[value="${correct}"]`).check();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('.points-earned')).toHaveText('100 points earned');
  await expect(page.locator('.score-breakdown')).toContainText('100 correct + 0 speed bonus');
});

test('asset loading does not consume response time', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/stone_cold.webp', async route => { await gate; await route.continue(); });
  // DOMContentLoaded lets the test inspect the loading state before releasing the portrait.
  await page.clock.install({ time: new Date('2026-10-18T12:00:00Z') });
  await page.goto('/');
  const session = startSession('Loading Fan', new Date('2026-10-18T12:00:00Z'), content);
  session.selectedQuestions[0] = { questionId: question.id, displayOrder: { primary: question.options.map(option => option.id) } };
  await page.evaluate(session => localStorage.setItem('know-your-era.progress.v1', JSON.stringify({
    version: 1, revision: 1, nickname: session.nickname, session, recentSessions: []
  })), session);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.question-timer')).toHaveAttribute('aria-busy', 'true');
  await page.clock.fastForward(30_000);
  release();
  await expect(page.locator('[data-elapsed]')).toHaveText('0:00');
  await expect(page.locator('[data-speed-bonus]')).toHaveText('+25%');
});

for (const kind of ['ordering', 'matching'] as const) {
  test(`${kind} retains the full bonus for 15 seconds and decays more slowly`, async ({ page }) => {
    const selected = content.questions.find(q => q.kind === kind && q.difficulty === 'easy')!;
    await openQuestion(page, selected);
    await expect(page.locator('[data-elapsed]')).toHaveText('0:00');
    await page.clock.fastForward(15_000);
    await expect(page.locator('[data-speed-bonus]')).toHaveText('+25%');
    await page.clock.fastForward(10_000);
    await expect(page.locator('[data-speed-bonus]')).toHaveText(kind === 'ordering' ? '+17%' : '+19%');
    if (selected.kind === 'ordering') {
      for (const id of selected.answer) await page.locator(`[data-order-item="${id}"]`).click();
    } else if (selected.kind === 'matching') {
      for (const [left, right] of Object.entries(selected.answer)) {
        await page.locator(`[data-match-left="${left}"]`).click();
        await page.locator(`[data-match-right="${right}"]`).click();
      }
    }
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.locator('.points-earned')).toHaveText(kind === 'ordering' ? '117 points earned' : '119 points earned');
  });
}
