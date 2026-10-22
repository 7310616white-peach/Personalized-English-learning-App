import { expect, test, type Page } from '@playwright/test';

async function importWords(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles({
    name: 'word-study.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        id: 'word-study-test',
        title: '原创词义学习测试',
        date: '2026-10-22',
        words: [
          {
            id: 'first',
            term: 'approach',
            meaning: '方法；接近',
            level: 'CET-4',
            collocations: ['a new approach 新方法'],
            example: 'Try a new approach.',
            exampleTranslation: '试一试新方法。',
          },
          { id: 'second', term: 'evidence', meaning: '证据', level: '科研英语' },
        ],
        choices: [],
      }),
    ),
  });
  await expect(page.getByRole('status').filter({ hasText: '已导入' })).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: '开始学习 →', exact: true }).click();
  await expect(page.locator('.word-heading strong')).toHaveText('approach');
}

test('今日新词先读中文，断点继续且只看不计完成，过完全部词再拼写', async ({ page }) => {
  await importWords(page);
  await expect(page.getByText('方法；接近', { exact: true })).toBeVisible();
  await expect(page.getByText('a new approach 新方法')).toBeVisible();
  await expect(page.getByText('试一试新方法。')).toBeVisible();
  await expect(page.getByLabel('你的拼写')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始拼写 →' })).toHaveCount(0);
  await page.getByRole('button', { name: '看过了，下一个词 →' }).click();
  await expect(page.locator('.word-heading strong')).toHaveText('evidence');
  await page.getByRole('button', { name: '上一个词' }).click();
  await expect(page.locator('.word-heading strong')).toHaveText('approach');
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await expect(page.locator('[data-task="words"]')).not.toContainText('已完成');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByText('累计提交 0 次练习', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '开始学习 →', exact: true }).click();
  await expect(page.locator('.word-heading strong')).toHaveText('evidence');
  await page.getByRole('button', { name: '学完了，准备拼写 →' }).click();
  await expect(page.getByRole('heading', { name: '这组词义已经过完了' })).toBeVisible();
  await expect(page.getByLabel('你的拼写')).toHaveCount(0);
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await page.getByLabel('你的拼写').fill('appr');
  await page.getByRole('button', { name: '暂时退出', exact: true }).click();
  await page.getByRole('button', { name: '开始学习 →', exact: true }).click();
  await expect(page.getByRole('heading', { name: '这组词义已经过完了' })).toBeVisible();
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await expect(page.getByLabel('你的拼写')).toHaveValue('appr');
  await page.getByLabel('你的拼写').fill('approach');
  await page.getByRole('button', { name: '检查答案' }).click();
  await expect(page.getByRole('status').filter({ hasText: '回答正确' })).toBeVisible();
});

test('词义进度写入失败时留在当前词，重试成功后才进入下一词', async ({ page }) => {
  await importWords(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, {
      restoreStudyWrites: () => {
        IDBObjectStore.prototype.put = original;
      },
    });
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'drafts') throw new DOMException('Test quota', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '看过了，下一个词 →' }).click();
  await expect(page.getByRole('alert')).toContainText('保存失败');
  await expect(page.locator('.word-heading strong')).toHaveText('approach');
  await expect(page.getByRole('status')).toContainText('已保存 0 / 2');
  await page.evaluate(() =>
    (window as unknown as { restoreStudyWrites(): void }).restoreStudyWrites(),
  );
  await page.getByRole('button', { name: '看过了，下一个词 →' }).click();
  await expect(page.locator('.word-heading strong')).toHaveText('evidence');
});
