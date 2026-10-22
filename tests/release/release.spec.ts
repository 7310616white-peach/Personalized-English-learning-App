import { expect, test } from '@playwright/test';
test('正式界面不展示演示/载入入口，正常题包导入和记录保存继续可用', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '导入今日题包 →' })).toBeVisible();
  await expect(page.getByText('预览与题型演示（验收后移除入口）')).toHaveCount(0);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByRole('button', { name: /载入/ })).toHaveCount(0);
  await page.getByLabel('选择题包 JSON').setInputFiles('public/examples/day-001.json');
  await expect(page.getByRole('status').filter({ hasText: '已导入' })).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: '开始拼写 →', exact: true }).click();
  await page.getByLabel('你的拼写').fill('approach');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByText('累计提交 1 次练习', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /载入/ })).toHaveCount(0);
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await expect(page.getByRole('button', { name: /载入/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /模拟体验/ })).toHaveCount(0);
  await expect(page.getByText('导入 / 补绑听力材料', { exact: true })).toBeVisible();
});
test('隐藏演示工具后，真实拓展错题仍能继续练习和返回', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles('public/examples/cet4-formats.json');
  await expect(page.getByRole('status').filter({ hasText: '已导入' })).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page
    .locator('[data-task="cet"] .daily-parts')
    .getByRole('button', { name: /选词填空/ })
    .click();
  await page.getByRole('button', { name: '提交本篇答案', exact: true }).click();
  await expect(page.getByRole('heading', { name: '本篇正确率 0%（0/10）' })).toBeVisible();
  await page.getByRole('button', { name: '返回学习台', exact: true }).first().click();
  await page.getByRole('button', { name: '错题本', exact: true }).click();
  await page.getByRole('button', { name: '打开拓展题型继续练习', exact: true }).click();
  await expect(page.getByRole('heading', { name: '拓展练习', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /载入/ })).toHaveCount(0);
  await page.getByRole('button', { name: '开始练习', exact: true }).first().click();
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await expect(page.getByRole('button', { name: '返回错题本', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回错题本', exact: true }).click();
  await expect(page.getByRole('button', { name: '我的', exact: true })).toBeEnabled();
});
