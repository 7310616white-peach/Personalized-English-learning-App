import { expect, test, type Page } from '@playwright/test';
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
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  const input = page.getByRole('textbox', { name: '你的拼写' });
  await expect(input).toHaveAttribute('autocapitalize', 'none');
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await input.fill('appr');
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  await page.reload();
  await page.getByRole('button', { name: '开始拼写 →' }).click();
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
  await page.getByRole('button', { name: '开始练题 →' }).click();
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
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await page.getByLabel('你的拼写').fill('approach');
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  await page.getByRole('button', { name: '题包与数据', exact: true }).click();
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
  await expect(fresh.getByText('已练习 1 道题', { exact: true })).toBeVisible();
  await context.close();
});

test('首次缓存完成后可断网重开并作答', async ({ page, context }) => {
  await loadSample(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '开始拼写 →' }).click();
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

test('离线查词、自填生词与生词练习', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '阅读查词', exact: true }).click();
  await page.getByLabel('输入或粘贴不认识的英文单词 / 短语').fill('cohorts');
  await page.getByRole('button', { name: '查词', exact: true }).click();
  await page.getByRole('button', { name: 'cohort', exact: true }).click();
  await expect(page.getByText('本地释义', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '加入阅读生词', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已加入我的阅读生词');
  await page.getByLabel('输入或粘贴不认识的英文单词 / 短语').fill('newterm');
  await page.getByRole('button', { name: '查词', exact: true }).click();
  await page.getByLabel('自填中文释义').fill('测试词义');
  await page.getByRole('button', { name: '保存自填生词', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已加入我的阅读生词');
  await page.getByRole('button', { name: '练习阅读生词 →' }).click();
  await expect(page.getByRole('textbox', { name: '你的拼写' })).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ animations: 'disabled', path: 'outputs/阅读查词.png', fullPage: true });
});
