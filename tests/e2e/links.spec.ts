// Links into the product page and keyboard reach (step 4, task 10): the model name in a list row is a link to
// /<cat>/<slug> (Enter opens it, Back returns to the list with its filters and scroll), the chevron button keeps
// the quick offers view, a search result opens the model's page, and the filter panel's skip link puts the
// focus on the first product.
import { expect, test, type Page } from '@playwright/test';

const names = (page: Page) => page.locator('main tbody tr a[data-product-link]:visible');

test('Enter on a row name opens the product page', async ({ page }) => {
  await page.goto('/gpu');
  await expect(names(page).first()).toBeVisible({ timeout: 20_000 });
  const first = names(page).first();
  const name = (await first.innerText()).trim();
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/gpu\/[a-z0-9-]+\?source=.+&offer=.+$/);
  await expect(page.locator('main h1:visible').first()).toContainText(name.split(' ')[0]);
});

test('Back returns to the list with its filters, page and scroll', async ({ page }) => {
  await page.goto('/case?sort=price-asc&per=20');
  await expect(names(page).first()).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(300);
  const row = names(page).nth(8);
  await row.click();
  await expect(page).toHaveURL(/\/case\/[a-z0-9-]+\?source=.+&offer=.+$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/case\?sort=price-asc&per=20$/);
  await expect(names(page).first()).toBeVisible();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThan(60);
});

test('the catalogue has individual products with no family expansion control', async ({ page }) => {
  await page.goto('/gpu');
  await expect(names(page).first()).toBeVisible({ timeout: 20_000 });
  await expect(names(page).first()).toHaveAttribute('href', /\?source=.+&offer=.+/);
  await expect(page.locator('main tbody button[aria-expanded]')).toHaveCount(0);
});

test('a global search result opens the model page', async ({ page }) => {
  await page.goto('/');
  await page.locator('main h1').waitFor();
  const box = page.locator('header input[role=combobox]:visible');
  await box.focus();
  await page.keyboard.type('rtx 5070');
  const option = page
    .locator('header [role=listbox] [role=option]')
    .filter({ hasText: /RTX 5070/ })
    .first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  await expect(option).toContainText(/€/); // the exact price stays in the suggestion
  await option.click();
  await expect(page).toHaveURL(/\/gpu\/rtx-5070[a-z0-9-]*$/);
  await expect(page.locator('main h1:visible').first()).toContainText('5070');
});

test('skip link: first product within 5 key presses after it', async ({ page }) => {
  await page.goto('/gpu');
  await expect(names(page).first()).toBeVisible({ timeout: 20_000 });
  const skip = page.locator('main aside button', {
    hasText: /Μετάβαση στα αποτελέσματα|Skip to results/,
  });
  let tabs = 0;
  while (!(await skip.evaluate((el) => el === document.activeElement)) && tabs < 15) {
    await page.keyboard.press('Tab');
    tabs++;
  }
  await expect(skip).toBeFocused();
  expect(tabs).toBeLessThanOrEqual(12);
  await expect(skip).toBeVisible(); // drawn while focused
  await page.keyboard.press('Enter');
  let after = 1;
  while (
    !(await names(page)
      .first()
      .evaluate((el) => el === document.activeElement)) &&
    after < 6
  ) {
    await page.keyboard.press('Tab');
    after++;
  }
  await expect(names(page).first()).toBeFocused();
  expect(after).toBeLessThanOrEqual(5);
});
