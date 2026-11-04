import { expect, test, type Page } from '@playwright/test';

async function automatic(page: Page) {
  await page.goto('/builder');
  await page.getByRole('button', { name: /^Gaming/ }).click();
  await page.getByRole('button', { name: '€1,500', exact: true }).click();
  const take = page.getByRole('button', { name: 'Build it for me', exact: true });
  await expect(take).toBeEnabled({ timeout: 30_000 });
  await take.click();
  await expect(page.locator('[data-line=cpu] [data-price]')).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('lang', 'en'); });
});

for (const width of [360, 959, 960, 961, 1440]) {
  test(`builder presentation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/builder?mode=quick');
    const summary = page.locator('[data-builder-summary]');
    await expect(summary).toBeVisible();
    await expect.poll(() => summary.evaluate((el) => getComputedStyle(el).position)).toBe(width <= 960 ? 'fixed' : 'sticky');
    await expect(page.locator('[data-line=cpu]')).toContainText('Not selected');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 960) {
      const reserve = await page.locator('.builder-workbench').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
      expect(reserve).toBeGreaterThanOrEqual((await summary.boundingBox())!.height);
    }
  });
}

test('invalid link explains URL recovery without expiry claims', async ({ page }) => {
  await page.goto('/builder?v=2&o.cpu=broken');
  await expect(page.locator('[data-shared-recovery]')).toContainText('incomplete');
  await expect(page.locator('[data-shared-recovery]')).not.toContainText(/expir|12 months/i);
  await page.getByRole('button', { name: 'Use my current list', exact: true }).click();
  await expect(page.locator('[data-line=cpu]')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('v')).toBe(false);
});

test('share dialog preserves encoded URL and returns keyboard focus', async ({ page }) => {
  await page.goto('/builder?mode=quick&v=2&cpu=missing&n.cpu=Old%20CPU');
  const trigger = page.locator('[data-share-open]').first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share this build' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Build link')).toHaveValue(/cpu=missing/);
  await expect(dialog).toContainText('encoded in the link');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('filled list, remove, undo and confirmed new list preserve the actual build', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await automatic(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await page.evaluate(() => localStorage.getItem('pcBuild'));
  await page.locator('[data-line=cpu]').getByRole('button', { name: /^Remove / }).click();
  await expect(page.locator('[data-line=cpu]')).toContainText('Not selected');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-line=cpu] [data-price]')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('pcBuild'))).toBe(before);
  await page.getByRole('button', { name: 'New list', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Start a new list?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'New list', exact: true }).click();
  await expect(page.locator('[data-line=cpu]')).toContainText('Not selected');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-line=cpu] [data-price]')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('pcBuild'))).toBe(before);
});

test('saved list says browser local, closes with Escape and restores focus', async ({ page }) => {
  await page.goto('/builder?mode=quick');
  const trigger = page.locator('[data-saved-builds]');
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('This device only');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
