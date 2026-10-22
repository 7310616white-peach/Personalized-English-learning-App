import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/release',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    timezoneId: 'Asia/Shanghai',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'release-mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'VITE_ENABLE_DEMOS=false pnpm build && pnpm preview --port 4176',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
  },
});
