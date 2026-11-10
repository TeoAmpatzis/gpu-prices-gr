import { expect, test } from '@playwright/test';
import { PUBLISHED } from './published';

const products = '[data-product-key]';
test('listing links select the exact source product; refresh and Back retain query/page/scroll', async ({ page }) => {
  await page.goto('/gpu?sort=price-asc&page=2&per=20&max=1200');
  const names = page.locator(`${products} a[data-product-link]`);
  await expect(names.first()).toBeVisible({ timeout: 20_000 });
  const href = await names.nth(8).getAttribute('href');
  expect(href).toMatch(/\?source=.+&offer=.+/);
  const listing = await names.nth(8).innerText();
  await page.reload();
  await expect(page.locator(`${products} a[data-product-link]`).nth(8)).toHaveAttribute('href', href!);
  await names.nth(8).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await names.nth(8).click();
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await expect(page.locator('main h1:visible').first()).toHaveText(listing);
  await page.goBack();
  await expect(page).toHaveURL(/\/gpu\?sort=price-asc&page=2&per=20&max=1200/);
  await expect(names.first()).toBeVisible();
  await expect.poll(() => page.evaluate((saved) => Math.abs(scrollY - saved), before)).toBeLessThan(60);
});

test('mobile filters isolate drafts, trap focus, cancel on Escape, and apply one URL write', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/gpu');
  await expect(page.locator(products).first()).toBeVisible({ timeout: 20_000 });
  const opener = page.locator('.catalogue-filter-button');
  const original = page.url();
  await opener.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ }).fill('300');
  expect(page.url()).toBe(original);
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(page.url()).toBe(original);
  await opener.click();
  await expect(dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ })).toHaveValue('');
  await page.evaluate(() => {
    const original = history.replaceState.bind(history);
    (window as unknown as { writes: number }).writes = 0;
    history.replaceState = (...args) => {
      (window as unknown as { writes: number }).writes++;
      original(...args);
    };
  });
  await dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ }).fill('300');
  await dialog.getByRole('button', { name: /^(Εμφάνιση|Show) \d+ / }).click();
  await expect(page).toHaveURL(/max=300/);
  expect(await page.evaluate(() => (window as unknown as { writes: number }).writes)).toBe(1);
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator(products).first()).toBeVisible();
  await opener.click();
  await expect(dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ })).toHaveValue('300');
  const reset = dialog.getByRole('button', { name: /^(Καθαρισμός φίλτρων|Clear filters)$/ });
  await reset.click();
  await expect(dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ })).toHaveValue('');
  await expect(page).toHaveURL(/max=300/);
  await dialog.getByRole('button', { name: /^(Ακύρωση|Cancel)$/ }).click();
  await expect(page).toHaveURL(/max=300/);
  await opener.click();
  await expect(dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ })).toHaveValue('300');
  await reset.click();
  await expect(dialog.getByRole('spinbutton', { name: /Μέγιστη τιμή|Maximum price/ })).toHaveValue('');
  await dialog.getByRole('button', { name: /^(Εμφάνιση|Show) \d+ / }).click();
  await expect(page).not.toHaveURL(/max=300/);
});

test('no-build pick mode adds the exact individual product with a qualified pin', async ({ page }) => {
  await page.goto('/about');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lang', 'en');
  });
  await page.goto('/gpu?pick=1');
  const product = page
    .locator(products)
    .filter({ has: page.getByRole('button', { name: /^Add/ }) })
    .first();
  await expect(product).toBeVisible({ timeout: 20_000 });
  await expect(product.getByRole('button', { name: /^Add/ })).toBeEnabled({ timeout: 20_000 });
  const key = await product.getAttribute('data-product-key');
  await product.getByRole('button', { name: /^Add/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').offers?.gpu)).toBe(key);
  await page.goto('/case?pick=1');
  await expect(page.locator('[data-pick="bar"] [role="status"]')).toContainText('Checked against your build', { timeout: 20_000 });
  await expect(page.locator(products).first()).toBeVisible();
  await expect(page.getByRole('switch', { name: /^Only compatible/ })).toBeChecked();
});

test('honest empty results and a failed data request can be retried', async ({ page }) => {
  await page.goto('/gpu?q=zzqqxx-no-such-product');
  await expect(page.locator('.catalogue-empty')).toBeVisible({
    timeout: 20_000,
  });
  await page.locator('.catalogue-empty button').click();
  await expect(page.locator(products).first()).toBeVisible();
  await page.route('**/data/cpu/list.v2.json*', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/cpu');
  const retry = page.getByRole('button', { name: /Δοκιμή ξανά|Try again/ });
  await expect(retry).toBeVisible();
  await page.unroute('**/data/cpu/list.v2.json*');
  await retry.click();
  await expect(page.locator(products).first()).toBeVisible({ timeout: 20_000 });
});

for (const width of [360, 390, 820, 951, 1023, 1024, 1440, 1920]) {
  test(`catalogue fits ${width}px and switches cards at 1024px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/gpu?per=20');
    await expect(page.locator(products).first()).toBeVisible({
      timeout: 20_000,
    });
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath(`catalogue-${width}-en.png`),
        fullPage: false,
      });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 1024) {
      await expect(page.locator('.catalogue-cards')).toBeVisible();
      const columns = await page.locator('.catalogue-cards').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width < 640 ? 1 : 2);
    } else {
      await expect(page.locator('.catalogue-table')).toBeVisible();
      await page.getByRole('button', { name: /^(Κάρτες|Cards)$/ }).click();
      await expect(page.locator('.catalogue-cards')).toBeVisible();
      await page.getByRole('button', { name: /^(Πίνακας|Table)$/ }).click();
      await expect(page.locator('.catalogue-table')).toBeVisible();
    }
  });
}

for (const lang of ['el', 'en']) {
  test(`every published category exposes listing specifications in ${lang}`, async ({ page }, testInfo) => {
    await page.addInitScript((lang) => localStorage.setItem('lang', lang), lang);
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const cat of PUBLISHED) {
      await page.goto(`/${cat}?per=20`);
      await expect(page.locator(products).first()).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.catalogue-table thead th').first()).toHaveText(lang === 'el' ? 'Μοντέλο' : 'Model');
      expect(await page.locator(`${products} a[data-product-link]`).first().getAttribute('href')).toMatch(/source=.+&offer=.+/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${cat}-1440-${lang}.png`), fullPage: false, animations: 'disabled' });
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/gpu?per=20');
    await expect(page.locator(products).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`gpu-390-${lang}.png`), animations: 'disabled' });
    await page.locator('.catalogue-filter-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`filters-390-${lang}.png`), animations: 'disabled' });
  });
}
