// Audit P3-009: without JavaScript every address answers with its own title and preview tags, and a product that is
// no longer sold tells crawlers not to index it.
import { expect, test } from '@playwright/test';

// The files are read by their own path: the local preview server answers a clean address (/gpu) with index.html,
// while the host serves a folder's index.html there (checked on the live site after a deploy).
test('the raw HTML of a category and of a product carries its own title, canonical and preview tags', async ({ request }) => {
  const home = await (await request.get('/')).text();
  const cat = await (await request.get('/gpu/index.html')).text();
  expect(cat).toContain('<link rel="canonical" href="https://gpu-prices-gr.vercel.app/gpu" />');
  expect(cat.match(/<title>[^<]*<\/title>/)![0]).not.toBe(home.match(/<title>[^<]*<\/title>/)![0]);

  const sitemap = await (await request.get('/sitemap-gpu.xml')).text();
  const path = new URL(sitemap.match(/<loc>([^<]+\/gpu\/[^<]+)<\/loc>/)![1]).pathname;
  const res = await request.get(path + '/index.html');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain(`<link rel="canonical" href="https://gpu-prices-gr.vercel.app${path}" />`);
  expect(html).toContain(`<meta property="og:url" content="https://gpu-prices-gr.vercel.app${path}" />`);
  expect(html).toMatch(/<meta name="description" content="[^"]*χαμηλότερη τιμή/);
});

test('a per-address page starts the app like index.html does', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap-gpu.xml')).text();
  const path = new URL(sitemap.match(/<loc>([^<]+\/gpu\/[^<]+)<\/loc>/)![1]).pathname;
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('a product that is no longer sold is marked noindex, and the mark goes away on the next page', async ({ page }) => {
  await page.goto('/gpu/no-such-model-xyz');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex', { timeout: 20_000 });
  await page.locator('header a[href="/builder"]').first().click();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
