// Audit 2026-11-10, P2-004: after a page's code fails to load, leaving that page must show the next page.
import { expect, test } from '@playwright/test';

test('a failed page chunk shows the error; Back and header links leave it without a reload', async ({ page }) => {
  await page.goto('/gpu');
  const link = page.locator('[data-product-key] a[data-product-link]').first();
  await expect(link).toBeVisible({ timeout: 20_000 });
  await page.route('**/assets/ModelPage-*.js', (route) => route.abort());
  await link.click();
  const retry = page.getByRole('button', { name: /Δοκιμή ξανά|Try again/ });
  await expect(retry).toBeVisible({ timeout: 20_000 });
  await page.locator('header a[href="/builder"]').first().click();
  await expect(retry).toBeHidden();
  await page.goBack();
  await expect(retry).toBeVisible();
  await page.unroute('**/assets/ModelPage-*.js');
  await page.goBack();
  await expect(retry).toBeHidden();
  await expect(page.locator('[data-product-key]').first()).toBeVisible({ timeout: 20_000 });
});
