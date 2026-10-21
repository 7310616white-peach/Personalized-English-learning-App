import { expect, test } from '@playwright/test';

test('一键载入模拟题库、离线播放和提交，保留重复载入前的记录', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByRole('button', { name: '载入模拟体验题库（含音频）', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '体验题库已就绪' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始本组听力', exact: true })).toHaveCount(4);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByRole('button', { name: '开始本组听力', exact: true }).first().click();
  await expect(page.getByRole('button', { name: '提交整组答案' })).toBeEnabled();
  const seconds = await page.locator('audio').evaluate((el: HTMLAudioElement) => el.duration);
  expect(seconds).toBeGreaterThan(15);
  await page.getByRole('button', { name: '从头重播' }).click();
  await expect
    .poll(() => page.locator('audio').evaluate((el: HTMLAudioElement) => el.currentTime))
    .toBeGreaterThan(0);
  await page.getByRole('radio', { name: 'A A new cafe.', exact: true }).check();
  await page.getByRole('radio', { name: 'C Online.', exact: true }).check();
  await page.getByRole('textbox', { name: '题 3 第 1 空' }).fill('forty');
  await page.getByRole('textbox', { name: '题 3 第 2 空' }).fill('water');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: 'outputs/模拟听力-手机答题.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '提交整组答案' }).click();
  await expect(page.getByRole('heading', { name: '本组结果：75%' })).toBeVisible();
  await page.screenshot({
    path: 'outputs/模拟听力-提交反馈.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '返回听力训练', exact: true }).click();
  await page.getByRole('button', { name: '载入模拟体验题库（含音频）', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '体验题库已就绪' })).toBeVisible();
  await expect(page.getByText(/本音轨已练 1 次/)).toBeVisible();
});
