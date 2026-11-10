import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { encodeRef, shareSearch, type CompareRef } from '../../src/lib/compare/refs';
import { CMP } from '../../src/lib/compare/strings';
import { detailFile, listFile, modelChunks, searchFile, type CategoryInput, type ImageLookup } from '../../src/lib/derive';
import { photoId } from '../../src/lib/images';
import { modelChunkOf, modelChunkPath } from '../../src/lib/modelData';
import { encodeOfferChoice } from '../../src/lib/productSelection';
import { modelSlug, slugLookup } from '../../src/lib/slug';
import { UI } from '../../src/ui/strings';
import type { Latest, MonitorListing, SourceName } from '../../src/types';

interface CorpusRow {
  id: string;
  source: string;
  title: string;
  evidenceUrl: string;
  expectedReject: string | null;
  expectedSettled?: Pick<
    MonitorListing,
    'brand' | 'chip' | 'code' | 'size' | 'height' | 'width' | 'hz' | 'panel' | 'colour' | 'revision'
  > & { reject: string | null };
}

const CORPUS = JSON.parse(readFileSync('scripts/checks/fixtures/monitor-quality.json', 'utf8')) as CorpusRow[];
const SCRAPED_AT = '2026-11-10T17:00:00Z';
// Genuine 8x8 lossless RGBA WebP encoded via Pillow so Chromium decodes naturalWidth === 8.
const TINY_WEBP = Buffer.from(
  'UklGRjwAAABXRUJQVlA4IDAAAAAwAgCdASoIAAgAAUAmJaACdLoB+AH4AARoAAD+4Ll/9g6YMuf4r3/rKr5Kj9swAAA=',
  'base64',
);

function acceptedListing(id: string, price: number, extra: Partial<MonitorListing> = {}): MonitorListing {
  const row = CORPUS.find((entry) => entry.id === id);
  if (!row || row.expectedReject !== null || !row.expectedSettled) {
    throw new Error(`Missing accepted expectedSettled fixture for ${id}`);
  }
  const s = row.expectedSettled;
  return {
    id: row.id,
    source: row.source as SourceName,
    title: row.title,
    url: row.evidenceUrl,
    price,
    shopCount: null,
    scrapedAt: SCRAPED_AT,
    brand: s.brand,
    chip: s.chip,
    code: s.code,
    size: s.size,
    height: s.height,
    width: s.width,
    hz: s.hz,
    panel: s.panel,
    colour: s.colour,
    revision: s.revision,
    ...extra,
  };
}

function buildMonitorFixtures() {
  const dell = acceptedListing('bestprice:2163748774', 229.9, {
    gtin: '5397184999999',
    pgPanel: 'IPS',
    pgConnectors: ['HDMI', 'DisplayPort'],
    pgVesa: '100x100',
  });
  const samsung = acceptedListing('snif:42403033', 179.5);
  const anmite = acceptedListing('skroutz:68482111', 299.0);
  const listings = [dell, samsung, anmite];
  const latest: Latest<MonitorListing> = {
    updatedAt: SCRAPED_AT,
    sources: {
      bestprice: { ok: true, count: 1, updatedAt: SCRAPED_AT },
      snif: { ok: true, count: 1, updatedAt: SCRAPED_AT },
      skroutz: { ok: true, count: 1, updatedAt: SCRAPED_AT },
    },
    listings,
  };
  const input: CategoryInput = {
    latest,
    history: {
      [dell.chip]: [{ d: '2026-11-09', min: 239.9, source: 'bestprice' }, { d: '2026-11-10', min: 229.9, source: 'bestprice' }],
      [samsung.chip]: [{ d: '2026-11-10', min: 179.5, source: 'snif' }],
      [anmite.chip]: [{ d: '2026-11-10', min: 299.0, source: 'skroutz' }],
    },
    imported: {},
  };
  const photoModels = new Set([dell.chip, samsung.chip]);
  const lookup: ImageLookup = (cat, key) => (cat === 'monitor' && photoModels.has(key) ? `monitor/${photoId(cat, key)}` : undefined);
  const slugOf = (l: MonitorListing) => modelSlug('monitor', { key: l.chip, chip: l.chip, listings: [l], cheapest: l });
  return { dell, samsung, anmite, listings, input, lookup, slugOf };
}

