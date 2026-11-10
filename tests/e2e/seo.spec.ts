import { expect, test } from '@playwright/test';

import { PUBLISHED as CATS } from './published';

test('every category page has its own description and canonical', async ({ page }) => {
  const seen = new Set<string>();
  for (const c of CATS) {
    await page.goto(`/${c}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${c}$`));
    seen.add((await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
  }
  expect(seen.size).toBe(CATS.length);
});

test('a model page has Product JSON-LD with lowPrice', async ({ page }) => {
  await page.goto('/gpu');
  const href = await page.locator('a[href^="/gpu/"]').first().getAttribute('href');
  await page.goto(href!);
  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);
  const json = JSON.parse((await ld.textContent())!);
  expect(json['@type']).toBe('Product');
  expect(json.offers.lowPrice).toBeGreaterThan(0);
  expect(json.offers.offerCount).toBeGreaterThan(0);
});

test('sitemap.xml is XML and robots.txt points at it', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('<sitemapindex');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  expect(await (await request.get('/sitemap-gpu.xml')).text()).toContain('<urlset');
});
