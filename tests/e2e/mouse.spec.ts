// Mice (peripherals). While the category is hidden (registry `visible: false`) only the first test runs: the
// address must not exist. The rest start guarding the day mice are published; they read the built mouse data.
import { expect, test, type Page } from '@playwright/test';
import { PUBLISHED } from './published';

const published = PUBLISHED.includes('mouse');
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

test('while mice are hidden, /mouse is the 404 page and no menu links to it', async ({ page }) => {
  test.skip(published, 'mice are published');
  await page.goto('/mouse');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('a[href="/mouse"]')).toHaveCount(0);
});

test.describe('published mice', () => {
  test.skip(!published, 'mice are not published yet');

  test('/mouse lists mice with a Compare button on every row, in both languages, without overflow at 360 px', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/mouse?per=20');
    await expect(page.locator(`${rows} [data-compare-ref]`)).toHaveCount(await page.locator(rows).count());
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/mouse$/);
    expect(await page.title()).toMatch(/Mice|Ποντίκια/i);
    await page.setViewportSize({ width: 360, height: 700 });
    await open(page, '/mouse?per=20&lang=el');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('connection pills and stated-only filters narrow the list and survive a reload and back', async ({ page }) => {
    await open(page, '/mouse?per=20');
    const all = await count(page);
    await open(page, '/mouse?connection=wireless&per=20');
    const wireless = await count(page);
    await open(page, '/mouse?connection=wired&per=20');
    const wired = await count(page);
    expect(wireless).toBeLessThan(all);
    expect(wired).toBeLessThan(all);
    // A spec filter keeps only the mice that state the value: fewer than all, and fewer still with a second filter.
    await open(page, '/mouse?bluetooth=yes&per=20');
    const bluetooth = await count(page);
    expect(bluetooth).toBeLessThan(all);
    await open(page, '/mouse?bluetooth=yes&connection=wireless&brand=logitech&per=20');
    const narrowed = await count(page);
    expect(narrowed).toBeLessThan(bluetooth);
    await page.reload();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(narrowed);
    await page.goBack();
    await expect(page.locator(rows).first()).toBeVisible({ timeout: 20_000 });
    expect(await count(page)).toBe(bluetooth);
  });

  test('a mouse page shows its specs, its offers and no PC-builder block', async ({ page }) => {
    const errs = errors(page);
    await open(page, '/mouse?per=20');
    await page.locator(`${rows} a[data-product-link]`).first().click();
    await expect(page).toHaveURL(/\/mouse\/[^/?]+/);
    await expect(page.locator('main h1:visible').first()).toBeVisible();
    await expect(page.locator('[data-offer]').first()).toBeVisible();
    await expect(page.locator('[data-fit], [data-build-fit]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/mouse\/[^/?]+$/);
    expect(errs).toEqual([]);
  });

  test('a colour narrows the offers of the same model and address; the keyboard works it', async ({ page }) => {
    // A model with offers in several colours: the colour filter's rows lead to one.
    await open(page, '/mouse?colour=white&connection=wireless&sort=offers&per=50');
    const links = await page.locator(`${rows} a[data-product-link]`).evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname));
    let found = false;
    for (const path of [...new Set(links)].slice(0, 15)) {
      await page.goto(path);
      await expect(page.locator('[data-offer]').first()).toBeVisible({ timeout: 20_000 });
      if (await page.locator('[data-mouse-colours]').count()) {
        found = true;
        break;
      }
    }
    test.skip(!found, 'no model with two stated colours among the first rows of today\'s data');
    const address = page.url();
    const all = await page.locator('[data-offer]').count();
    const chips = page.locator('[data-mouse-colours] button');
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    await chips.nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('[data-offer]').count()).toBeLessThanOrEqual(all);
    expect(page.url()).toBe(address);
    await chips.first().click();
    await expect(page.locator('[data-offer]')).toHaveCount(all);
  });

  test('compare works for mice: add two, the table has two columns, a reload keeps them', async ({ page }) => {
    await open(page, '/mouse?per=20');
    const add = page.locator(`${rows} [data-compare-ref]`);
    await add.nth(0).click();
    await add.nth(2).click();
    await page.locator('[data-compare-open]').click();
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
    await page.reload();
    await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
  });
});
