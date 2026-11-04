import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CATEGORIES, type CategoryConfig } from '../../src/lib/categories';
import { groupModels, ownTotal } from '../../src/lib/data';
import type { BaseListing, ModelEntry } from '../../src/types';
import { ProductHeader } from '../../src/components/product/ProductHeader';
import { PriceHistory } from '../../src/components/product/PriceHistory';
import { BuildFitSection } from '../../src/components/product/BuildFit';
import type { ModelFit } from '../../src/components/product/fitUi';

vi.mock('../../src/lib/i18n', async (original) => ({ ...await original<typeof import('../../src/lib/i18n')>(), useLang: () => 'en' }));

const listing = { id: 'selected', source: 'skroutz', title: 'Exact long card', chip: 'RTX 5070', brand: 'NVIDIA', vram: 12, price: 650, shipping: null, total: null, merchant: null, url: 'https://www.skroutz.gr/s/selected', scrapedAt: '2026-11-04T00:00:00Z', shopCount: null } as BaseListing;
const cfg = CATEGORIES.gpu as unknown as CategoryConfig<BaseListing>;
const model = groupModels([ownTotal(listing)], cfg)[0];

describe('product evidence presentation', () => {
  it('does not claim a fit verdict for a selected listing excluded from the builder', () => {
    const fit = { stored: { parts: {} }, main: { key: 'unsupported', offered: false }, status: 'ready', build: [{}], missing: [], unchecked: [], cands: [], candidate: () => ({ offered: false }), view: () => ({ state: 'fits', findings: [], notes: [] }), action: () => ({ kind: 'add' }) } as unknown as ModelFit;
    const html = renderToStaticMarkup(createElement(BuildFitSection, { fit, slot: 'gpu', add: () => {}, selection: { source: 'skroutz', id: 'selected' } }));
    expect(html).toContain('Not offered in the PC Builder');
    expect(html).not.toContain('>Fits<');
    expect(html).not.toContain('Checked against your build');
  });
  it('names family imagery even when only one selected listing feeds its specifications', () => {
    const html = renderToStaticMarkup(createElement(ProductHeader, { cfg, model: { ...model, chip: listing.title }, photo: true, cheapest: listing }));
    expect(html).toContain('Family example photo');
    expect(html).toContain('href="https://www.skroutz.gr/s/selected"');
    expect(html).toContain('Shipping: unknown');
    expect(html).not.toContain('free shipping');
  });

  it('identifies history and its median as family evidence rather than selected-product prices', () => {
    const entry = { chip: 'RTX 5070', history: [], imported: null } as unknown as ModelEntry;
    const html = renderToStaticMarkup(createElement(PriceHistory, { entry }));
    expect(html).toContain('Family price history');
    expect(html).toContain('not the selected listing');
    expect(html).toContain('without shipping');
    expect(html).toContain('data-range="90"');
    expect(html).toContain('data-range="365"');
  });
});

