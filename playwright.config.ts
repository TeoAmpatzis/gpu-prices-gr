// Browser tests (Playwright, Chromium only) against the local production preview: `npm run e2e`
// builds the site and serves dist on port 4174 (4173 stays free for `npm run preview:local`).
// E2E_BASE_URL=http://localhost:4173 runs them against a preview that is already running instead.
import { defineConfig, devices } from '@playwright/test';

const external = process.env.E2E_BASE_URL;
const PORT = 4174;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
