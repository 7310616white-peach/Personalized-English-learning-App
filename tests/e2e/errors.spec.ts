import { expect, test } from './fixtures';
test.use({ serviceWorkers: 'block' });
test('旧版懒加载资源失败不谎报数据库错误，重新加载保留已导入题包', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '载入每日六项流程预览（含音频）', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '每日流程预览已载入' })).toBeVisible();
  await page.getByRole('button', { name: '学习台', exact: true }).click();
  await page.route('**/assets/ModelEssays-*.js', (route) => route.abort());
  await page.getByRole('button', { name: '打开范文栏 →', exact: true }).click();
  await expect(page.getByRole('heading', { name: '页面资源已更新', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '暂时无法打开学习库' })).toHaveCount(0);
  await page.unroute('**/assets/ModelEssays-*.js');
  await page.getByRole('button', { name: '重新加载页面', exact: true }).click();
  await expect(page.getByLabel('当前题包')).toHaveValue('daily-preview-20261022');
  await page.getByRole('button', { name: '打开范文栏 →', exact: true }).click();
  await expect(page.locator('.model-essay summary')).toHaveCount(1);
});
