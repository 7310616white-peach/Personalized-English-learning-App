import { expect, type Page } from '@playwright/test';

export async function startSpelling(page: Page) {
  await page.getByRole('button', { name: '开始学习 →', exact: true }).click();
  const start = page.getByRole('button', { name: '开始拼写 →', exact: true });
  const next = page.getByRole('button', { name: /^(看过了，下一个词|学完了，准备拼写)/ });
  await start.or(next).waitFor();
  for (let i = 0; i < 12 && !(await start.isVisible()); i++) {
    const before = await page.getByRole('progressbar').getAttribute('value');
    await next.click();
    await expect
      .poll(() =>
        page.locator('progress').evaluateAll((es) => es[0]?.getAttribute('value') ?? 'ready'),
      )
      .not.toBe(before);
  }
  await start.click();
  await expect(page.getByLabel('你的拼写')).toBeEnabled();
}
