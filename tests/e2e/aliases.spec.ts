// Renamed models (step 5, task 1): the build writes /data/aliases.json from main's scraper/model_aliases.json, and an
// old product address is moved to the new one. Main's case/fan/cooler renames (Q6) are not in this branch's alias file
// yet, so the moved address uses a fixture file in the shape of a real Q6 entry (old key = the old slug's letters and
// digits) pointing at a real current cooler.
import { expect, test } from '@playwright/test';
import { PUBLISHED } from './published';

interface Entry {
  key: string;
  slug: string;
}

test('the build writes aliases.json from the alias file, and the first paint does not fetch it', async ({ page }) => {
  const r = await page.request.get('/data/aliases.json');
  expect(r.ok()).toBe(true);
  const file = await r.json();
  expect(file.v).toBe(1);
  expect(file.cats.ram.length).toBeGreaterThan(0);
  expect(Object.keys(file.cats).sort()).toEqual([...PUBLISHED].sort());

  const asked: string[] = [];
  page.on('request', (q) => asked.push(q.url()));
  await page.goto('/builder');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.goto('/gpu');
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(asked.filter((u) => u.includes('aliases.json'))).toEqual([]);
});

test('an old cooler address moves to the new one (fixture in the Q6 shape)', async ({ page }) => {
  const { builtAt } = await (await page.request.get('/data/manifest.json')).json();
  let cooler: Entry | undefined;
  for (let n = 0; n < 256 && !cooler; n++) {
    const c = await page.request.get(`/data/cooler/model/${String(n).padStart(3, '0')}.json?v=${builtAt}`);
    cooler = Object.values((await c.json()).models as Record<string, Entry>)[0];
  }
  if (!cooler) throw new Error('no cooler in any chunk');
  const target = cooler;
  await page.route('**/data/aliases.json*', (route) =>
    route.fulfill({
      json: {
        v: 1,
        builtAt,
        cats: {
          cooler: [{ oldKey: 'fixtureoldcooler120mm', oldSlug: 'fixtureoldcooler120mm', newKey: target.key, newSlug: target.slug }],
        },
      },
    }),
  );
  await page.goto('/cooler/fixture-old-cooler-120mm');
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/cooler/${target.slug}`);
  await expect(page.locator('main h1').first()).toBeVisible();
});
