// Pick mode on the category pages (`/<category>?pick=1`, v2 step 3, step2-plan section 6) against the production
// preview: "Only compatible" from the engine, "Add to build" into the saved build and the builder, per card for
// graphics cards, old builds (keys only) through the compat chunks and never builder.json, missing keys, the
// URL parameters, phones at 360 px, and a normal category page that loads none of it.
import { expect, test, type Page } from '@playwright/test';

const AM5_CPU = 'Ryzen 7 7700|true';
const AM5_FIELDS = { chip: 'Ryzen 7 7700', socket: 'AM5', igpu: true, coolerIncluded: true };

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Every request path the page makes (data files, chunks). */
function trackRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (r) => paths.push(new URL(r.url()).pathname));
  return paths;
}

/** Opens a light page, stores the build (and the language), then opens `url` in a fresh document. */
async function withBuild(page: Page, build: object | null, url: string, lang: 'el' | 'en' = 'en') {
  await page.goto('/about');
  await page.evaluate(
    ([b, l]) => {
      localStorage.clear();
      localStorage.setItem('lang', l as string);
      if (b) localStorage.setItem('pcBuild', JSON.stringify(b));
    },
    [build, lang] as const,
  );
  await page.goto(url);
}

const listBuiltAt = async (page: Page, cat: string) =>
  ((await (await page.request.get(`/data/${cat}/list.v2.json`)).json()) as { builtAt: string }).builtAt;

const savedBuild = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}') as Record<string, unknown>);

/** The pick bar's status line once the check is done (not "Checking compatibility…"). */
async function waitChecked(page: Page) {
  const status = page.locator('main [data-pick=bar] [role=status]:visible');
  await expect(status).toBeVisible({ timeout: 20_000 });
  await expect(status).not.toHaveText(/Checking compatibility|Έλεγχος συμβατότητας/, { timeout: 20_000 });
}

const rows = (page: Page) => page.locator('main tbody tr button[aria-expanded]:visible');
const addButtons = (page: Page) => page.locator('main button:visible').filter({ hasText: /^(Add to build|Πρόσθεσε στο build)$/ });
const onlyCompatible = (page: Page) => page.locator('main aside [role=switch]');
const am5Build = async (page: Page) => ({ cpu: AM5_CPU, compat: { cpu: { fields: AM5_FIELDS, builtAt: await listBuiltAt(page, 'mobo') } } });

test('AM5 CPU in the build: /mobo?pick=1 hides AM4 boards; switched off they are greyed with the reason', async ({ page }) => {
  const errors = trackErrors(page);
  const requests = trackRequests(page);
  await page.goto('/about');
  await withBuild(page, await am5Build(page), '/mobo?pick=1&sock=am4&q=b550');
  await waitChecked(page);
  await expect(page.locator('main [data-pick=bar] [role=status]')).toHaveText(/Checked against your build: 1\u00a0part/);
  // Every B550 (AM4) board clashes with the AM5 CPU: nothing is left.
  await expect(rows(page)).toHaveCount(0);
  await expect(onlyCompatible(page)).toHaveAttribute('aria-checked', 'true');
  await expect(onlyCompatible(page)).toContainText(/Only compatible \(\d[\d,]*\u00a0hidden\)/);
  // The fields were stored and current: no chunk, never builder.json.
  expect(requests.filter((p) => p.startsWith('/data/compat/') || p === '/data/builder.json')).toEqual([]);

  await onlyCompatible(page).click();
  await expect.poll(() => new URL(page.url()).search).toBe('?pick=1&compat=0&q=b550&sock=am4');
  await expect(rows(page).first()).toBeVisible();
  const first = page.locator('main tbody tr:visible').first();
  await expect(first).toContainText('Incompatible');
  await expect(first).toContainText(/AM4/);
  await expect(first.locator('button.opacity-50')).toHaveCount(1); // the name is greyed
  await expect(addButtons(page)).toHaveCount(0);

  // pick=1 and compat=0 survive a filter change, a sort change and a page change.
  await page.locator('main aside select[aria-label]').first().selectOption('price-desc');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('price-desc');
  await page.locator('main aside input[aria-label]').first().fill('b550 asus');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('b550 asus');
  const p = new URL(page.url()).searchParams;
  expect([p.get('pick'), p.get('compat')]).toEqual(['1', '0']);
  expect(errors).toEqual([]);
});

