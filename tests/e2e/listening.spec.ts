import { expect, test } from './fixtures';
import { readFile } from 'node:fs/promises';
import { library, daily, wavBytes } from '../helpers/listeningFixtures';
const json = (name: string, data: unknown) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(data)),
});

test('听力：导入、播放倍速、离线草稿、答案隐藏、待批改、错因、完整 ZIP 恢复', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByText('导入 / 补绑听力材料', { exact: true }).click();
  await page.getByLabel('听力材料清单 JSON').setInputFiles(json('library.json', library));
  await page
    .getByLabel('听力 WAV 文件')
    .setInputFiles({ name: 'test.wav', mimeType: 'audio/wav', buffer: Buffer.from(wavBytes()) });
  await page.getByRole('button', { name: '确认保存清单与选中音频' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 段已绑定' })).toBeVisible();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByLabel('选择题包 JSON').setInputFiles(json('daily.json', daily));
  await expect(page.getByRole('status')).toContainText('已导入');
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByRole('button', { name: '开始本组听力' }).click();
  await expect(page.getByRole('button', { name: '提交整组答案' })).toBeEnabled();
  await expect(page.getByText('Synthetic answer explanation.', { exact: true })).toHaveCount(0);
  await expect(page.getByText(library.tracks[0].transcript.text!, { exact: true })).toHaveCount(0);
  await page.getByLabel('听力播放速度').selectOption('0.85');
  expect(await page.locator('audio').evaluate((el: HTMLAudioElement) => el.playbackRate)).toBe(
    0.85,
  );
  await page.getByLabel('循环播放', { exact: true }).check();
  await page.getByRole('button', { name: '从头重播' }).click();
  await page.getByRole('radio', { name: 'A First', exact: true }).first().check();
  await page.getByRole('radio', { name: 'B Second', exact: true }).last().check();
  await page.getByRole('textbox', { name: '题 3 第 1 空' }).fill('onlin');
  await expect(page.getByRole('status')).toContainText('听力草稿已保存');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '听力训练', exact: true }).click();
  await page.getByRole('button', { name: '开始本组听力' }).click();
  await expect(page.getByRole('textbox', { name: '题 3 第 1 空' })).toHaveValue('onlin');
  await expect(page.getByLabel('听力播放速度')).toHaveValue('0.85');
  await expect(page.getByRole('button', { name: '提交整组答案' })).toBeEnabled();
  await page.getByRole('button', { name: '提交整组答案' }).click();
  await expect(page.getByRole('heading', { name: '本组结果：50%' })).toBeVisible();
  await expect(page.getByText('Synthetic answer explanation.', { exact: true })).toBeVisible();
  await expect(page.getByText(library.tracks[0].transcript.text!, { exact: true })).toBeVisible();
  await expect(
    page.getByText('尚无答案，记录已保存，可导出给 ChatGPT 辅助批改。', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('拼写', { exact: true }).check();
  await page.getByLabel('补充说明', { exact: true }).fill('漏写末尾 e');
  await page.getByRole('button', { name: '保存错误原因' }).click();
  await expect(page.getByText('错误原因已保存', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'outputs/听力训练-提交结果.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '返回听力训练', exact: true }).click();
  await page.getByRole('button', { name: '历史错题', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始本组听力' })).toBeVisible();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  const outputPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出为 JSON', exact: true }).click();
  const output = await outputPromise;
  const result = JSON.parse(await readFile((await output.path())!, 'utf-8'));
  expect(result.listeningAttempts).toHaveLength(1);
  expect(result.listeningAttempts[0].annotations[0].note).toBe('漏写末尾 e');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click();
  const zip = await download;
  expect(zip.suggestedFilename()).toMatch(/\.zip$/);
  const freshContext = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const fresh = await freshContext.newPage();
  await fresh.goto('/');
  await fresh.getByRole('button', { name: '我的', exact: true }).click();
  await fresh.getByLabel('选择备份文件', { exact: true }).setInputFiles({
    name: 'backup.zip',
    mimeType: 'application/zip',
    buffer: await readFile((await zip.path())!),
  });
  await fresh.getByRole('button', { name: '确认替换并恢复' }).click();
  await expect(fresh.getByRole('status')).toContainText('恢复完成');
  await fresh.getByRole('button', { name: '听力训练', exact: true }).click();
  await fresh.getByRole('button', { name: '开始本组听力' }).click();
  await expect(fresh.getByRole('button', { name: '提交整组答案' })).toBeEnabled();
  await expect(fresh.getByText('Synthetic answer explanation.', { exact: true })).toHaveCount(0);
  await fresh.evaluate(() => window.scrollTo(0, 0));
  await fresh.screenshot({
    path: 'outputs/听力训练-答题页面.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await fresh.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await freshContext.close();
});
