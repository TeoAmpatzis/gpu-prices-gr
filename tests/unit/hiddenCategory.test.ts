import { describe, expect, it, vi } from 'vitest';

// A category that is built (enabled) but not published (visible false): the state monitors are in until Phase 3.
vi.mock('../../src/lib/registry', async (original) => {
  const real = await original<typeof import('../../src/lib/registry')>();
  return { ...real, REGISTRY: { ...real.REGISTRY, monitor: { ...real.REGISTRY.monitor, enabled: true, visible: false } } };
});

const { CATEGORY_IDS } = await import('../../src/lib/categories');
const { searchFile } = await import('../../src/lib/derive');

const listing = {
  id: 'bestprice:1', source: 'bestprice', title: 'Dell U2724DE 27"', url: 'https://x/1', price: 300, shopCount: null,
  brand: 'Dell', chip: 'Dell U2724DE', code: 'U2724DE', size: 27, height: 1440, width: 2560, hz: 120, panel: 'IPS',
  colour: null, revision: null, scrapedAt: '2026-11-08T00:00:00Z',
};

describe('a built but unpublished category', () => {
  it('is built, yet stays out of the search index', () => {
    expect(CATEGORY_IDS).toContain('monitor');
    const latest = { updatedAt: '2026-11-08T00:00:00Z', sources: {}, listings: [listing] };
    const file = searchFile({ monitor: latest } as never, '2026-11-08T00:00:00Z');
    expect(file.cats.monitor).toBeUndefined();
  });
});
