import { expect, test, type Page } from '@playwright/test';
import { historyPack } from '../helpers/historyFixtures';

async function upload(page: Page, day: string, changed = false) {
  const pack = historyPack(day);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles({
    name: 'daily-' + day.replaceAll('-', '') + '.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(changed ? { ...pack, title: '冲突版本' } : pack)),
  });
}
async function continuePack(page: Page) {
  await page.getByRole('button', { name: '继续学习此题包 →', exact: true }).click();
}

test('23日补22日：原题型、已完成阅读、未完成选词、切包与相同导入均保留记录', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
  await page.goto('/');
  await upload(page, '2026-10-22');
  await continuePack(page);
  await page
    .locator('[data-task="cet"] .daily-parts')
    .getByRole('button', { name: /仔细阅读/ })
    .click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '检查答案', exact: true }).click();
    if (!i) {
      await page
        .getByRole('button', { name: /^查询 / })
        .first()
        .click();
      await expect(page.getByRole('dialog', { name: '单词释义' })).toBeVisible();
      await page.getByRole('button', { name: '关闭释义' }).click();
    }
    await page.getByRole('button', { name: '下一题 →', exact: true }).click();
  }
  await page.getByRole('button', { name: '返回学习台', exact: true }).click();
  await page.clock.setFixedTime(new Date('2026-10-22T16:30:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: '错题本', exact: true }).click();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await expect(page.locator('.welcome .eyebrow')).toContainText('10月23日');
  await expect(page.getByText(/当前正在补做2026-10-22的任务/)).toBeVisible();
  await expect(page.locator('.rotation-label')).toHaveText('仔细阅读＋选词填空');
  await expect(
    page.locator('[data-task="cet"] .daily-parts').getByRole('button', { name: /仔细阅读/ }),
  ).toContainText('已提交');
  await page
    .locator('[data-task="cet"] .daily-parts')
    .getByRole('button', { name: /选词填空/ })
    .click();
  await page.getByLabel('第 1 空', { exact: true }).selectOption('A');
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await upload(page, '2026-10-23');
  await continuePack(page);
  await expect(page.locator('.rotation-label')).toHaveText('信息匹配＋仔细阅读');
  await expect(
    page.locator('[data-task="cet"] .daily-parts').getByRole('button', { name: /仔细阅读/ }),
  ).toContainText('待练');
  await page.getByLabel('当前题包', { exact: true }).selectOption('history-2026-10-22');
  await expect(
    page.locator('[data-task="cet"] .daily-parts').getByRole('button', { name: /仔细阅读/ }),
  ).toContainText('已提交');
  await upload(page, '2026-10-22');
  await expect(page.getByRole('status').filter({ hasText: '该题包已导入' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await continuePack(page);
  await expect(page.getByLabel('当前题包', { exact: true })).toHaveValue('history-2026-10-22');
  await expect(page.getByLabel('当前题包', { exact: true }).locator('option')).toHaveCount(2);
  await page
    .locator('[data-task="cet"] .daily-parts')
    .getByRole('button', { name: /选词填空/ })
    .click();
  await expect(page.getByLabel('第 1 空', { exact: true })).toHaveValue('A');
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await upload(page, '2026-10-22', true);
  await expect(page.getByRole('alert')).toContainText('内容冲突');
  await expect(page.getByRole('button', { name: '继续学习此题包 →' })).toHaveCount(0);
});

test('无错题记录也能进入拓展练习；不同日期筛选、题目退出与24日三项安排可用', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T02:00:00Z'));
  await page.goto('/');
  for (const day of ['2026-10-22', '2026-10-23', '2026-10-24']) {
    await upload(page, day);
    await continuePack(page);
  }
  await expect(page.locator('.rotation-label')).toHaveText('选词填空＋信息匹配＋段落翻译');
  await page.getByRole('button', { name: '错题本', exact: true }).click();
  await expect(page.getByRole('heading', { name: '拓展练习', exact: true })).toBeVisible();
  await expect(page.getByText('0 篇历史错题', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '打开拓展题型继续练习', exact: true }).click();
  await page.getByLabel('选择拓展题包').selectOption('history-2026-10-22');
  await expect(page.locator('.task-grid article')).toHaveCount(2);
  await expect(page.locator('.task-grid article').first()).toContainText('2026-10-22');
  await page.getByRole('button', { name: '开始练习', exact: true }).first().click();
  await page.getByLabel('第 1 空', { exact: true }).selectOption('A');
  await page.getByRole('button', { name: '保存退出', exact: true }).click();
  await expect(page.getByLabel('选择拓展题包')).toHaveValue('history-2026-10-22');
  await page.getByLabel('选择拓展题包').selectOption('history-2026-10-23');
  await expect(page.locator('.task-grid article').first()).toContainText('2026-10-23');
  await page.getByLabel('选择拓展题包').selectOption('');
  await expect(page.locator('.task-grid article')).toHaveCount(8);
  await page.getByRole('button', { name: '返回错题本', exact: true }).click();
  await expect(page.getByRole('button', { name: '我的', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
