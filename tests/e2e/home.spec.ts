import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { PUBLISHED } from './published';

test('homepage loads one bounded feed without catalogues, histories or builder data', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await page.goto('/');
  await expect(page.locator('[data-home-category]')).toHaveCount(PUBLISHED.length);
  await expect(page.locator('[data-home-build]')).toHaveCount(4);
  const response = await page.request.get('/data/home.json');
  expect(gzipSync(await response.body()).length).toBeLessThanOrEqual(20 * 1024);
  expect(requested.filter((path) => /list\.v2|\/model\/|\/builder\/|history\.json|pickCheck/.test(path))).toEqual([]);
  await expect(page.locator('#home-drops').locator('..')).toContainText(/30/);
});

test('stale generated discount claims disappear and failed feed can retry', async ({ page }) => {
  let failed = true;
  const feed = { builtAt: '2026-01-01T00:00:00Z', categories: [], builds: [], deals: [{ href: '/gpu/family', name: 'Expired discount', source: 'skroutz', date: '2026-01-01', checkedAt: '2026-01-01T12:00:00Z', price: 80, median: 100, percent: 20 }] };
  await page.route('**/data/home.json', (route) => route.fulfill(failed ? { status: 503, body: '{}' } : { json: feed }));
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Homepage data could not be loaded');
  failed = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.home-empty-drops')).toBeVisible();
  await expect(page.getByText('Expired discount')).toHaveCount(0);
});

test('mobile delayed feed reserves settled section geometry', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/data/home.json', async (route) => { await held; await route.fallback(); });
  await page.goto('/');
  const before = (await page.locator('.home-method').boundingBox())!.y;
  release();
  await expect(page.locator('[data-home-build]')).toHaveCount(4);
  const after = (await page.locator('.home-method').boundingBox())!.y;
  expect(Math.abs(after - before)).toBeLessThan(100);
});

test('opening ready preview preserves named and unsaved current lists, including a previously visited builder', async ({ page }) => {
  await page.goto('/about');
  const original = { cpu: 'Ryzen 5 7600|true', budget: 1200 };
  const saved = { v: 1, active: 'mine', builds: { mine: { name: 'My PC', savedAt: '2026-11-01T12:00:00Z', build: { parts: { cpu: { key: original.cpu } }, budget: 1200 } } } };
  await page.evaluate(({ original, saved }) => {
    localStorage.setItem('lang', 'en'); localStorage.setItem('pcBuild', JSON.stringify(original)); localStorage.setItem('pcBuilds', JSON.stringify(saved));
  }, { original, saved });
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=cpu]')).toContainText('7600');
  await page.getByRole('link', { name: /BuildDraft.gr, home page/ }).click();
  await expect(page.locator('[data-home-build]')).toHaveCount(4);
  const link = page.locator('[data-home-build] a[href*="v=2"]').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/builder\?v=2/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild')!))).toEqual(original);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuilds')!))).toEqual(saved);
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('pcBuilds'));
  await expect(page.locator('[data-home-build] a[href*="v=2"]').first()).toBeVisible();
  await page.locator('[data-home-build] a[href*="v=2"]').first().click();
  await expect(page).toHaveURL(/\/builder\?v=2/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild')!))).toEqual(original);
});

for (const lang of ['el', 'en']) for (const width of [360, 820, 1440]) test(`homepage ${lang} ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript((value) => localStorage.setItem('lang', value), lang);
  await page.goto('/');
  await expect(page.locator('[data-home-build]')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.home-hero-copy h1')).toBeVisible();
  mkdirSync('test-results/design-audit/home', { recursive: true });
  await page.screenshot({ path: `test-results/design-audit/home/${lang}-${width}.png`, fullPage: true });
});
