// Headphones & earphones (peripherals). While the category is hidden (registry `visible: false`) only the first test
// runs: the address must not exist. The rest guard the day it is published; they read the built headphones data.
import { expect, test, type Page } from '@playwright/test';
import { PUBLISHED } from './published';

const published = PUBLISHED.includes('headphones');
const rows = '[data-product-key]';
const errors = (page: Page): string[] => {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  return list;
};
const count = async (page: Page) => Number(((await page.locator('main').innerText()).match(/([\d.,]+)\s+(?:products|προϊόντα)/)?.[1] ?? '').replace(/\D/g, ''));
const open = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
};

test('while headphones are hidden, /headphones is the 404 page and no menu links to it', async ({ page }) => {
  test.skip(published, 'headphones are published');
  await page.goto('/headphones');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('a[href="/headphones"]')).toHaveCount(0);
});

test.describe('published headphones', () => {
  test.skip(!published, 'headphones are not published yet');

  test('/headphones lists models with a Compare button on every row, in both languages, without overflow at 360 px', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/headphones?per=20');
    await expect(page.locator(`${rows} [data-compare-ref]`)).toHaveCount(await page.locator(rows).count());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/headphones$/);
    expect(await page.title()).toMatch(/Headphones|Ακουστικά/i);
    await page.setViewportSize({ width: 360, height: 700 });
    await open(page, '/headphones?per=20&lang=el');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('type pills and stated-only filters narrow the list and survive a reload and back', async ({ page }) => {
    await open(page, '/headphones?per=20');
    const all = await count(page);
    await open(page, '/headphones?type=over-ear&per=20');
    const over = await count(page);
    await open(page, '/headphones?type=in-ear-earbuds&per=20');
    const inEar = await count(page);
    expect(over).toBeLessThan(all);
    expect(inEar).toBeLessThan(all);
    // A spec filter keeps only the models that state the value: fewer than all, and fewer still with a second filter.
    await open(page, '/headphones?anc=yes&per=20');
    const anc = await count(page);
    expect(anc).toBeLessThan(all);
    await open(page, '/headphones?anc=yes&connection=wireless&type=over-ear&per=20');
    const narrowed = await count(page);
    expect(narrowed).toBeLessThan(anc);
    await page.reload();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(narrowed);
    await page.goBack();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(anc);
  });

  test('a model page shows its specs, its offers and no PC-builder block', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/headphones?per=20');
    await page.locator(`${rows} a[data-product-link]`).first().click();
    await expect(page).toHaveURL(/\/headphones\/[^/?]+/);
    await expect(page.locator('main h1:visible').first()).toBeVisible();
    await expect(page.locator('[data-offer]').first()).toBeVisible();
    await expect(page.locator('[data-fit], [data-build-fit]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/headphones\/[^/?]+$/);
    expect(errs).toEqual([]);
  });

  test('global search finds a headphone model, and the PC Builder never offers headphones', async ({ page }) => {
    await page.goto('/search?q=airpods');
    await expect(page.locator('a[href^="/headphones/"]').first()).toBeVisible({ timeout: 20_000 });
    await page.goto('/builder');
    await expect(page.locator('a[href^="/headphones"]')).toHaveCount(0);
  });
});
