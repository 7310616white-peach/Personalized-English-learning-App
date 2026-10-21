import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function swipe(page: Page, selector: string, dx: number, dy = 0) {
  await page.locator(selector).evaluate(
    (target, delta) => {
      const first = new Touch({ identifier: 1, target, clientX: 190, clientY: 350 });
      const last = new Touch({
        identifier: 1,
        target,
        clientX: 190 + delta.dx,
        clientY: 350 + delta.dy,
      });
      target.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, touches: [first], changedTouches: [first] }),
      );
      target.dispatchEvent(
        new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [last] }),
      );
    },
    { dx, dy },
  );
}
async function words(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '载入示例：10 个四级词 + 2 个科研词' }).click();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await expect(page.getByLabel('你的拼写')).toBeEnabled();
}
test('页面左右滑均保存退出，输入控件和纵向滚动不误触', async ({ page }) => {
  await words(page);
  await page.getByLabel('你的拼写').fill('appr');
  await swipe(page, '#spelling-answer', -150);
  await expect(page.getByLabel('你的拼写')).toBeVisible();
  await swipe(page, '.answer-card', 120, 170);
  await expect(page.getByLabel('你的拼写')).toBeVisible();
  await swipe(page, '.answer-card', -150);
  await expect(page.getByRole('button', { name: '开始拼写 →' })).toBeVisible();
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await expect(page.getByLabel('你的拼写')).toHaveValue('appr');
  await page.getByLabel('你的拼写').fill('appro');
  await swipe(page, '.answer-card', 150);
  await page.getByRole('button', { name: '开始拼写 →' }).click();
  await expect(page.getByLabel('你的拼写')).toHaveValue('appro');
});
test('写入失败时滑动不能离开答题，重试成功后才退出', async ({ page }) => {
  await words(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, {
      restoreDraftWrites: () => {
        IDBObjectStore.prototype.put = original;
      },
    });
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'drafts')
        throw new DOMException('Test quota failure', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByLabel('你的拼写').fill('keep-me');
  await expect(page.getByRole('alert')).toContainText('写入失败');
  await swipe(page, '.answer-card', -150);
  await expect(page.getByRole('alert')).toContainText('草稿尚未保存成功');
  await expect(page.getByLabel('你的拼写')).toHaveValue('keep-me');
  await page.evaluate(() =>
    (window as unknown as { restoreDraftWrites(): void }).restoreDraftWrites(),
  );
  await swipe(page, '.answer-card', 150);
  await expect(page.getByRole('button', { name: '开始拼写 →' })).toBeVisible();
});
test('听力导入在任务最底部，题后原文可点词，水平滑动恢复草稿', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '进入听力训练', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByRole('button', { name: '载入模拟体验题库（含音频）' }).click();
  await expect(page.getByRole('button', { name: '开始本组听力' })).toHaveCount(4);
  expect(
    await page
      .locator('.listening-import')
      .evaluate((el) => !!el.previousElementSibling?.classList.contains('listening-groups')),
  ).toBe(true);
  await page.getByRole('button', { name: '开始本组听力' }).first().click();
  await expect(page.getByRole('button', { name: '提交整组答案' })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^查询 / })).toHaveCount(0);
  await page.getByRole('textbox', { name: '题 3 第 1 空' }).fill('forty');
  await swipe(page, '.listening-session-gesture', 150);
  await page.getByRole('button', { name: '开始本组听力' }).first().click();
  await expect(page.getByRole('textbox', { name: '题 3 第 1 空' })).toHaveValue('forty');
  await page.getByRole('button', { name: '提交整组答案' }).click();
  await expect(page.getByRole('heading', { name: /^本组结果/ })).toBeVisible();
  await page
    .locator('.transcript')
    .getByRole('button', { name: '查询 library', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog').getByText('n. 图书馆', { exact: true })).toBeVisible();
});
test('手机提示词可见，粘贴题包校验导入，错误内容不写入', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByText('手机使用流程与每日英语提示词', { exact: true }).click();
  await page.getByRole('button', { name: '复制首次设置提示词', exact: true }).click();
  await expect(page.getByLabel('可复制的提示词')).toContainText('schemaVersion');
  await page.getByText('粘贴题包 JSON', { exact: true }).click();
  await page.getByRole('textbox', { name: '粘贴题包 JSON', exact: true }).fill('bad');
  await page.getByRole('button', { name: '校验并导入粘贴的 JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('有效 JSON');
  await page.getByRole('textbox', { name: '粘贴题包 JSON', exact: true }).fill(
    JSON.stringify({
      schemaVersion: 2,
      id: 'phone-pack',
      title: '手机导入体验',
      date: '2026-10-22',
      words: [{ id: 'w1', term: 'study', level: 'CET-4', meaning: '学习' }],
      choices: [],
      listening: [],
    }),
  );
  await page.getByRole('button', { name: '校验并导入粘贴的 JSON' }).click();
  await expect(page.getByRole('status').filter({ hasText: '手机导入体验' })).toBeVisible();
});
