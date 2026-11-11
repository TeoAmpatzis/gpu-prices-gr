// Regression tests for the 2026-11-10 audit (docs/audits/full-system-audit): P2-001, P2-002, P2-003.
import { describe, expect, it } from 'vitest';
import { dualChannelFirst } from '../../src/lib/autoBuild';
import { saleOf, type Model } from '../../src/lib/data';
import { HOME_MAX_DROP, homeFile } from '../../src/lib/homeFile';
import type { BuilderFiles } from '../../src/lib/derive';
import type { AutoFile, BaseListing, Latest, ModelChunk, ModelEntry } from '../../src/types';

describe('P2-001: a deal of exactly 7% is shown', () => {
  const at = (price: number) => ({ source: 'skroutz', price, dealPct: 7, dealRef: 100 }) as BaseListing;
  it('93 against 100 is a deal, 93.01 is not, a dearer offer of the model is not', () => {
    expect(saleOf([], at(93))).toEqual({ pct: 7, source: 'skroutz', reference: 100 });
    expect(saleOf([], at(93.01))).toBeNull();
    expect(saleOf([], at(99))).toBeNull();
  });
  it('the real case of the audit: 339.58 against 366.14', () => {
    expect(saleOf([], { source: 'skroutz', price: 339.58, dealPct: 7, dealRef: 366.14 } as BaseListing)?.pct).toBe(7);
  });
});

describe('P2-002: the homepage leaves out implausible drops', () => {
  const now = Date.parse('2026-11-04T12:00:00Z');
  const at = new Date(now).toISOString();
  const auto = { v: 1, builtAt: at, grid: { from: 700, to: 2500, step: 50 }, slots: [], keys: [], builds: [], uses: {}, min: {} } as unknown as AutoFile;
  const feed = (price: number) => {
    const listing = { id: 'one', source: 'skroutz', price, title: 'Product', chip: 'Family', scrapedAt: at, shipping: null, dealPct: 100 - price, dealRef: 100 } as BaseListing;
    const latest = { updatedAt: at, sources: { skroutz: { count: 1, ok: true, updatedAt: at } }, listings: [listing] } as Latest;
    const entry = { key: 'family', slug: 'family', chip: 'Family', listings: [listing], history: [] as ModelEntry['history'] } as ModelEntry;
    const chunks = [{ v: 1, builtAt: at, sources: {}, models: { family: entry } }] as ModelChunk[];
    return homeFile({ gpu: latest }, { gpu: chunks }, auto, {} as BuilderFiles['slots'], at).deals;
  };
  it(`a ${HOME_MAX_DROP}% drop is listed, a larger one is not`, () => {
    expect(feed(100 - HOME_MAX_DROP)).toHaveLength(1);
    expect(feed(100 - HOME_MAX_DROP - 2)).toEqual([]);
    expect(feed(2)).toEqual([]);
  });
});

describe('P2-003: dual-channel memory is preferred only at a small extra cost', () => {
  const kit = (key: string, price: number, capacity: number, modules: number) =>
    ({ key, chip: key, cheapest: { price, capacity, modules }, listings: [] }) as unknown as Model<never>;
  it('the audit case: 1×16GB at 220.87 stays ahead of 2×24GB at 645.30', () => {
    const order = dualChannelFirst([kit('1x16', 220.87, 16, 1), kit('2x24', 645.3, 48, 2), kit('2x32', 829, 64, 2)]);
    expect(order.map((m) => m.key)).toEqual(['1x16', '2x24', '2x32']);
  });
  it('a 2-module kit within 15% of the cheapest price still comes first', () => {
    const order = dualChannelFirst([kit('1x16', 50, 16, 1), kit('2x8', 55, 16, 2)]);
    expect(order.map((m) => m.key)).toEqual(['2x8', '1x16']);
  });
});
