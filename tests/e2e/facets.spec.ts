import { expect, test, type Page } from '@playwright/test';

const side = (page: Page) => page.locator('.catalogue-sidebar');
const counts = (page: Page) => side(page).locator('.catalogue-filter-count').allTextContents();
const loaded = (page: Page) =>
  expect(page.locator('[data-product-key]').first()).toBeVisible({
    timeout: 20_000,
  });

test('/case: listing facet counts arrive from the worker and follow source/spec filters', async ({ page }) => {
  const workers: string[] = [];
  const errors: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/case');
  await loaded(page);
  await expect
    .poll(async () => (await counts(page)).every((n) => /^\d+$/.test(n)), {
      timeout: 20_000,
    })
    .toBe(true);
  expect(workers.some((w) => w.includes('facets.worker'))).toBe(true);
  const before = await counts(page);
  // Filters start empty (empty = all), so ticking a size is the change that narrows the other counts.
  await side(page)
    .getByRole('checkbox', { name: /^Midi Tower/ })
    .check();
  await expect.poll(() => counts(page)).not.toEqual(before);
  const selected = side(page).locator('input:checked');
  await side(page).getByRole('searchbox').fill('zzqqxx-no-such-case');
  await expect.poll(async () => (await counts(page)).every((n) => n === '0')).toBe(true);
  for (const input of await selected.all()) await expect(input).toBeEnabled();
  await expect(side(page).locator('input[type=checkbox]:not(:checked):disabled').first()).toBeDisabled();
  expect(errors).toEqual([]);
});

test('/case: filling delayed counts does not move checkbox rows', async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route('**/data/case/list.v2.json*', async (route) => {
    if (first) {
      first = false;
      return route.continue();
    }
    await held;
    return route.continue();
  });
  await page.goto('/case');
  await loaded(page);
  const boxes = () =>
    side(page)
      .locator('.catalogue-filter-option')
      .evaluateAll((rows) => rows.map((r) => JSON.stringify(r.getBoundingClientRect())));
  const before = await boxes();
  expect((await counts(page)).every((n) => n === '')).toBe(true);
  release();
  await expect.poll(async () => (await counts(page)).every((n) => /^\d+$/.test(n))).toBe(true);
  expect(await boxes()).toEqual(before);
});

test('/case: changed filters hide stale counts until the new worker answer', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      Worker: typeof Worker;
      holdFacets: boolean;
      releaseFacets: () => void;
    };
    const queue: (() => void)[] = [];
    w.holdFacets = false;
    w.releaseFacets = () => {
      w.holdFacets = false;
      for (const go of queue.splice(0)) go();
    };
    const Real = w.Worker;
    w.Worker = class extends Real {
      set onmessage(fn: ((e: MessageEvent) => void) | null) {
        super.onmessage = fn && ((e: MessageEvent) => (w.holdFacets ? queue.push(() => fn(e)) : fn(e)));
      }
      get onmessage() {
        return super.onmessage;
      }
    };
  });
  await page.goto('/case');
  await loaded(page);
  await expect.poll(async () => (await counts(page)).every((n) => /^\d+$/.test(n))).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { holdFacets: boolean }).holdFacets = true;
  });
  await side(page)
    .getByRole('checkbox', { name: /^Midi Tower/ })
    .check();
  await expect.poll(async () => (await counts(page)).every((n) => n === '')).toBe(true);
  await expect(side(page).locator('input:disabled')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { releaseFacets: () => void }).releaseFacets());
  await expect.poll(async () => (await counts(page)).every((n) => /^\d+$/.test(n))).toBe(true);
});