test('"Add to build" saves the board with its fields and opens the builder; Back keeps the filters', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/about');
  await withBuild(page, await am5Build(page), '/mobo?pick=1&q=b650');
  await waitChecked(page);
  const row = page.locator('main tbody tr:visible').filter({ has: page.getByRole('button', { name: /^(Add to build|Πρόσθεσε στο build)$/ }) }).first();
  await expect(row).toBeVisible();
  const name = (await row.locator('a[data-product-link]').innerText()).trim();
  await row.locator('button').filter({ hasText: /^Add to build$/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/builder');
  await expect(page.locator('main').getByText(name, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  const saved = await savedBuild(page);
  expect(saved.cpu).toBe(AM5_CPU);
  expect(typeof saved.mobo).toBe('string');
  const compat = saved.compat as Record<string, { fields: Record<string, unknown>; builtAt: string }>;
  expect(compat.mobo.fields.socket).toBe('AM5');
  expect(compat.mobo.builtAt).toBe(await listBuiltAt(page, 'mobo'));

  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe('/mobo?pick=1&q=b650');
  await expect(page.locator('main aside input[aria-label]').first()).toHaveValue('b650');
  await expect(page.locator('main [data-pick=bar] [role=status]:visible')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a graphics card is added per card, from the open row', async ({ page }) => {
  const errors = trackErrors(page);
  await withBuild(page, null, '/gpu?pick=1');
  await waitChecked(page);
  await expect(page.locator('main [data-pick=bar] [role=status]')).toHaveText(/Your build is empty/);
  // The row itself has no button, only the hint; the cards in the open row have one each.
  await expect(addButtons(page)).toHaveCount(0);
  await rows(page).first().click();
  const card = page.locator('main tbody ul li:visible').filter({ has: page.getByRole('button', { name: 'Add this card' }) }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  const title = await card.locator('span.text-fg-soft[title]').first().getAttribute('title');
  await card.getByRole('button', { name: 'Add this card' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/builder');
  await expect(page.locator('main').getByText(title!, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  const saved = await savedBuild(page);
  expect(saved.gpu).toMatch(/^[a-z]+:/); // a listing id: one card, not the chip
  expect(errors).toEqual([]);
});

test('an old build (keys only) loads only its compat chunk, never builder.json, and saves the fields back', async ({ page }) => {
  const errors = trackErrors(page);
  const requests = trackRequests(page);
  await withBuild(page, { cpu: AM5_CPU, gpu: 'skroutz:1' }, '/mobo?pick=1&sock=am4&q=b550');
  await waitChecked(page);
  await expect(rows(page)).toHaveCount(0); // B550 boards: checked with the chunk's AM5 fields
  const chunks = requests.filter((p) => p.startsWith('/data/compat/'));
  expect(chunks).toHaveLength(1); // the CPU's chunk; the card is not read by the board page's rules
  expect(chunks[0]).toMatch(/^\/data\/compat\/cpu-\d\d\.json$/);
  expect(requests).not.toContain('/data/builder.json');
  const compat = (await savedBuild(page)).compat as Record<string, { fields: Record<string, unknown> }>;
  expect(compat.cpu.fields.socket).toBe('AM5');

  // Next visit: the fields are in pcBuild and current, so no chunk at all.
  requests.length = 0;
  await page.reload();
  await waitChecked(page);
  await expect(rows(page)).toHaveCount(0);
  expect(requests.filter((p) => p.startsWith('/data/compat/') || p === '/data/builder.json')).toEqual([]);
  expect(errors).toEqual([]);
});

test('a saved key the data no longer has is shown as no longer available and the page still works', async ({ page }) => {
  const errors = trackErrors(page);
  await withBuild(page, { cpu: 'Ryzen 9 1234X|true' }, '/mobo?pick=1');
  await waitChecked(page);
  const bar = page.locator('main [data-pick=bar]:visible');
  await expect(bar).toContainText('no longer available');
  await expect(bar).toContainText('Ryzen 9 1234X');
  await expect(bar.locator('[role=status]')).toHaveText(/Your build is empty/); // left out of the checks
  await expect(rows(page).first()).toBeVisible();
  await expect(addButtons(page).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('no usable model ever shows "not offered" while the candidates are being built', async ({ page }) => {
  const errors = trackErrors(page);
  // Every row name that showed the "not offered" text at any moment (checked on every DOM change).
  await page.addInitScript(() => {
    const seen = new Set<string>();
    (window as unknown as { __notOffered: Set<string> }).__notOffered = seen;
    new MutationObserver(() => {
      for (const tr of document.querySelectorAll('main tbody tr')) {
        if (tr.textContent?.includes('Not offered in the PC Builder')) seen.add(tr.querySelector('a[data-product-link]')?.textContent ?? '');
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto('/about');
  await withBuild(page, await am5Build(page), '/mobo?pick=1&q=b650');
  await waitChecked(page);
  await expect(addButtons(page).first()).toBeVisible();
  const flashed = await page.evaluate(() => [...(window as unknown as { __notOffered: Set<string> }).__notOffered]);
  const withButton = await page
    .locator('main tbody tr:visible')
    .filter({ has: page.getByRole('button', { name: /^Add to build$/ }) })
    .locator('a[data-product-link]')
    .allInnerTexts();
  expect(flashed.filter((n) => withButton.includes(n))).toEqual([]);
  expect(errors).toEqual([]);
});

test('a compat chunk that fails: one request, the stored fields are used, no retry loop', async ({ page }) => {
  const errors = trackErrors(page);
  const compat: string[] = [];
  await page.route('**/data/compat/**', (route) => {
    compat.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 503, body: 'down' });
  });
  // Saved from older data: a refresh is due, the chunk fails, the stored AM5 fields still hide the B550 boards.
  await withBuild(page, { cpu: AM5_CPU, compat: { cpu: { fields: AM5_FIELDS, builtAt: '2026-01-01T00:00:00Z' } } }, '/mobo?pick=1&sock=am4&q=b550');
  await waitChecked(page);
  await expect(rows(page)).toHaveCount(0);
  await page.waitForTimeout(3000);
  expect(compat).toHaveLength(1);

  // Keys only and the chunk fails: the part is left out, and the bar says so.
  compat.length = 0;
  await withBuild(page, { cpu: AM5_CPU }, '/mobo?pick=1&sock=am4&q=b550');
  await waitChecked(page);
  const bar = page.locator('main [data-pick=bar]:visible');
  await expect(bar).toContainText("Couldn't check Processor: Ryzen 7 7700");
  await expect(bar.locator('[role=status]')).toHaveText(/Your build is empty/);
  await page.waitForTimeout(3000);
  expect(compat).toHaveLength(1);
  // Greek: the part's name stays in the nominative, after a dash (not after «για»).
  await withBuild(page, { cpu: AM5_CPU }, '/mobo?pick=1&sock=am4&q=b550', 'el');
  await waitChecked(page);
  await expect(page.locator('main [data-pick=bar]:visible')).toContainText('Δεν ήταν δυνατός ο έλεγχος — Επεξεργαστής: Ryzen 7 7700');
  expect(errors).toEqual([]);
});

test('everything hidden: the empty state says how many and turns "Only compatible" off', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/about');
  await withBuild(page, await am5Build(page), '/mobo?pick=1&sock=am4&q=b550');
  await waitChecked(page);
  const empty = page.locator('main .card:visible').filter({ hasText: /hidden by "Only compatible"/ });
  await expect(empty).toContainText(/\d[\d,]*\u00a0hidden by "Only compatible"/);
  await empty.getByRole('button', { name: 'Turn off "Only compatible"' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('compat')).toBe('0');
  await expect(rows(page).first()).toBeVisible();

  // Clearing the filters leaves the mode alone: still pick mode, still "Only compatible" off.
  await page.locator('main aside').getByRole('button', { name: /Clear filters/ }).first().click();
  await expect.poll(() => new URL(page.url()).search).toBe('?pick=1&compat=0');
  expect(errors).toEqual([]);
});

test('/builder, kept open in the background, shows the part a pick page added (with compat in pcBuild)', async ({ page }) => {
  const errors = trackErrors(page);
  await withBuild(page, { cpu: AM5_CPU }, '/builder?mode=quick');
  await expect(page.locator('main').getByText('Ryzen 7 7700').filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  // In-site navigation (the builder stays mounted, hidden).
  await page.evaluate(() => {
    history.pushState(null, '', '/mobo?pick=1&q=b650');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await waitChecked(page);
  const row = page.locator('main tbody tr:visible').filter({ has: page.getByRole('button', { name: /^(Add to build|Πρόσθεσε στο build)$/ }) }).first();
  const name = (await row.locator('a[data-product-link]').innerText()).trim();
  await row.locator('button').filter({ hasText: /^Add to build$/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/builder');
  await expect(page.locator('main').getByText(name, { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator('main').getByText('Ryzen 7 7700').filter({ visible: true }).first()).toBeVisible();
  // A fresh load of the builder restores the same parts from the file the pick page wrote.
  await page.reload();
  await expect(page.locator('main').getByText(name, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('main').getByText('Ryzen 7 7700').filter({ visible: true }).first()).toBeVisible();
  const saved = await savedBuild(page);
  expect(Object.keys(saved.compat as object).sort()).toEqual(['cpu', 'mobo']);
  expect(errors).toEqual([]);
});

test('a phone at 360 px: no sideways scroll, the buttons are at least 44 px tall', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/about');
  await withBuild(page, await am5Build(page), '/mobo?pick=1', 'el');
  await waitChecked(page);
  const add = page.locator('main button:visible').filter({ hasText: /^Πρόσθεσε στο build$/ }).first();
  await expect(add).toBeVisible();
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const back = page.locator('main [data-pick=bar] a[href="/builder"]');
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  // The switch is in the filter sheet.
  await page.locator('main button[aria-haspopup=dialog]').click();
  const sw = page.locator('[role=dialog] [role=switch]');
  await expect(sw).toBeVisible();
  expect((await sw.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(sw).toContainText(/Μόνο συμβατά \(\d[\d.]*\u00a0κρυμμέν(ο|α)\)/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  expect(errors).toEqual([]);
});

// Task 6b: /case?pick=1 with a saved build. A long card (360 mm) hides every case that states a shorter maximum.
const LONG_CARD = { chip: 'RTX 5090', lengthMm: 360, minPsu: 1000, powerConnector: null, slots: null };
const caseBuild = async (page: Page) => {
  const builtAt = await listBuiltAt(page, 'case');
  return { gpu: 'bestprice:999000001', compat: { gpu: { fields: LONG_CARD, builtAt } } };
};

/** Sums the page's layout shifts (none with recent input) from the first paint on, like CLS. */
async function trackShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __shifts: string[] };
    w.__cls = 0;
    w.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] })[]) {
        if (e.hadRecentInput) continue;
        w.__cls += e.value;
        w.__shifts.push(`${e.value.toFixed(4)} ${(e.sources ?? []).map((s) => (s.node as Element | undefined)?.tagName ?? '?').join(',')}`);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  return () => page.evaluate(() => (window as unknown as { __cls: number; __shifts: string[] }).__cls);
}

/** C3 (task 9): the short week-change label must not move rows when the check finishes, at a mid width too. */
test('/case?pick=1 with a saved build at 1100 px: nothing shifts', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const cls = await trackShifts(page);
  await page.goto('/about');
  await withBuild(page, await caseBuild(page), '/case?pick=1');
  await waitChecked(page);
  await page.waitForTimeout(1000);
  expect(await cls()).toBeLessThan(0.1);
});

for (const vp of [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'phone', width: 360, height: 740 },
]) {
  test(`/case?pick=1 with a saved build (${vp.name}): the check runs in the worker and nothing shifts when it finishes`, async ({ page }) => {
    const errors = trackErrors(page);
    const requests = trackRequests(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const cls = await trackShifts(page);
    await page.goto('/about');
    await withBuild(page, await caseBuild(page), '/case?pick=1');
    await waitChecked(page);
    await page.waitForTimeout(1000);
    expect(await cls()).toBeLessThan(0.1);
    expect(requests.some((p) => /\/assets\/pick\.worker-[\w-]+\.js$/.test(p))).toBe(true);
    expect(requests.some((p) => /\/assets\/pickCheck-/.test(p))).toBe(false); // the engine only in the worker
    if (vp.name === 'phone') {
      await expect(page.locator('main li.card:visible').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      expect(errors).toEqual([]);
      return;
    }
    // "Only compatible" on: something is hidden, and no visible row is greyed.
    await expect(onlyCompatible(page)).toContainText(/Only compatible \(\d[\d,]*\u00a0hidden\)/);
    await expect(rows(page).first()).toBeVisible();
    await expect(page.locator('main tbody tr:visible button[aria-expanded].opacity-50')).toHaveCount(0);
    // Off: the hidden cases come back greyed, with the reason (the card is longer than the case allows).
    await onlyCompatible(page).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('compat')).toBe('0');
    await page.locator('main aside input[aria-label]').first().fill('mini');
    const greyed = page.locator('main tbody tr:visible').filter({ has: page.locator('button[aria-expanded].opacity-50') });
    await expect(greyed.first()).toBeVisible();
    await expect(greyed.first()).toContainText('Incompatible');
    await expect(greyed.first().locator('button').filter({ hasText: /^Add to build$/ })).toHaveCount(0);
    // "Add to build" on a case that fits.
    await onlyCompatible(page).click();
    const row = page.locator('main tbody tr:visible').filter({ has: page.getByRole('button', { name: /^Add to build$/ }) }).first();
    await row.locator('button').filter({ hasText: /^Add to build$/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/builder');
    const saved = await savedBuild(page);
    expect(typeof saved.case).toBe('string');
    const fields = (saved.compat as Record<string, { fields: Record<string, unknown> }>).case.fields;
    expect(fields.gpuMaxMm == null || (fields.gpuMaxMm as number) >= 360).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('/case?pick=1 without Worker support: the main-thread fallback hides the same cases', async ({ page }) => {
  const errors = trackErrors(page);
  const requests = trackRequests(page);
  const hiddenCount = async () => Number(((await onlyCompatible(page).innerText()).match(/\((\d[\d,]*)/)?.[1] ?? 'NaN').replace(/,/g, ''));
  await page.goto('/about');
  const build = await caseBuild(page);
  await withBuild(page, build, '/case?pick=1&q=mini');
  await waitChecked(page);
  const withWorker = await hiddenCount();
  expect(withWorker).toBeGreaterThan(0);

  await page.addInitScript(() => {
    (window as unknown as { Worker?: unknown }).Worker = undefined;
  });
  requests.length = 0;
  await page.reload();
  await waitChecked(page);
  expect(requests.some((p) => /pick\.worker/.test(p))).toBe(false);
  expect(requests.some((p) => /\/assets\/pickCheck-/.test(p))).toBe(true); // the engine, loaded for the fallback
  expect(await hiddenCount()).toBe(withWorker);
  await expect(page.locator('main tbody tr:visible button[aria-expanded].opacity-50')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a compat chunk that never answers: after the deadline the rows show, nothing hidden, and the bar says so', async ({ page }) => {
  const errors = trackErrors(page);
  await page.route('**/data/compat/**', () => {}); // never fulfilled: a stalled connection
  await withBuild(page, { gpu: 'bestprice:999000001' }, '/case?pick=1'); // keys only: its fields must come from a chunk
  const status = page.locator('main [data-pick=bar] [role=status]:visible');
  await expect(status).toHaveText(/Checking compatibility/, { timeout: 20_000 });
  await expect(rows(page)).toHaveCount(0); // placeholders while waiting
  await expect(status).toHaveText("The compatibility check didn't finish: nothing is hidden.", { timeout: 30_000 }); // PENDING_DEADLINE 15 s
  await expect(rows(page).first()).toBeVisible();
  await expect(addButtons(page).first()).toBeVisible();
  await expect(page.locator('main tbody tr:visible button[aria-expanded].opacity-50')).toHaveCount(0);
  await expect(onlyCompatible(page)).toContainText("The check didn't finish");
  expect(errors).toEqual([]);
});

test('a normal category page loads no pick code, no compat chunk and no builder.json', async ({ page }) => {
  const errors = trackErrors(page);
  const requests = trackRequests(page);
  await withBuild(page, { cpu: AM5_CPU }, '/gpu');
  await expect(rows(page).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  expect(requests.filter((p) => p.startsWith('/data/compat/') || p === '/data/builder.json' || /\/assets\/(PickView|pick\.worker)-/.test(p))).toEqual([]);
  await expect(page.locator('main [data-pick=bar] [role=status]')).toHaveCount(0);
  await expect(page.locator('main [role=switch]')).toHaveCount(0);
  await expect(addButtons(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});
