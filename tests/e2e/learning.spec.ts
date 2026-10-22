import { startSpelling } from '../helpers/wordStudy';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { readFile } from 'node:fs/promises';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '导入或载入示例 →' }).click();
  await page.getByRole('button', { name: '载入示例：10 个四级词 + 2 个科研词' }).click();
  await expect(page.getByRole('status')).toContainText('示例题包已导入');
  await page.getByRole('button', { name: '学习台', exact: true }).click();
}

test('手机端：草稿跨刷新、拼写反馈、连续答题、错题和选择题', async ({ page }) => {
  await loadSample(page);
  await startSpelling(page);
  const input = page.getByRole('textbox', { name: '你的拼写' });
  await expect(input).toHaveAttribute('autocapitalize', 'none');
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await input.fill('appr');
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  await page.reload();
  await startSpelling(page);
  await expect(input).toHaveValue('appr');
  await input.fill('aproach');
  await input.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: '再记一次' })).toBeVisible();
  await expect(page.getByText('approach', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '下一题 →' }).click();
  await expect(input).toHaveValue('');
  await input.fill('EVIDENCE');
  await input.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  await page.getByRole('button', { name: '错题本', exact: true }).click();
  await expect(page.locator('summary').getByText('approach', { exact: true })).toBeVisible();
  await page.locator('summary').getByText('approach', { exact: true }).click();
  await expect(page.getByText(/累计错误 1 次/)).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: '开始仔细阅读', exact: true }).click();
  await page.getByRole('radio', { name: 'A available', exact: true }).check();
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ animations: 'disabled', path: 'outputs/手机学习台.png', fullPage: true });
});

test('文件导入、结果导出、备份到全新学习库的恢复', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '导入或载入示例 →' }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles('public/examples/day-001.json');
  await expect(page.getByRole('status')).toContainText('已导入');
  await page.getByLabel('选择题包 JSON').setInputFiles('public/examples/day-001.json');
  await expect(page.getByRole('alert')).toContainText('已存在');
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await startSpelling(page);
  await page.getByLabel('你的拼写').fill('approach');
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  const exportedPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出为 JSON', exact: true }).click();
  const exported = await exportedPromise;
  const result = JSON.parse(await readFile((await exported.path())!, 'utf-8'));
  expect(result.attempts[0].answer).toBe('approach');
  const backupPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click();
  const file = await backupPromise;
  const filePath = (await file.path())!;
  const context = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const fresh = await context.newPage();
  await fresh.goto('/');
  await fresh.getByRole('button', { name: '导入或载入示例 →' }).click();
  await fresh.getByLabel('选择备份文件').setInputFiles(filePath);
  await expect(fresh.getByRole('region')).toContainText('1 条答题记录');
  await fresh.getByRole('button', { name: '确认替换并恢复' }).click();
  await expect(fresh.getByRole('status')).toContainText('恢复完成');
  await fresh.getByRole('button', { name: '学习台', exact: true }).click();
  await fresh.getByRole('button', { name: '我的', exact: true }).click();
  await expect(fresh.getByText('累计提交 1 次练习', { exact: true })).toBeVisible();
  await context.close();
});

test('首次缓存完成后可断网重开并作答', async ({ page, context }) => {
  await loadSample(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await startSpelling(page);
  await page.getByLabel('你的拼写').fill('approach');
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: 'disabled',
    path: 'outputs/手机拼写练习.png',
    fullPage: true,
  });
});

test('答题后原位查词与收藏，没有独立查词导航', async ({ page }) => {
  await loadSample(page);
  await expect(page.getByRole('button', { name: '阅读查词', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '开始仔细阅读', exact: true }).click();
  await expect(page.getByRole('button', { name: /^查询 / })).toHaveCount(0);
  await page.getByRole('radio', { name: 'A available', exact: true }).check();
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '查询 available', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: '单词释义' });
  await expect(dialog.getByText('本地释义', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '加入生词本', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('已加入生词本');
  await page.screenshot({ animations: 'disabled', path: 'outputs/题后点词释义.png' });
  await dialog.getByRole('button', { name: '关闭释义' }).click();
  await page.getByRole('button', { name: '暂时退出' }).click();
  await page.getByRole('button', { name: '词汇手册', exact: true }).click();
  await expect(page.locator('summary').getByText('available', { exact: true })).toHaveCount(2);
});
