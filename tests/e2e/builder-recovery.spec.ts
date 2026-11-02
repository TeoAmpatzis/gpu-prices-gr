import { expect, test } from '@playwright/test';

test('another tab clearing the saved build before its index arrives wins over the initial snapshot', async ({ page, context }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route('**/data/builder/index.json', async (route) => {
    requested = true;
    await held;
    await route.fallback();
  });
  await page.goto('/about');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lang', 'en'); localStorage.setItem('pcBuild', JSON.stringify({ cpu: 'Ryzen 5 7600|true' })); });
  await page.goto('/builder?mode=quick');
  await expect.poll(() => requested).toBe(true);
  const other = await context.newPage();
  await other.goto('/about');
  await other.evaluate(() => localStorage.setItem('pcBuild', '{}'));
  await other.close();
  release();
  await page.locator('[data-line=cpu]').getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(page.getByRole('dialog').locator('li.card').first()).toBeVisible();
  await expect(page.locator('[data-line=cpu] > div').first()).toContainText('—');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').cpu)).toBeUndefined();
});

test('clearing a saved build while a part loads cannot restore that part later', async ({ page }) => {
  const file = await (await page.request.get('/data/builder/cpu.json')).json();
  const row = Object.fromEntries(file.cols.map((c: string, i: number) => [c, file.rows[0][i]]));
  const key = `${row.chip}|${row.coolerIncluded ?? '?'}`;
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route(/\/data\/(?:builder\/cpu\.json|cpu\/model\/\d+\.json)/, async (route) => {
    requested = true;
    await held;
    await route.fallback();
  });
  await page.goto('/about');
  await page.evaluate((cpu) => {
    localStorage.clear();
    localStorage.setItem('lang', 'en');
    localStorage.setItem('pcBuild', JSON.stringify({ cpu }));
  }, key);
  await page.goto('/builder?mode=quick');
  await expect.poll(() => requested).toBe(true);
  await page.locator('main aside').getByRole('button', { name: 'Clear build' }).click();
  release();
  await expect(page.locator('[data-line=cpu]')).toContainText('—');
  // Wait for the response to be processed, then open the picker: the file has loaded, but no part is selected.
  await page.locator('[data-line=cpu]').getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(page.getByRole('dialog').locator('li.card').first()).toBeVisible();
  await expect(page.locator('[data-line=cpu]')).not.toContainText(String(row.chip));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').cpu)).toBeUndefined();
});

test('editing a shared fan quantity preserves a shared CPU whose product file is still loading', async ({ page }) => {
  const cpuFile = await (await page.request.get('/data/builder/cpu.json')).json();
  const fanFile = await (await page.request.get('/data/builder/fan.json')).json();
  const cpu = Object.fromEntries(cpuFile.cols.map((c: string, i: number) => [c, cpuFile.rows[0][i]]));
  const fan = Object.fromEntries(fanFile.cols.map((c: string, i: number) => [c, fanFile.rows[0][i]]));
  const saved = { cpu: `${cpu.chip}|${cpu.coolerIncluded ?? '?'}`, fan: String(fan.chip).toLowerCase().replace(/[^a-z0-9]/g, '') };
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route(/\/data\/(?:builder\/cpu\.json|cpu\/model\/\d+\.json)/, async (route) => {
    requested = true;
    await held;
    await route.fallback();
  });
  await page.goto('/about');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lang', 'en'); });
  const params = new URLSearchParams({ v: '2', mode: 'quick', cpu: saved.cpu, fan: saved.fan, fanQty: '1' });
  await page.goto(`/builder?${params}`);
  await expect.poll(() => requested).toBe(true);
  await expect(page.locator('[data-line=fan] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('pcBuild'))).toBeNull();
  await expect(page.locator('[data-copy=link]')).toBeDisabled();
  await expect(page.locator('[data-copy=list]')).toBeDisabled();
  await expect(page.locator('#share-link')).toHaveValue('');
  await page.locator('[data-line=fan]').getByRole('button', { name: 'One pack more' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}'))).toMatchObject({ cpu: saved.cpu, fan: saved.fan, fanQty: 2 });
  release();
  await expect(page.locator('[data-line=cpu] .font-semibold').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-line=cpu] .font-semibold').first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').cpu)).toBe(saved.cpu);
});

test('saved builds paint the selected parts before downloading extra shop catalogues', async ({ page }) => {
  let extras = 0;
  await page.route('**/data/builder/*-extra.json*', (route) => { extras++; return route.fallback(); });
  await page.goto('/about');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('lang', 'en');
    localStorage.setItem('pcBuild', JSON.stringify({ cpu: 'Ryzen 5 7600|true' }));
  });
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=cpu] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
  expect(extras).toBe(0);
});

test('a stalled leading part does not block the remaining saved products', async ({ page }) => {
  const [cpuFile, moboFile, ramFile] = await Promise.all(['cpu', 'mobo', 'ram'].map(async (slot) => (await page.request.get(`/data/builder/${slot}.json`)).json()));
  const row = (file: { cols: string[]; rows: unknown[][] }) => Object.fromEntries(file.cols.map((c, i) => [c, file.rows[0][i]]));
  const cpu = row(cpuFile), mobo = row(moboFile), ram = row(ramFile);
  const saved = { cpu: `${cpu.chip}|${cpu.coolerIncluded ?? '?'}`, mobo: String(mobo.chip).toLowerCase().replace(/[^a-z0-9]/g, ''), ram: `${ram.chip} ${ram.formFactor}` };
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/data\/(?:builder\/cpu\.json|cpu\/model\/\d+\.json)/, async (route) => { await held; await route.fallback(); });
  await page.goto('/about');
  await page.evaluate((b) => { localStorage.clear(); localStorage.setItem('lang', 'en'); localStorage.setItem('pcBuild', JSON.stringify(b)); }, saved);
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=mobo] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-line=ram] .font-semibold').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-line=cpu] .font-semibold')).toHaveCount(0);
  await expect(page.locator('[data-copy=link]')).toBeDisabled();
  release();
  await expect(page.locator('[data-line=cpu] .font-semibold').first()).toBeVisible();
});

test('replacing a sparsely restored part waits for the new catalogue links before Copy list', async ({ page }) => {
  const file = await (await page.request.get('/data/builder/cpu.json')).json();
  const row = Object.fromEntries(file.cols.map((c: string, i: number) => [c, file.rows[0][i]]));
  const key = `${row.chip}|${row.coolerIncluded ?? '?'}`;
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/data/builder/cpu-extra.json*', async (route) => { await held; await route.fallback(); });
  await page.goto('/about');
  await page.evaluate((cpu) => { localStorage.clear(); localStorage.setItem('lang', 'en'); localStorage.setItem('pcBuild', JSON.stringify({ cpu })); }, key);
  await page.goto('/builder?mode=quick');
  await expect(page.locator('[data-line=cpu] .font-semibold').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-line=cpu]').getByRole('button', { name: 'Change', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Choose', exact: true }).first().click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pcBuild') ?? '{}').cpu)).not.toBe(key);
  await expect(page.locator('[data-copy=list]')).toBeDisabled();
  release();
  await expect(page.locator('[data-copy=list]')).toBeEnabled();
  await expect(page.locator('[data-review-line=cpu] a[target=_blank]')).toHaveAttribute('href', /^https:/);
});
