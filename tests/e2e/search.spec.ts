import { expect, test } from '@playwright/test';
import { PUBLISHED } from './published';

test('keyboard submissions move focus to updated search heading', async ({ page }) => {
  await page.goto('/search?q=rtx');
  const heading = page.locator('main h1');
  const query = page.locator('main input[name=q]');
  await query.fill('ryzen');
  await query.press('Enter');
  await expect(heading).toContainText('ryzen');
  await expect(heading).toBeFocused();
  await page.locator('input[name=min]').fill('100');
  await page.locator('input[name=min]').press('Enter');
  await expect(page).toHaveURL(/min=100/);
  await expect(heading).toBeFocused();
});

for (const width of [360, 1440]) {
  test(`404 offers working recovery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/unknown-page');
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main nav a')).toHaveCount(PUBLISHED.length);
    await expect(page.locator('main a[href="/builder"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/task6-fixes/${width}-404.png`, fullPage: true });
    const search = page.locator('main input[role=combobox]');
    await search.fill('rtx');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=rtx$/);
    await expect(page.locator('.search-results > li').first()).toBeVisible();
  });
}

test('search is complete, filtered, bookmarkable and restores history', async ({ page }) => {
  await page.goto('/search?q=rtx&cat=gpu&sort=price-asc');
  const results = page.locator('.search-results > li');
  await expect(results.first()).toBeVisible();
  await expect(page.locator('.search-results')).toContainText(/Οικογένεια μοντέλων|Model family/);
  await page.locator('.search-toolbar select').selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);
  await page.goBack();
  await expect(page.locator('.search-toolbar select')).toHaveValue('price-asc');
  await page.goForward();
  await expect(page.locator('.search-toolbar select')).toHaveValue('price-desc');
  await page.reload();
  await expect(results.first()).toBeVisible();
  await expect(page.locator('.search-filters select')).toHaveValue('gpu');
  await page.locator('input[name=min]').fill('999999');
  await page.locator('.search-filters button').click();
  await expect(page.locator('main')).toContainText(/Δεν βρέθηκαν αποτελέσματα|No results found/);
});

test('header Enter searches every category; empty and failure states recover', async ({ page }) => {
  await page.goto('/search');
  await expect(page.locator('main')).toContainText(/Γράψε ένα μοντέλο|Enter a model/);
  const box = page.locator('header input[role=combobox]:visible');
  await box.fill('rtx');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=rtx$/);
  await expect(page.locator('.search-results > li').first()).toBeVisible();
  await page.route('**/data/search.json*', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.reload();
  await expect(page.locator('main [role=alert]')).toBeVisible();
  await page.unroute('**/data/search.json*');
  await page.locator('main [role=alert] button').click();
  await expect(page.locator('.search-results > li').first()).toBeVisible();
});

for (const width of [360, 768, 1440]) {
  test(`search and info pages fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/search?q=rtx', '/contact', '/privacy', '/about', '/how-prices', '/parts']) {
      await page.goto(route);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (route.startsWith('/search')) await expect(page.locator('.search-results > li').first()).toBeVisible();
      else if (route !== '/parts') await expect(page.locator('main article h2').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route === '/contact') { await expect(page.locator('main a[href="mailto:builddraftgr@gmail.com"]').first()).toBeVisible(); await expect(page.locator('main form')).toHaveCount(0); }
      if (width === 360 || width === 1440) await page.screenshot({ path: `test-results/task6/${width}-${route.split('?')[0].slice(1)}.png`, fullPage: true });
    }
  });
}

test('Greek search and information remain readable at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lang', 'el'));
  for (const route of ['/search?q=rtx', '/contact', '/privacy', '/about', '/how-prices', '/parts']) {
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    if (route.startsWith('/search')) await expect(page.locator('.search-results > li').first()).toBeVisible();
    else if (route !== '/parts') await expect(page.locator('main article h2').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/task6/el-360-${route.split('?')[0].slice(1)}.png`, fullPage: true });
  }
});