const EXCLUDED_EXAMPLES = CORPUS.filter((r) => r.expectedReject !== null).map((r) => ({
  id: r.id,
  title: r.title,
  token:
    r.id === 'bestprice:2164558621'
      ? 'ES916'
      : r.id === 'bestprice:2163855693'
        ? 'US88v1'
        : r.id === 'bestprice:225960199'
          ? '2495L'
          : r.title.split(/\s+/)[0],
}));

async function setupDeterministicRoutes(page: Page, fixtures: ReturnType<typeof buildMonitorFixtures>, abortedPhotoHash?: () => string | null) {
  const manifest = (await (await page.request.get('/data/manifest.json')).json()) as { builtAt: string };
  const builtAt = manifest.builtAt;
  const list = listFile('monitor', fixtures.input, builtAt, fixtures.lookup);
  const detail = detailFile(fixtures.input.latest);
  const chunks = modelChunks('monitor', fixtures.input, builtAt, fixtures.lookup);
  const search = searchFile({ monitor: fixtures.input.latest }, builtAt);
  const chunkByPath = new Map(chunks.map((c, idx) => [`/${modelChunkPath('monitor', idx)}`, c]));

  await page.route('**/data/monitor/list.v2.json*', (route) => route.fulfill({ json: list }));
  await page.route('**/data/monitor/detail.json*', (route) => route.fulfill({ json: detail }));
  await page.route(/\/data\/monitor\/model\/\d{3}\.json/, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const chunk = chunkByPath.get(pathname);
    return chunk ? route.fulfill({ json: chunk }) : route.fallback();
  });
  await page.route('**/data/search.json*', (route) => route.fulfill({ json: search }));
  await page.route('**/data/aliases.json*', (route) =>
    route.fulfill({ json: { v: 1, builtAt, cats: { monitor: [] } } }),
  );
  await page.route(/\/img\/monitor\/[a-f0-9]+-(?:96|320)\.webp$/, (route) => {
    const hash = abortedPhotoHash?.();
    if (hash && route.request().url().includes(`/img/monitor/${hash}-`)) {
      return route.abort('failed');
    }
    return route.fulfill({ status: 200, contentType: 'image/webp', body: TINY_WEBP });
  });
  return { builtAt };
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function pollLoadedImages(page: Page, selector: string, expectedCount: number) {
  const imgs = page.locator(selector);
  await expect(imgs).toHaveCount(expectedCount);
  const count = await imgs.count();
  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0)).toBe(true);
  }
}

