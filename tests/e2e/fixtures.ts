import { test as base, expect } from '@playwright/test';
/** A stable local calendar makes scheduled daily tasks reproducible in CI and on the Mac. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date('2026-10-22T02:00:00Z'));
    await use(page);
  },
});
export { expect };
