import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
async function complete(page: Page, count: number, spelling = false) {
  for (let i = 0; i < count; i++) {
    if (spelling) await page.getByLabel('你的拼写').fill('practice');
    else await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '检查答案', exact: true }).click();
    await page.getByRole('button', { name: '下一题 →', exact: true }).click();
  }
  await page.getByRole('button', { name: '返回学习台', exact: true }).click();
}
async function preview(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '载入每日六项流程预览（含音频）', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '每日流程预览已载入' })).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
}
test('六项完成后高亮依次顺延，复习/听力/双阅读/文献/一句翻译都真实保存', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date('2026-10-21T02:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '载入示例：10 个四级词 + 2 个科研词' }).click();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: '开始拼写 →', exact: true }).click();
  await page.getByLabel('你的拼写').fill('practice');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  await preview(page);
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'words');
  await page.getByRole('button', { name: '开始拼写 →', exact: true }).click();
  await complete(page, 12, true);
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'review');
  await page.getByRole('button', { name: '开始复习 →', exact: true }).click();
  await complete(page, 1, true);
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'listening');
  await page.getByRole('button', { name: '开始听力 →', exact: true }).click();
  await page.getByRole('button', { name: '提交整组答案', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^本组结果/ })).toBeVisible();
  await page.getByRole('button', { name: '暂存并退出', exact: true }).click();
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'cet');
  await page.locator('[data-task="cet"] > button').click();
  await complete(page, 5);
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'cet');
  await page.locator('[data-task="cet"] > button').click();
  await page.getByRole('button', { name: '提交本篇答案', exact: true }).click();
  await expect(page.getByRole('region', { name: '本篇结果' })).toBeVisible();
  await page.getByRole('button', { name: '返回学习台', exact: true }).first().click();
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'research');
  await page.getByRole('button', { name: '开始阅读 →', exact: true }).click();
  await complete(page, 2);
  await expect(page.locator('.main-task')).toHaveAttribute('data-task', 'sentence');
  await page.locator('[data-task="sentence"] > button').click();
  await page.getByLabel('英文作答').fill('An association does not prove causation.');
  await page.getByRole('button', { name: '提交本篇答案', exact: true }).click();
  await expect(page.getByRole('heading', { name: '已保存 · 待批改' })).toBeVisible();
  await page.getByRole('button', { name: '返回学习台', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('今天的六项流程已完成');
  await page.reload();
  await expect(page.getByRole('status')).toContainText('今天的六项流程已完成');
  await expect(page.getByRole('heading', { name: '每一次练习，都有迹可循' })).toHaveCount(0);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByRole('heading', { name: '每一次练习，都有迹可循' })).toBeVisible();
});
test('新栏目、彩色首页按钮、范文独立阅读和按日复制提示词', async ({ page }) => {
  await preview(page);
  await expect(page.getByText('离线优先', { exact: true })).toHaveCount(0);
  const labels = await page.locator('.mobile-nav button').allTextContents();
  expect(labels.map((x) => x.replace(/Aa|♫|◷|↺|⇄/g, '').trim())).toEqual([
    '词汇手册',
    '听力训练',
    '学习台',
    '错题本',
    '我的',
  ]);
  await expect(page.locator('.mobile-nav .study-home-icon svg')).toBeVisible();
  await page.getByRole('button', { name: '打开范文栏 →' }).click();
  await page.locator('.model-essay summary').first().click();
  await expect(page.getByText('表达与思路', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '提交本篇答案' })).toHaveCount(0);
  await page.getByRole('button', { name: '返回学习台', exact: true }).click();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByText('手机使用流程与每日英语提示词', { exact: true }).click();
  await page.getByRole('button', { name: '复制每日学习提示词', exact: true }).click();
  await expect(page.getByLabel('可复制的提示词')).toContainText('2026-10-22');
  await expect(page.getByLabel('可复制的提示词')).toContainText('仔细阅读＋选词填空');
  await page.clock.setFixedTime(new Date('2026-10-24T02:00:00Z'));
  await page.getByRole('button', { name: '复制每日学习提示词', exact: true }).click();
  await expect(page.getByLabel('可复制的提示词')).toContainText('选词填空＋信息匹配＋段落翻译');
});
