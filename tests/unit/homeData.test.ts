import { describe, expect, it } from 'vitest';
import { dealIsFresh } from '../../src/lib/homeData';
import { homeFile, tileMin } from '../../src/lib/homeFile';
import { CATEGORY_LIST } from '../../src/lib/routes';
import type { AutoFile, BaseListing, Latest, ModelChunk, ModelEntry } from '../../src/types';
import type { BuilderFiles } from '../../src/lib/derive';
import { decodeShare } from '../../src/lib/share';

const now = Date.parse('2026-11-04T12:00:00Z');
const at = new Date(now).toISOString();
const listing = { id: 'one', source: 'skroutz', price: 80, title: 'Exact product', chip: 'Family', scrapedAt: at, shipping: null } as BaseListing;
const latest = { updatedAt: at, sources: { skroutz: { count: 1, ok: true, updatedAt: at } }, listings: [listing] } as Latest;
const history = Array.from({ length: 40 }, (_, i) => ({ d: new Date(now - (39 - i) * 864e5).toISOString().slice(0, 10), min: i === 39 ? 80 : 100, source: 'skroutz' as const }));
const entry = { key: 'family', slug: 'family', chip: 'Family', listings: [listing], history } as ModelEntry;
const chunks = (entries: ModelEntry[]) => [{ v: 1, builtAt: at, sources: {}, models: Object.fromEntries(entries.map((e) => [e.slug, e])) }] as ModelChunk[];
const auto = { v: 1, builtAt: at, grid: { from: 700, to: 2500, step: 50 }, slots: ['cpu'], keys: ['CPU|true'], builds: [[1, 0, 650]], uses: { 'gaming-1080p': [0], 'gaming-1440p': [], 'gaming-4k': [] }, min: { 'gaming-1080p': 0, 'gaming-1440p': -1, 'gaming-4k': -1 } } as unknown as AutoFile;
const slots = { cpu: { v: 2, builtAt: at, cols: ['id', 'source', 'chip', 'price', 'title', 'coolerIncluded'], rows: [['cpu', 'skroutz', 'CPU', 650, 'CPU product', true]] } } as unknown as BuilderFiles['slots'];

describe('homepage derived feed', () => {
  it('requires trusted history from today or yesterday and source evidence no older than 24 hours', () => {
    expect(dealIsFresh({ date: '2026-11-03', checkedAt: '2026-11-03T12:00:00Z' }, now)).toBe(true);
    for (const date of ['2026-11-02', '2026-11-05', '2026-02-30', 'garbage']) expect(dealIsFresh({ date, checkedAt: at }, now)).toBe(false);
    for (const checkedAt of ['2026-11-03T11:59:59Z', '2026-11-04T12:00:01Z', '', 'garbage']) expect(dealIsFresh({ date: '2026-11-04', checkedAt }, now)).toBe(false);
  });

  it('counts source listings, gives one entry per published category, and never borrows a sibling minimum', () => {
    const file = homeFile({ gpu: { ...latest, listings: [listing, { ...listing, source: 'bestprice', price: 90 }] } }, { gpu: chunks([entry]) }, auto, slots, at);
    expect(file.categories.map((c) => c.id)).toEqual(CATEGORY_LIST);
    expect(file.categories.find((c) => c.id === 'gpu')).toMatchObject({ count: 2, min: 80 });
    expect(file.categories.find((c) => c.id === 'ram')).toMatchObject({ count: 0, min: null });
  });

  it('a tile minimum comes from the default view, two or more listings, and skips a price under half of the next offer', () => {
    const cpu = (chip: string, price: number, source = 'skroutz') => ({ ...listing, id: `${chip}-${source}-${price}`, chip, price, source }) as BaseListing;
    expect(tileMin('cpu', [cpu('Pentium G4560', 3.71), cpu('Pentium G4560', 60, 'bestprice'), cpu('Ryzen 5 5600', 95), cpu('Ryzen 5 5600', 99, 'bestprice')])).toBe(60);
    expect(tileMin('cpu', [cpu('Xeon E5-2620 v4', 14), cpu('Xeon E5-2620 v4', 20, 'bestprice'), cpu('Ryzen 5 5600', 95), cpu('Ryzen 5 5600', 99, 'bestprice')])).toBe(95);
    expect(tileMin('cpu', [cpu('Ryzen 5 5600', 95)])).toBeNull();
  });

  it('lists the deals the badges show (30-day reference), leaves out stale or dearer listings, and limits drops in stable order', () => {
    const deal = { ...listing, dealPct: 20, dealRef: 100 } as BaseListing;
    const entries = Array.from({ length: 7 }, (_, i) => ({ ...entry, listings: [deal], slug: `family-${i}`, key: `family-${i}` }));
    const file = homeFile({ gpu: latest }, { gpu: chunks(entries) }, auto, slots, at);
    expect(file.deals).toHaveLength(5);
    expect(file.deals.map((d) => d.href)).toEqual(entries.slice(0, 5).map((e) => `/gpu/${e.slug}`));
    expect(file.deals[0]).toMatchObject({ price: 80, median: 100, percent: 20, checkedAt: at, date: '2026-11-04' });
    for (const bad of [
      { ...entry, listings: [listing] }, // no deal decided by the build
      { ...entry, listings: [{ ...deal, scrapedAt: '2026-11-02T12:00:00Z' }] }, // not checked in the last 24 hours
      { ...entry, listings: [{ ...deal, price: 95 }] }, // the model is at a deal, this offer is not
      { ...entry, listings: [{ ...deal, price: 30 }] }, // an implausible drop
    ]) expect(homeFile({ gpu: latest }, { gpu: chunks([bad]) }, auto, slots, at).deals).toEqual([]);
  });

  it('reuses autoFor for all four budgets, keeps canonical keys, and discloses unknown shipping', () => {
    const file = homeFile({}, {}, auto, slots, at);
    expect(file.builds.map((b) => b.budget)).toEqual([700, 1000, 1500, 2500]);
    expect(file.builds[0]).toMatchObject({ available: true, total: 650, shipping: null, parts: { cpu: 'CPU|true' }, resolution: '1080p' });
    expect(decodeShare(new URL(file.builds[0].href, 'https://example.test').searchParams)?.build.parts.cpu?.key).toBe('CPU|true');
    expect(file.builds[2]).toMatchObject({ available: false, resolution: '1440p' });
    expect(file.builds[3]).toMatchObject({ available: false, resolution: '4k' });
  });

  it('reads known and free shipping from the normalized builder ship column', () => {
    for (const fee of [0, 7]) {
      const file = { ...slots, cpu: { ...slots.cpu, cols: [...slots.cpu.cols, 'ship', 'total'], rows: slots.cpu.rows.map((r) => [...r, fee, 650 + fee]) } };
      expect(homeFile({}, {}, auto, file, at).builds[0].shipping).toBe(fee);
    }
    const mixedAuto = { ...auto, slots: ['cpu', 'mobo'], keys: ['CPU|true', 'board'], builds: [[1, 0, 1, 650, 40]] } as AutoFile;
    const mixedSlots = { ...slots, cpu: { ...slots.cpu, cols: [...slots.cpu.cols, 'ship'], rows: slots.cpu.rows.map((r) => [...r, 5]) }, mobo: { v: 2, builtAt: at, cols: ['id', 'source', 'chip', 'price', 'ship'], rows: [['board', 'skroutz', 'Board', 40, null]] } } as BuilderFiles['slots'];
    expect(homeFile({}, {}, mixedAuto, mixedSlots, at).builds[0]).toMatchObject({ available: true, shipping: null });
  });
});
