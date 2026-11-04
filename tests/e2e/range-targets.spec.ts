import { expect, test, type Locator } from '@playwright/test';

async function expectLargeTargets(sliders: Locator) {
  const count = await sliders.count();
  expect(count).toBeGreaterThan(0);
  for (const slider of await sliders.all()) {
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-label', /.+ slider$/);
    const target = await slider.evaluate((el) => {
      const thumb = getComputedStyle(el, '::-webkit-slider-thumb');
      return {
        height: el.getBoundingClientRect().height,
        thumbWidth: parseFloat(thumb.width),
        thumbHeight: parseFloat(thumb.height),
      };
    });
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(target.thumbWidth).toBeGreaterThanOrEqual(44);
    expect(target.thumbHeight).toBeGreaterThanOrEqual(44);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
});

test('desktop range targets support pointer, keyboard, and synchronized price values', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/case');
  await expect(page.locator('[data-product-key]').first()).toBeVisible({ timeout: 20_000 });
  const sidebar = page.locator('.catalogue-sidebar');
  await expectLargeTargets(sidebar.getByRole('slider'));
  const minimum = sidebar.getByRole('slider', { name: 'Price From slider', exact: true });
  const maximum = sidebar.getByRole('slider', { name: 'Maximum price slider', exact: true });
  const minimumNumber = sidebar.getByRole('spinbutton', { name: 'Price From', exact: true });
  const maximumNumber = sidebar.getByRole('spinbutton', { name: 'Maximum price', exact: true });
  const initialMin = Number(await minimum.inputValue());
  await minimum.focus();
  await minimum.press('ArrowRight');
  const changedMin = await minimum.inputValue();
  expect(Number(changedMin)).toBeGreaterThan(initialMin);
  await expect(minimumNumber).toHaveValue(changedMin);
  await expect.poll(() => new URL(page.url()).searchParams.get('min')).toBe(changedMin);
  await maximum.focus();
  await maximum.press('ArrowLeft');
  const changedMax = await maximum.inputValue();
  await expect(maximumNumber).toHaveValue(changedMax);
  await expect.poll(() => new URL(page.url()).searchParams.get('max')).toBe(changedMax);
  await minimum.press('End');
  await expect(minimum).toHaveValue(changedMax);
  await expect(minimumNumber).toHaveValue(changedMax);

  // The outer transparent part of the thumb must accept a drag, too.
  await page.goto('/case');
  await expect(minimum).toBeVisible();
  await minimum.scrollIntoViewIfNeeded();
  const box = (await minimum.boundingBox())!;
  const beforeDrag = Number(await minimum.inputValue());
  await page.mouse.move(box.x + 22, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 72, box.y + 40, { steps: 8 });
  await page.mouse.up();
  expect(Number(await minimum.inputValue())).toBeGreaterThan(beforeDrag);
  await expect(minimumNumber).toHaveValue(await minimum.inputValue());
});

test('mobile filter ranges retain large targets without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/case');
  await expect(page.locator('[data-product-key]').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('.catalogue-filter-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectLargeTargets(dialog.getByRole('slider'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const slider of await dialog.getByRole('slider').all()) {
    const box = (await slider.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  }
});
