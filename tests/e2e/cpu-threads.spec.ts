import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
});

test('the CPU list shows cores / threads and the product page shows Threads', async ({ page }) => {
  await page.goto('/cpu');
  const rows = page.locator('[data-product-key]');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  const texts = await rows.evaluateAll((els) => els.slice(0, 20).map((e) => e.textContent ?? ''));
  expect(texts.filter((t) => /\b\d+ \/ \d+\b/.test(t)).length).toBeGreaterThanOrEqual(15);
  await rows.first().locator('a[data-product-link]').click();
  await expect(page.locator('[data-spec-group="general"]')).toContainText('Threads', { timeout: 20_000 });
  await expect(page.locator('[data-product-header]')).toContainText('Threads');
});
