// Read-only access diagnostic: one category navigation, no interaction or persisted browser state.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const report = { at: new Date().toISOString(), browser: browser.version(), result: 'error' };
try {
  const context = await browser.newContext({ locale: 'el-GR' });
  await context.route('**/*', (route) => ['image', 'media', 'font'].includes(route.request().resourceType())
    ? route.abort() : route.continue());
  const page = await context.newPage();
  const response = await page.goto('https://www.skroutz.gr/c/32/cpu-epeksergastes.html', {
    waitUntil: 'domcontentloaded', timeout: 30_000,
  });
  report.status = response?.status();
  report.mitigated = response?.headers()['cf-mitigated'] ?? null;
  // Observe ordinary rendering only. No CAPTCHA interaction or challenge workarounds.
  await page.locator('li.card[data-skuid]').first().waitFor({ timeout: 15_000 }).catch(() => {});
  report.listings = await page.locator('li.card[data-skuid]').count();
  report.result = report.listings > 0 ? 'ok' : 'no_listings';
} catch (error) {
  report.error = error.name;
} finally {
  await browser.close();
  writeFileSync('skroutz-browser.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
process.exitCode = report.result === 'ok' ? 0 : 1;
