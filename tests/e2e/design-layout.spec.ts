/* global document, window, getComputedStyle */
import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem('lang', 'el')));

test('shared shell aligns header, main and footer at the reference widths', async ({ page }) => {
  for (const [width, left] of [[360, 16], [390, 16], [820, 24], [951, 24], [959, 24], [960, 24], [961, 24], [1023, 24], [1024, 24], [1366, 67], [1440, 104], [1920, 204], [2560, 384], [3840, 1024]] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/contact');
    await page.locator('main h1').waitFor();
    const positions = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const header = document.querySelector('header a[aria-label]')!;
      const footer = document.querySelector('footer > div')!;
      const contentLeft = (el: Element) => el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
      return { header: header.getBoundingClientRect().left, main: contentLeft(main), footer: contentLeft(footer), overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(positions, `${width}px shell`).toEqual({ header: left, main: left, footer: left, overflow: false });
  }
});

test('short pages keep the footer at the viewport bottom without an extra screen of whitespace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/contact');
  await page.locator('main h1').waitFor();
  const footer = await page.locator('footer').boundingBox();
  expect(footer!.y + footer!.height).toBeCloseTo(1000, 0);
});

test('loading a data page reserves space so the footer cannot shift inside the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let release = () => {};
  const stalled = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/data/case/list.v2.json*', async route => { await stalled; await route.continue(); });
  try {
    const request = page.waitForRequest('**/data/case/list.v2.json*');
    await page.goto('/case');
    await request;
    const footer = await page.locator('footer').boundingBox();
    expect(footer!.y).toBeGreaterThanOrEqual(900);
  } finally {
    release();
  }
});

test('360px Greek shell keeps compact controls and complete category labels', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/parts');
  await page.locator('main h1').waitFor();
  await expect(page.locator('header')).toHaveCSS('height', '57px');
  await expect(page.locator('header a[href="/builder"]')).toBeHidden();
  const labels = await page.locator('main a[href="/gpu"] span.font-semibold').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, clipped: node.scrollWidth > node.clientWidth })));
  expect(labels).toEqual([{ text: 'Κάρτες γραφικών', clipped: false }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mobile search closes with Escape and returns keyboard focus to its opener', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Αναζήτηση', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Αναζήτηση', exact: true });
  await expect(dialog.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('mobile search traps focus and keeps Greek suggestions inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Αναζήτηση', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Αναζήτηση', exact: true });
  await dialog.getByRole('combobox').fill('rtx 50');
  await expect(dialog.getByRole('option').first()).toBeVisible();
  const last = dialog.getByRole('button', { name: 'Καθαρισμός αναζήτησης', exact: true });
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Πίσω', exact: true })).toBeFocused();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});
