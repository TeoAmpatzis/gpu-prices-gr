import { expect, test, type Page } from '@playwright/test';

const listings = [
  { id: 'same', source: 'skroutz', title: 'Board AM5 exact', url: 'https://example.com/am5', price: 99, chip: 'Board', brand: 'ASUS', socket: 'AM5', memory: 'DDR5', formFactor: 'ATX', chipset: 'B650', shopCount: 1, scrapedAt: '', ramSlots: 4 },
  { id: 'same', source: 'bestprice', title: 'Board AM4 exact', url: 'https://example.com/am4', price: 149, chip: 'Board', brand: 'ASUS', socket: 'AM4', memory: 'DDR4', formFactor: 'ATX', chipset: 'B550', shopCount: 1, scrapedAt: '', ramSlots: 4 },
];
async function fixture(page: Page) {
  const manifest = await (await page.request.get('/data/manifest.json')).json();
  const entry = { key: 'board', chip: 'Board', slug: 'board', photo: false, listings, history: [], dips: [], imported: null, parts: { board: { socket: 'AM5', memory: 'DDR5' } }, variants: [], variantLabel: null, variantOrder: null, alternatives: [] };
  await page.route(/\/data\/mobo\/model\/\d+\.json/, (route) => route.fulfill({ json: { builtAt: manifest.builtAt, sources: {}, models: { board: entry } } }));
  await page.goto('/about');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lang', 'en'); });
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'));
async function query(page: Page, search: string) {
  await page.evaluate((search) => { history.pushState(null, '', `/mobo/board${search}`); window.dispatchEvent(new PopStateEvent('popstate')); }, search);
}

async function spa(page: Page, path: string) {
  await page.evaluate((path) => { history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
}

test('mounted builder restores an exact excluded-family selection and guided specs after SPA add', async ({ page }) => {
  await fixture(page);
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=mobo]')).toBeVisible();
  await spa(page, '/mobo/board?source=bestprice&offer=same');
  await page.locator('[data-fit-header=add]').click();
  await expect.poll(async () => (await stored(page)).offers?.mobo).toBe('bd1:bestprice:same');
  await spa(page, '/builder?mode=quick');
  await expect(page.locator('[data-line=mobo]')).toContainText('Board AM4 exact');
  await expect(page.locator('[data-gone-part=mobo]')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Step by step' }).click();
  await page.locator('main aside').getByRole('button').filter({ hasText: 'Board' }).click();
  const chosen = page.locator('[data-picker=mobo] li').filter({ has: page.getByText('Chosen', { exact: true }) });
  await expect(chosen).toContainText('Board AM4 exact');
  await expect(chosen).toContainText('DDR4');
  await expect(chosen).toContainText('149');
  await expect(chosen).not.toContainText('DDR5');
});

test('late same-family restoration cannot overwrite a newer offer from another tab', async ({ page, context }) => {
  await fixture(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route(/\/data\/mobo\/model\/\d+\.json/, async (route) => { requested = true; await held; await route.fallback(); });
  await page.evaluate(() => localStorage.setItem('pcBuild', JSON.stringify({ mobo: 'board', offers: { mobo: 'bd1:skroutz:same' } })));
  await page.goto('/builder?mode=quick');
  await expect.poll(() => requested).toBe(true);
  const other = await context.newPage();
  await other.goto('/about');
  await other.evaluate(() => localStorage.setItem('pcBuild', JSON.stringify({ mobo: 'board', offers: { mobo: 'bd1:bestprice:same' } })));
  await other.close();
  release();
  await expect(page.locator('[data-line=mobo]')).toContainText('Board AM4 exact');
  await page.getByRole('radio', { name: 'Step by step' }).click();
  await page.locator('main aside').getByRole('button').filter({ hasText: 'Board' }).click();
  const chosen = page.locator('[data-picker=mobo] li').filter({ has: page.getByText('Chosen', { exact: true }) });
  await expect(chosen).toContainText('DDR4');
  await expect(chosen).not.toContainText('DDR5');
});

test('a failed pinned restore retries exact evidence after its catalogue also failed', async ({ page }) => {
  await fixture(page);
  let failing = true;
  await page.route(/\/data\/(?:mobo\/model\/\d+\.json|builder\/mobo\.json)/, (route) => failing ? route.abort('failed') : route.fallback());
  await page.evaluate(() => localStorage.setItem('pcBuild', JSON.stringify({ mobo: 'board', offers: { mobo: 'bd1:bestprice:same' } })));
  await page.goto('/builder?mode=quick');
  const retry = page.locator('[data-line=mobo]').getByRole('button').first();
  await expect(retry).toHaveText(/Retry|Try again/);
  failing = false;
  await retry.click();
  await expect(page.locator('[data-line=mobo]')).toContainText('Board AM4 exact');
  await expect(page.locator('[data-gone-part=mobo]')).toHaveCount(0);
});

test('exact source selection survives add, same-family change, query navigation, reload and share import', async ({ page }) => {
  await fixture(page);
  await page.goto('/mobo/board?source=bestprice&offer=same');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Board AM4 exact');
  await expect(page.locator('[data-product-header] a[target=_blank]')).toHaveAttribute('href', listings[1].url);
  await expect(page.locator('[data-product-header]')).toContainText('DDR4');
  await page.locator('[data-fit-header=add]').click();
  await expect.poll(async () => (await stored(page)).offers?.mobo).toBe('bd1:bestprice:same');
  expect((await stored(page)).compat.mobo.fields.socket).toBe('AM4');
  expect((await stored(page)).mobo).toBe('board');

  await query(page, '?source=skroutz&offer=same');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Board AM5 exact');
  await expect(page.locator('#build-fit [data-fit-action=replace]')).toBeVisible();
  await page.locator('#build-fit [data-fit-action=replace]').click();
  await expect.poll(async () => (await stored(page)).offers?.mobo).toBe('bd1:skroutz:same');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Board AM4 exact');
  await expect(page.locator('#build-fit [data-fit-action=replace]')).toBeVisible();

  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=mobo] a[target=_blank]')).toHaveAttribute('href', listings[0].url);
  expect((await stored(page)).mobo).toBe('board');
  expect((await stored(page)).offers.mobo).toBe('bd1:skroutz:same');
  await page.reload();
  await expect(page.locator('[data-line=mobo] a[target=_blank]')).toHaveAttribute('href', listings[0].url);

  await page.goto('/builder?mode=quick&v=2&mobo=board&o.mobo=bd1%3Abestprice%3Asame');
  await expect(page.locator('[data-line=mobo] a[target=_blank]')).toHaveAttribute('href', listings[1].url);
  expect((await stored(page)).offers.mobo).toBe('bd1:skroutz:same'); // Opening a share remains read-only.
  await page.locator('[data-shop-choice=mobo]').getByRole('button', { name: 'Other shop', exact: true }).click();
  await page.locator('[data-shop-choice=mobo] button[aria-pressed]').filter({ hasText: 'BestPrice' }).click();
  await expect.poll(async () => (await stored(page)).offers?.mobo).toBe('bd1:bestprice:same');
  expect((await stored(page)).compat?.mobo.fields.socket).toBe('AM4');
});

test('missing and invalid selections offer an explicit family fallback without purchase or add controls', async ({ page }) => {
  await fixture(page);
  await page.goto('/mobo/board?source=bestprice&offer=gone');
  await expect(page.locator('[data-selection-unavailable]')).toBeVisible();
  await expect(page.locator('main a[target=_blank], main [data-fit-header]')).toHaveCount(0);
  await query(page, '?source=bestprice');
  await expect(page.locator('[data-selection-unavailable]')).toBeVisible();
  await page.getByRole('link', { name: 'View product family' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Board');
  await expect(page.locator('[data-product-header]')).toBeVisible();
});

test('pending, missing and failed requested builder offers have no purchase action', async ({ page }) => {
  const file = await (await page.request.get('/data/builder/gpu.json')).json();
  const row = Object.fromEntries(file.cols.map((c: string, i: number) => [c, file.rows[0][i]]));
  await page.goto('/about');
  await page.evaluate((row) => {
    localStorage.clear(); localStorage.setItem('lang', 'en');
    localStorage.setItem('pcBuild', JSON.stringify({ gpu: row.id, offers: { gpu: `bd1:${row.source}:${encodeURIComponent(row.id)}` } }));
  }, row);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/data\/gpu\/model\/\d+\.json/, async (route) => {
    await held;
    await route.fulfill({ json: { builtAt: file.builtAt, sources: {}, models: {} } });
  });
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-review-line=gpu] [data-offer-notice=pending]')).toBeVisible();
  await expect(page.locator('[data-line=gpu] a[target=_blank], [data-review-line=gpu] a[target=_blank]')).toHaveCount(0);
  release();
  await expect(page.locator('[data-review-line=gpu] [data-offer-notice=missing]')).toBeVisible();
  await expect(page.locator('[data-line=gpu] a[target=_blank], [data-review-line=gpu] a[target=_blank]')).toHaveCount(0);

  await page.unroute(/\/data\/gpu\/model\/\d+\.json/);
  await page.route(/\/data\/gpu\/model\/\d+\.json/, (route) => route.abort('failed'));
  await page.reload();
  await expect(page.locator('[data-review-line=gpu] [data-offer-notice=failed]')).toBeVisible();
  await expect(page.locator('[data-line=gpu] a[target=_blank], [data-review-line=gpu] a[target=_blank]')).toHaveCount(0);
});

test('guided unresolved offers show notices without price or source and do not expand the remaining budget', async ({ page }) => {
  const file = await (await page.request.get('/data/builder/gpu.json')).json();
  const row = Object.fromEntries(file.cols.map((c: string, i: number) => [c, file.rows[0][i]]));
  await page.goto('/about');
  await page.evaluate((row) => {
    localStorage.clear(); localStorage.setItem('lang', 'en');
    localStorage.setItem('pcBuild', JSON.stringify({ gpu: row.id, budget: 1, offers: { gpu: `bd1:${row.source}:${encodeURIComponent(row.id)}` } }));
  }, row);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/data\/gpu\/model\/\d+\.json/, async (route) => {
    await held;
    await route.fulfill({ json: { builtAt: file.builtAt, sources: {}, models: {} } });
  });
  await page.goto('/builder?step=gpu');
  const chosen = page.locator('[data-picker=gpu] li.card').filter({ has: page.getByText('Chosen', { exact: true }) });
  const sidebarLine = page.locator('main aside').getByRole('button').filter({ hasText: 'GPU' });
  for (const status of ['pending', 'missing']) {
    if (status === 'missing') release();
    await expect(chosen.locator(`[data-offer-notice=${status}]`)).toBeVisible();
    await expect(chosen).not.toContainText('€');
    await expect(chosen).not.toContainText(/Skroutz|BestPrice|Shopflix|Snif|e-shop/);
    await expect(sidebarLine).not.toContainText('€');
  }
  await page.getByRole('button', { name: 'Within budget', exact: true }).click();
  await expect(page.locator('[data-picker=gpu] li.card')).toHaveCount(0);
  await page.unroute(/\/data\/gpu\/model\/\d+\.json/);
  await page.route(/\/data\/gpu\/model\/\d+\.json/, (route) => route.abort('failed'));
  await page.reload();
  await expect(chosen.locator('[data-offer-notice=failed]')).toBeVisible();
  await expect(chosen).not.toContainText('€');
  await expect(sidebarLine).not.toContainText('€');
});