async function filterDialogRoot(page: Page, width: number) {
  if (width >= 1024) return page.locator('.catalogue-sidebar');
  const trigger = page.locator('.catalogue-filter-button');
  await trigger.click();
  const dialog = page.locator('.catalogue-bottom-sheet[role="dialog"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function applyMobileFiltersIfOpen(page: Page, width: number) {
  if (width >= 1024) return;
  const dialog = page.locator('.catalogue-bottom-sheet[role="dialog"]');
  if (await dialog.isVisible()) {
    await dialog.locator('.ui-btn--primary').click();
    await expect(dialog).toBeHidden();
  }
}

const F = buildMonitorFixtures();
const REMOVED_SLUG = 'ocypus-sigma-es916';

for (const lang of ['el', 'en'] as const) {
  for (const width of [1440, 360] as const) {
    test.describe(`monitor quality (${lang}, ${width}px)`, () => {
      test.use({ viewport: { width, height: 900 } });

      test('sort, filters, excluded screens, product selection, compare and image fallbacks work cleanly', async ({ page }) => {
        const errors: string[] = [];
        const unexpectedRequests: string[] = [];
        let abortedHash: string | null = null;
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('request', (req) => {
          const url = new URL(req.url());
          if (url.pathname.includes(`/img/monitor/${photoId('monitor', F.anmite.chip)}`)) {
            unexpectedRequests.push(url.pathname);
          }
        });

        await setupDeterministicRoutes(page, F, () => abortedHash);
        await page.addInitScript((l) => localStorage.setItem('lang', l), lang);

        // 1. Cheapest list contains only accepted monitors; price-asc persists across reload; both table & cards work.
        await page.goto('/monitor');
        const rows = page.locator('[data-product-key]:visible');
        await expect(rows).toHaveCount(3, { timeout: 20_000 });
        await expectNoOverflow(page);

        if (width >= 1024) {
          await expect(page.locator('table.catalogue-table')).toBeVisible();
          await expect(page.locator('ul.catalogue-cards')).toHaveCount(0);
        } else {
          await expect(page.locator('ul.catalogue-cards')).toBeVisible();
          await expect(page.locator('table.catalogue-table')).toHaveCount(0);
        }

        const sort = page.locator('select.catalogue-sort:visible').first();
        await sort.selectOption('price-asc');
        await expect(page).toHaveURL(/sort=price-asc/);
        await expect
          .poll(() => rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-product-key'))))
          .toEqual([
            encodeOfferChoice(F.samsung),
            encodeOfferChoice(F.dell),
            encodeOfferChoice(F.anmite),
          ]);

        const mainText = await page.locator('main').innerText();
        for (const bad of EXCLUDED_EXAMPLES) {
          expect(mainText).not.toContain(bad.title);
          expect(mainText).not.toContain(bad.id);
        }
        expect(mainText).toContain('179');
        expect(mainText).toContain('229');
        expect(mainText).toContain('299');

        await page.reload();
        await expect(rows).toHaveCount(3, { timeout: 20_000 });
        await expect(page.locator('select.catalogue-sort:visible').first()).toHaveValue('price-asc');

        if (width >= 1024) {
          // Verify card view on desktop loads 320w product thumbnails without breaking layout.
          await page.getByRole('button', { name: UI.catalogueCards[lang] }).click();
          await expect(page.locator('ul.catalogue-cards [data-product-key]')).toHaveCount(3);
          await pollLoadedImages(page, 'ul.catalogue-cards img', 2);
          await expect(page.locator('ul.catalogue-cards svg').first()).toBeVisible();
          await expectNoOverflow(page);
          await page.getByRole('button', { name: UI.catalogueTable[lang] }).click();
          await pollLoadedImages(page, 'table.catalogue-table img', 2);
        } else {
          await pollLoadedImages(page, 'ul.catalogue-cards img', 2);
        }
        // Missing image-index entry (Anmite AW03) must never trigger a network image request.
        expect(unexpectedRequests).toEqual([]);

        // 2. Diagonal & brand filters narrow accurately, survive reload, and never match unknown size as a real bucket.
        let root = await filterDialogRoot(page, width);
        const diagonalSection = root.locator('details.catalogue-filter-section').first();
        await diagonalSection.locator('label.catalogue-filter-option', { hasText: '≤24"' }).locator('input').check();
        await applyMobileFiltersIfOpen(page, width);
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(F.dell.title);
        await expect(rows.first()).not.toContainText(F.anmite.title);
        await expectNoOverflow(page);

        await page.reload();
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(F.dell.title);

        // Also check 25–27" bucket excludes both 23.8" Dell and unknown-size Anmite AW03.
        await page.goto('/monitor');
        await expect(rows).toHaveCount(3);
        root = await filterDialogRoot(page, width);
        await root.locator('details.catalogue-filter-section').first().locator('label.catalogue-filter-option', { hasText: '25–27"' }).locator('input').check();
        await applyMobileFiltersIfOpen(page, width);
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(F.samsung.title);

        // Brand filter (Samsung after resetting filters).
        await page.goto('/monitor');
        await expect(rows).toHaveCount(3);
        root = await filterDialogRoot(page, width);
        await root.locator('label.catalogue-filter-option', { hasText: 'Samsung' }).locator('input').check();
        await applyMobileFiltersIfOpen(page, width);
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(F.samsung.title);
        await page.reload();
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText(F.samsung.title);

        // Search in catalogue never returns excluded case screen ES916 or POS 2495L.
        for (const query of ['ES916', '2495L']) {
          await page.goto('/monitor');
          await expect(rows).toHaveCount(3);
          root = await filterDialogRoot(page, width);
          await root.locator('input[type="search"]').fill(query);
          await applyMobileFiltersIfOpen(page, width);
          await expect(rows).toHaveCount(0);
          await expect(page.locator('.catalogue-empty')).toBeVisible();
        }

        // Global header search must not return excluded products, while finding accepted Dell P2426HEB.
        if (width >= 1024) {
          const headerSearch = page.locator('header .header-search input[type="search"]:visible').first();
          await headerSearch.fill('ES916');
          await expect(page.locator('header [role="listbox"] [role="option"]')).toHaveCount(0);
          await headerSearch.fill('P2426HEB');
          await expect(page.locator('header [role="listbox"] [role="option"]', { hasText: 'Dell P2426HEB' })).toBeVisible();
          await headerSearch.fill('');
        } else {
          await page.locator('header button.ui-btn--icon').first().click();
          const dialogSearch = page.locator('header dialog[open] input[type="search"]');
          await dialogSearch.fill('ES916');
          await expect(page.locator('header dialog[open] [role="option"]')).toHaveCount(0);
          await dialogSearch.fill('P2426HEB');
          await expect(page.locator('header dialog[open] [role="option"]', { hasText: 'Dell P2426HEB' })).toBeVisible();
          await page.locator('header dialog[open] button').first().click();
        }

        // 3. Product page: exact selected listing, specs, shop link, eager 320w photo, and removed-model / removed-offer UX.
        await page.goto('/monitor?sort=price-asc');
        await expect(rows).toHaveCount(3);
        await rows.nth(1).locator('a[data-product-link]').click();
        const header = page.locator('[data-product-header]');
        await expect(header.getByRole('heading', { level: 1 })).toHaveText(F.dell.title);
        await expect(header).toContainText('23.8"');
        await expect(header).toContainText('1080p');
        await expect(header).toContainText('120');
        await expect(header).toContainText('IPS');
        await expect(header.locator('a[target="_blank"]')).toHaveAttribute('href', F.dell.url);
        await expect(page.locator('[data-spec-groups]')).toBeVisible();
        await expect(page.locator('[data-fit], [data-build-fit], #build-fit')).toHaveCount(0);
        await expect(header.locator('img')).toHaveAttribute('loading', 'eager');
        await expect(header.locator('img')).toHaveAttribute('src', new RegExp(`${photoId('monitor', F.dell.chip)}-320\\.webp$`));
        await pollLoadedImages(page, '[data-product-header] img', 1);
        await expectNoOverflow(page);

        // Anmite AW03 product page has photo=false -> category icon fallback, no <img>.
        const anmiteSlug = F.slugOf(F.anmite);
        expect(modelChunkOf(slugLookup('monitor', anmiteSlug))).toBeGreaterThanOrEqual(0);
        await page.goto(`/monitor/${anmiteSlug}`);
        await expect(page.locator('[data-product-header] h1')).toContainText(F.anmite.chip);
        await expect(page.locator('[data-product-header] img')).toHaveCount(0);
        await expect(page.locator('[data-product-header] .product-hero-photo svg')).toBeVisible();

        // Removed model URL shows "no longer available" with category link, never falling back to another monitor.
        await page.goto(`/monitor/${REMOVED_SLUG}`);
        await expect(page.locator('main h1:visible')).toHaveText(UI.goneTitle[lang]);
        await expect(page.locator('main a.ui-btn--primary[href="/monitor"]:visible')).toBeVisible();
        await expectNoOverflow(page);

        // Valid family URL with removed offer shows unavailable state cleanly, never silently picking another offer.
        const dellSlug = F.slugOf(F.dell);
        await page.goto(`/monitor/${dellSlug}?source=snif&offer=${encodeURIComponent('snif:99999999')}`);
        await expect(page.locator('[data-selection-unavailable]')).toBeVisible();
        await expect(page.locator('[data-product-header]')).toHaveCount(0);

        // 4. Compare flow: add two accepted monitors, open /compare, photos load, reload preserves, removed refs stay gone.
        await page.goto('/monitor?sort=price-asc');
        await expect(rows).toHaveCount(3);
        await rows.nth(0).locator('[data-compare-ref]').click();
        await rows.nth(1).locator('[data-compare-ref]').click();
        await expect(page.locator('[data-compare-tray]')).toBeVisible();
        await page.locator('[data-compare-open]').click();
        await expect(page).toHaveURL(/\/compare$/);
        await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
        await expect(page.locator('[data-compare-row="price:price"]')).toBeVisible();
        await expect(page.locator('[data-compare-table]')).toContainText(F.samsung.title);
        await expect(page.locator('[data-compare-table]')).toContainText(F.dell.title);
        await expect(page.locator('[data-compare-table]')).toContainText('179');
        await expect(page.locator('[data-compare-table]')).toContainText('229');
        await pollLoadedImages(page, '[data-compare-table] thead img', 2);
        await expectNoOverflow(page);

        await page.screenshot({
          path: `.superpowers/sdd/2026-11-10-monitor-quality-implementation/task7-compare-${lang}-${width}.png`,
          fullPage: true,
        });

        await page.reload();
        await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
        await pollLoadedImages(page, '[data-compare-table] thead img', 2);
        await expectNoOverflow(page);

        // Shared comparison containing a removed reference shows CMP.gone without crash or reassignment.
        const validRef: CompareRef = {
          cat: 'monitor',
          slug: dellSlug,
          selection: { source: F.dell.source, id: F.dell.id },
        };
        const removedModelRef: CompareRef = { cat: 'monitor', slug: REMOVED_SLUG };
        const removedOfferRef: CompareRef = {
          cat: 'monitor',
          slug: dellSlug,
          selection: { source: 'snif', id: 'snif:99999999' },
        };
        await page.goto(`/compare${shareSearch('monitor', [validRef, removedModelRef])}`);
        await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
        await expect(page.locator('[data-compare-table] thead th').nth(1)).toContainText(F.dell.title);
        await expect(page.locator('[data-compare-table] thead th').nth(2)).toContainText(CMP.gone[lang]);
        await expectNoOverflow(page);

        // Saved comparison containing both a valid ref and a removed offer renders CMP.gone for the removed column on reload.
        await page.evaluate(
          ([v, r]) => {
            localStorage.setItem(
              'bdCompare:v1',
              JSON.stringify({ v: 1, active: 'monitor', groups: { monitor: [v, r] } }),
            );
          },
          [encodeRef(validRef), encodeRef(removedOfferRef)] as const,
        );
        await page.goto('/compare');
        await expect(page.locator('[data-compare-table] thead th')).toHaveCount(3, { timeout: 20_000 });
        await expect(page.locator('[data-compare-table] thead th').nth(1)).toContainText(F.dell.title);
        await expect(page.locator('[data-compare-table] thead th').nth(2)).toContainText(CMP.gone[lang]);

        // 5. Deliberate photo network failure falls back to category icon in both catalogue rows and product header without pageerror or overflow.
        abortedHash = photoId('monitor', F.dell.chip);
        await page.goto('/monitor?sort=price-asc');
        await expect(rows).toHaveCount(3);
        // Samsung remains a loaded image; Dell falls back to icon SVG; Anmite has no photo index entry.
        await pollLoadedImages(page, '[data-product-key]:visible img', 1);
        await expect(rows.nth(1).locator('.catalogue-product-name img')).toHaveCount(0);
        await expect(rows.nth(1).locator('.catalogue-product-name span[aria-hidden="true"] svg')).toBeVisible();
        await expectNoOverflow(page);

        await page.goto(`/monitor/${dellSlug}?source=${F.dell.source}&offer=${encodeURIComponent(F.dell.id)}`);
        await expect(page.locator('[data-product-header] h1')).toHaveText(F.dell.title);
        await expect(page.locator('[data-product-header] img')).toHaveCount(0);
        await expect(page.locator('[data-product-header] .product-hero-photo svg')).toBeVisible();
        await expectNoOverflow(page);

        expect(errors).toEqual([]);
      });
    });
  }
}
