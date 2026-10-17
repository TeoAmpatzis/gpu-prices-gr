// Step 4 task 3: the filter counts come from the facet worker after the first paint. /case (the biggest list) loads,
// the counts appear, a filter click updates them, and a selected option is never disabled, even at a count of 0.
import { expect, test, type Page } from '@playwright/test';

/** The desktop filter sidebar (the phone sheet holds a second, closed copy). */
const side = (page: Page) => page.locator('aside').first();
/** The maker select ("Κατασκευαστής" / "Manufacturer"): the case page's last spec filter. */
const makerSelect = (page: Page) => side(page).locator('select').filter({ has: page.locator('option[value=""]') }).last();
/** Every option's count as "value=count", e.g. "corsair=97". */
const optionCounts = (page: Page) =>
  makerSelect(page)
    .locator('option')
    .evaluateAll((os) => os.map((o) => `${(o as HTMLOptionElement).value}=${/\((\d+)\)$/.exec(o.textContent ?? '')?.[1] ?? ''}`).join(','));

test('/case: counts arrive from the worker, follow the filters, never disable the selected option', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const workers: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));
  await page.goto('/case');
  await expect(page.locator('main tbody tr button[aria-expanded]:visible').first()).toBeVisible({ timeout: 20_000 });

  // The counts fill in: every maker option gets a number, and the size chips show theirs.
  await expect.poll(async () => (await optionCounts(page)).split(',').slice(1).every((x) => /=\d+$/.test(x)), { timeout: 20_000 }).toBe(true);
  expect(workers.some((u) => u.includes('facets.worker'))).toBe(true);
  // (a chip's count is the last span of its Count; the first holds the invisible width placeholder)
  const sizeCount = side(page).locator('button[aria-pressed]').filter({ hasText: /^Mini Tower/ }).locator('span.grid > span:last-child');
  await expect(sizeCount).toHaveText(/^\d+$/);

  // A filter click (drop the Midi Tower size) changes the makers' counts.
  const before = await optionCounts(page);
  await side(page).locator('button[aria-pressed]').filter({ hasText: /^Midi Tower/ }).click();
  await expect.poll(() => optionCounts(page), { timeout: 20_000 }).not.toBe(before);

  // Pick a maker, then search for nothing: every count goes to 0. The selected maker and the pressed chips stay
  // usable; the other makers and the unpressed chips are greyed.
  const maker = await makerSelect(page).locator('option').nth(1).getAttribute('value');
  await makerSelect(page).selectOption(maker!);
  await side(page).locator('input').first().fill('zzqqxx-no-such-case');
  await expect.poll(() => optionCounts(page), { timeout: 20_000 }).toMatch(new RegExp(`(^|,)${maker}=0(,|$)`));
  // (Playwright's toBeDisabled doesn't read <option>: the DOM property does)
  const disabled = (sel: string) => makerSelect(page).locator(sel).evaluate((o) => (o as HTMLOptionElement).disabled);
  expect(await disabled(`option[value="${maker}"]`)).toBe(false);
  expect(await disabled('option:not([value=""]) >> nth=1')).toBe(true);
  const pressed = side(page).locator('button[aria-pressed="true"]');
  expect(await pressed.count()).toBeGreaterThan(0);
  for (const b of await pressed.all()) await expect(b).toBeEnabled();
  await expect(side(page).locator('button[aria-pressed="false"]').first()).toBeDisabled();
  expect(errors).toEqual([]);
});

test('/case: the filter sidebar does not move when the counts fill in', async ({ page }) => {
  // Hold the worker's list file back, so the sidebar paints without counts first.
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  let first = true;
  await page.route('**/data/case/list.v2.json', async (route) => {
    // The page's own request goes through; the worker's (the second) waits.
    if (first) {
      first = false;
      return route.continue();
    }
    await held;
    return route.continue();
  });
  await page.goto('/case');
  await expect(page.locator('main tbody tr button[aria-expanded]:visible').first()).toBeVisible({ timeout: 20_000 });
  const chips = side(page).locator('button[aria-pressed]');
  await expect(chips.first()).toBeVisible();
  // No counts yet: no numbers, nothing greyed.
  await expect(side(page).locator('button[aria-pressed]:disabled')).toHaveCount(0);
  expect(await optionCounts(page)).not.toMatch(/=\d/);
  const boxes = () => chips.evaluateAll((bs) => bs.map((b) => JSON.stringify(b.getBoundingClientRect())));
  const before = await boxes();
  release();
  await expect.poll(async () => /=\d/.test(await optionCounts(page)), { timeout: 20_000 }).toBe(true);
  expect(await boxes()).toEqual(before);
});

test('/case: after a filter change, the previous counts are not shown while the new ones are on their way', async ({ page }) => {
  // Hold the facet worker's answers on demand: the page's Worker wraps the real one and queues its messages.
  await page.addInitScript(() => {
    const w = window as unknown as { Worker: typeof Worker; holdFacets: boolean; releaseFacets: () => void };
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
  await expect(page.locator('main tbody tr button[aria-expanded]:visible').first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => /=\d/.test(await optionCounts(page)), { timeout: 20_000 }).toBe(true);
  const before = await optionCounts(page);
  const chips = side(page).locator('button[aria-pressed]');
  const chipCounts = () => chips.locator('span.grid > span:last-child').allTextContents();
  const boxes = () => chips.evaluateAll((bs) => bs.map((b) => JSON.stringify(b.getBoundingClientRect())));

  await page.evaluate(() => ((window as unknown as { holdFacets: boolean }).holdFacets = true));
  await side(page).locator('button[aria-pressed]').filter({ hasText: /^Midi Tower/ }).click();
  // The answer is held: no numbers anywhere (the old ones would be wrong now), nothing greyed.
  await expect.poll(chipCounts).toEqual((await chipCounts()).map(() => ''));
  expect(await optionCounts(page)).not.toMatch(/=\d/);
  await expect(side(page).locator('button[aria-pressed]:disabled')).toHaveCount(0);
  expect(await makerSelect(page).locator('option:disabled').count()).toBe(0);
  await page.waitForTimeout(500);
  expect((await chipCounts()).every((t) => t === '')).toBe(true);
  // (measured after the click: the clicked chip itself swaps its tick for a dot)
  const boxesBefore = await boxes();

  await page.evaluate(() => (window as unknown as { releaseFacets: () => void }).releaseFacets());
  await expect.poll(async () => /=\d/.test(await optionCounts(page)), { timeout: 20_000 }).toBe(true);
  expect(await optionCounts(page)).not.toBe(before);
  expect(await boxes()).toEqual(boxesBefore); // the new numbers fill in without moving anything
});
