// Model addresses (step 4, task 5): /<cat>/<slug> shows the model, an unknown slug says "no longer available" with a
// link to the category, a path that isn't /<cat>/<slug> is still the 404 page. (The "moved" alias case needs an alias
// table entry, which the static build doesn't have: covered in tests/unit/modelAddress.test.ts.)
import { expect, test, type Page } from '@playwright/test';

/** A real model of the build: the first entry of the first non-empty gpu chunk. */
async function aModel(page: Page): Promise<{ slug: string; chip: string }> {
  const { builtAt } = await (await page.request.get('/data/manifest.json')).json();
  for (let n = 0; n < 256; n++) {
    const r = await page.request.get(`/data/gpu/model/${String(n).padStart(3, '0')}.json?v=${builtAt}`);
    const models = Object.values((await r.json()).models as Record<string, { slug: string; chip: string }>);
    if (models.length) return models[0];
  }
  throw new Error('no gpu model in any chunk');
}

for (const [name, size] of [['360', { width: 360, height: 740 }], ['1366', { width: 1366, height: 800 }]] as const) {
  test.describe(`at ${name} px`, () => {
    test.use({ viewport: size });
    const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

    test('a current slug shows the model name', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const m = await aModel(page);
      await page.goto(`/gpu/${m.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.chip, { timeout: 20_000 });
      await expect(page.locator('nav[aria-label] a[href="/gpu"]').first()).toBeAttached();
      expect(await noOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('an unknown slug says no longer available, with a link to the category', async ({ page }) => {
      await page.goto('/gpu/no-such-card-1234gb');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/δεν είναι πια διαθέσιμο|no longer available/, { timeout: 20_000 });
      const link = page.locator('main a[href="/gpu"]').last();
      await expect(link).toBeVisible();
      if (size.width < 1024) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44); // tap targets on touch sizes
      expect(await noOverflow(page)).toBe(true);
      await link.click();
      await expect(page).toHaveURL(/\/gpu$/);
    });

    test('a path that is not /<category>/<slug> is still the 404 page', async ({ page }) => {
      await page.goto('/gpu/a/b');
      await expect(page.getByText('404', { exact: true })).toBeVisible();
      await page.goto('/nonsense/page');
      await expect(page.getByText('404', { exact: true })).toBeVisible();
    });
  });
}
