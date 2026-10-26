import { expect, test, type Page } from '@playwright/test';
import { historyPack } from '../helpers/historyFixtures';
import { startSpelling } from '../helpers/wordStudy';

async function setup(page: Page, manyEssays = false) {
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  const pack = historyPack();
  if (pack.schemaVersion !== 3 || !pack.daily) throw new Error('fixture');
  const example = pack.daily.modelEssays[0];
  const payload = {
    ...pack,
    daily: {
      ...pack.daily,
      modelEssays: Array.from({ length: manyEssays ? 14 : 1 }, (_, i) => ({
        ...example,
        id: 'essay-' + i,
        title: '原创范文 ' + (i + 1),
        body: 'This original example explains how to study every day.\n\n'.repeat(30),
      })),
    },
  };
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles({
    name: 'reading.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.getByRole('button', { name: '继续学习此题包 →', exact: true }).click();
}
async function swipe(page: Page, selector: string, direction: number) {
  await page.locator(selector).evaluate((target, dx) => {
    const first = new Touch({ identifier: 1, target, clientX: 190, clientY: 350 });
    const last = new Touch({ identifier: 1, target, clientX: 190 + dx, clientY: 350 });
    target.dispatchEvent(
      new TouchEvent('touchstart', { bubbles: true, touches: [first], changedTouches: [first] }),
    );
    target.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [last] }),
    );
  }, direction * 145);
}
const paint = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

test('范文独立详情、左右滑与按钮返回都恢复父页面滚动位置', async ({ page }) => {
  await page.route('**/assets/ModelEssays-*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await setup(page, true);
  const open = page.getByRole('button', { name: '打开范文栏 →' });
  await open.scrollIntoViewIfNeeded();
  await paint(page);
  const homeY = await page.evaluate(() => scrollY);
  expect(homeY).toBeGreaterThan(200);
  await open.click();
  await expect(page.getByRole('heading', { name: '范文栏', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const essay = page.getByRole('button', { name: '阅读范文：原创范文 12', exact: true });
  await essay.scrollIntoViewIfNeeded();
  await paint(page);
  const listY = await page.evaluate(() => scrollY);
  expect(listY).toBeGreaterThan(200);
  await essay.click();
  await expect(page.getByRole('heading', { name: '原创范文 12', exact: true })).toBeVisible();
  await expect(page.locator('.essay-list')).toHaveCount(0);
  await expect(page.locator('.model-essay')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 500));
  await paint(page);
  await swipe(page, '.essay-body', -1);
  await expect(page.locator('.essay-list')).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(listY, 0);
  await swipe(page, '.essay-list', 1);
  await expect(page.locator('.welcome')).toBeAttached();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(homeY, 0);
  await open.click();
  await page.getByRole('button', { name: '返回学习台', exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(homeY, 0);
});

test('词汇按首次学习日折叠，复习不迁组，未学习归一组，刷新保留', async ({ page }) => {
  await setup(page);
  await startSpelling(page);
  await page.getByLabel('你的拼写').fill('x');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-23T02:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await startSpelling(page);
  await page.getByLabel('你的拼写').fill('x');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.getByRole('button', { name: '词汇手册', exact: true }).click();
  await expect(page.locator('.word-date-heading strong')).toHaveText([
    '2026-10-23',
    '2026-10-22',
    '未学习',
  ]);
  await expect(page.locator('.word-date-group[open]')).toHaveCount(0);
  const group22 = page
    .locator('.word-date-group')
    .filter({ has: page.locator('.word-date-heading strong', { hasText: '2026-10-22' }) });
  await group22.locator('.word-date-heading').click();
  await expect(group22.locator('.library-item')).toHaveCount(1);
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: /^开始复习/ }).click();
  await page.getByLabel('你的拼写').fill('x');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '词汇手册', exact: true }).click();
  await expect(page.locator('.word-date-heading strong')).toHaveText([
    '2026-10-23',
    '2026-10-22',
    '未学习',
  ]);
  await group22.locator('.word-date-heading').click();
  await expect(group22.locator('.library-item')).toContainText('练习 2 次');
});

test('手机采用中性简洁配色，卡片对齐且无横向溢出', async ({ page }) => {
  await setup(page);
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).color)).toBe(
    'rgb(23, 23, 23)',
  );
  expect(
    await page
      .locator(':root')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--canvas').trim()),
  ).toBe('#ffffff');
  const boxes = await page
    .locator('.welcome,.daily-task,.essay-entry')
    .evaluateAll((es) =>
      es.map((e) => ({ x: e.getBoundingClientRect().x, right: e.getBoundingClientRect().right })),
    );
  for (const box of boxes) expect(box).toEqual(boxes[0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
