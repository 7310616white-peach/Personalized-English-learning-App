import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
async function open(page: Page) {
  await page.goto('/');
  await page.getByText('预览与题型演示（验收后移除入口）', { exact: true }).click();
  await page.getByRole('button', { name: '打开四级题型体验 →' }).click();
  await page.getByRole('button', { name: '载入四级全题型体验' }).click();
  await expect(page.getByRole('button', { name: '开始选词填空', exact: true })).toBeVisible();
}
test('选词填空10空提交、题前禁止查词、题后解析和错题记录', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: '开始选词填空', exact: true }).click();
  await expect(page.getByRole('combobox')).toHaveCount(10);
  await expect(page.getByRole('button', { name: /^查询 / })).toHaveCount(0);
  await page.getByLabel('第 1 空', { exact: true }).selectOption('L');
  await page.getByRole('button', { name: '提交本篇答案' }).click();
  await expect(page.getByRole('heading', { name: '本篇正确率 10%（1/10）' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^查询 / }).first()).toBeVisible();
  await page.getByRole('button', { name: '返回题型列表', exact: true }).first().click();
  await page.getByRole('button', { name: '返回学习台', exact: true }).click();
  await page.getByRole('button', { name: '错题本', exact: true }).click();
  await expect(page.getByText('1 篇历史错题 · 0 篇到期复习 · 0 次翻译/作文待批改')).toBeVisible();
});
test('匹配可复用段落；作文和翻译草稿恢复、字数提示、待批改', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: '开始信息匹配', exact: true }).click();
  await page.getByRole('combobox').nth(0).selectOption('E');
  await page.getByRole('combobox').nth(1).selectOption('E');
  await page.getByRole('button', { name: '提交本篇答案' }).click();
  await expect(page.getByRole('heading', { name: '本篇正确率 10%（1/10）' })).toBeVisible();
  await page.getByRole('button', { name: '返回题型列表', exact: true }).first().click();
  await page.getByRole('button', { name: '开始短文写作', exact: true }).click();
  await expect(page.getByRole('heading', { name: '参考范文' })).toHaveCount(0);
  await page.getByLabel('英文作答', { exact: true }).fill('Small goals help me learn every day.');
  await expect(page.getByText('已写 7 词 · 建议 120–180 词 · 仅记录，不自动评分')).toBeVisible();
  await expect(page.getByText('草稿已保存', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('预览与题型演示（验收后移除入口）', { exact: true }).click();
  await page.getByRole('button', { name: '打开四级题型体验 →' }).click();
  await page.getByRole('button', { name: '开始短文写作', exact: true }).click();
  await expect(page.getByLabel('英文作答', { exact: true })).toHaveValue(
    'Small goals help me learn every day.',
  );
  await page.getByRole('button', { name: '提交本篇答案' }).click();
  await expect(page.getByRole('heading', { name: '已保存 · 待批改' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '参考范文' })).toBeVisible();
  await page.getByRole('button', { name: '返回题型列表', exact: true }).first().click();
  await page.getByRole('button', { name: '开始汉译英', exact: true }).click();
  await page
    .getByLabel('英文作答', { exact: true })
    .fill('Public libraries offer convenient services.');
  await page.getByRole('button', { name: '提交本篇答案' }).click();
  await expect(page.getByRole('heading', { name: '参考译文' })).toBeVisible();
});
test('八类体验入口、仔细阅读与三类离线音频均可打开', async ({ page }) => {
  await open(page);
  await expect(page.locator('.cet-format-grid > article')).toHaveCount(8);
  await page.getByRole('button', { name: '体验仔细阅读', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'What was the main purpose of the quiet hour?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '暂时退出' }).click();
  for (const title of ['短篇新闻', '长对话', '听力篇章']) {
    await page.getByRole('button', { name: '体验' + title, exact: true }).click();
    await expect(page.getByRole('heading', { name: title + ' · 仿真体验' })).toBeVisible();
    await expect(page.locator('audio')).toHaveJSProperty('readyState', 4);
    await page.getByRole('button', { name: '暂存并退出' }).click();
  }
});

test('新题型写入失败保持当前作答，重试后才退出', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: '开始短文写作', exact: true }).click();
  await expect(page.getByLabel('英文作答', { exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, {
      restoreWrittenWrites: () => {
        IDBObjectStore.prototype.put = original;
      },
    });
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'writtenDrafts')
        throw new DOMException('Test quota failure', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByLabel('英文作答', { exact: true }).fill('Keep this unfinished answer.');
  await expect(page.getByRole('alert')).toContainText('写入失败');
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('尚未保存成功');
  await expect(page.getByLabel('英文作答', { exact: true })).toHaveValue(
    'Keep this unfinished answer.',
  );
  await page.evaluate(() =>
    (window as unknown as { restoreWrittenWrites(): void }).restoreWrittenWrites(),
  );
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await page.getByRole('button', { name: '开始短文写作', exact: true }).click();
  await expect(page.getByLabel('英文作答', { exact: true })).toHaveValue(
    'Keep this unfinished answer.',
  );
});
