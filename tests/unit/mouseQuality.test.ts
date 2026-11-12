// Mouse derived data (plan Task 8): the list file keeps every filter field (colour too) and leaves out the part
// number, the model chunks keep both, colours share one model / slug / photo, and a built but unpublished mouse
// category stays out of search and the publishing check still guards it.
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

// Built, not published: the state mice are in between the first data review and the release.
vi.mock('../../src/lib/registry', async (original) => {
  const real = await original<typeof import('../../src/lib/registry')>();
  return { ...real, REGISTRY: { ...real.REGISTRY, mouse: { ...real.REGISTRY.mouse, enabled: true, visible: false } } };
});

const { CATEGORIES, CATEGORY_IDS } = await import('../../src/lib/categories');
const { decodeList } = await import('../../src/lib/data');
const { checkData, listFile, MIN_MODELS, modelChunks, searchFile } = await import('../../src/lib/derive');
const { photoId } = await import('../../src/lib/images');
const { slotOf } = await import('../../src/lib/pick');
const { SLOTS } = await import('../../src/lib/slots');
import type { CategoryInput } from '../../src/lib/derive';
import type { Latest, Manifest, MouseListing } from '../../src/types';

const AT = '2026-11-12T06:00:00Z';
let n = 0;
const mouse = (o: Partial<MouseListing>): MouseListing => ({
  id: `bestprice:${++n}`, source: 'bestprice', title: 'Acme One Ασύρματο Ποντίκι', url: `https://x/${n}`, price: 20, shopCount: 2,
  brand: 'Acme', chip: 'Acme One Wireless', scrapedAt: AT,
  connection: 'wireless', dpi: 1600, pollingHz: null, buttons: 3, rgb: null, gaming: false, bluetooth: true, rf: null,
  rechargeable: null, ergonomic: null, silent: true, colour: null, partNumber: null,
  ...o,
});
const black = mouse({ colour: 'black', price: 25, partNumber: '910-000001' });
const white = mouse({ colour: 'white', price: 22, partNumber: '910-000002', source: 'snif', id: 'snif:9' });
const wired = mouse({ chip: 'Acme One Wired', connection: 'wired', colour: 'black', price: 12 });
const input = (): CategoryInput => ({
  latest: { updatedAt: AT, sources: { bestprice: { ok: true, count: 2, updatedAt: AT }, snif: { ok: true, count: 1, updatedAt: AT } }, listings: [black, white, wired] } as Latest<MouseListing>,
  history: {},
  imported: {},
});
const key = (l: MouseListing) => CATEGORIES.mouse.modelKey(l);

describe('mouse derived data', () => {
  it('the list file keeps the filter fields and colour, and leaves the part number to the model chunks', () => {
    const list = listFile('mouse', input(), AT);
    expect(list.cols).toContain('colour');
    expect(list.cols).not.toContain('partNumber');
    const rows = decodeList(JSON.parse(JSON.stringify(list))).latest.listings as unknown as MouseListing[];
    expect(rows.map((l) => l.colour)).toEqual(['black', 'white', 'black']);
    for (const field of ['connection', 'dpi', 'buttons', 'gaming', 'bluetooth', 'silent'] as const) {
      expect(rows.map((l) => l[field])).toEqual([black, white, wired].map((l) => l[field]));
    }
    expect(rows[0].rgb ?? null).toBeNull(); // not stated stays unknown through the columns
  });

  it('two colours are one model with one address and one photo; the wired version is another model', () => {
    expect(key(black)).toBe(key(white));
    expect(key(wired)).not.toBe(key(black));
    const entries = modelChunks('mouse', input(), AT).flatMap((c) => Object.values(c.models));
    expect(entries.map((e) => e.key).sort()).toEqual([key(wired), key(black)].sort());
    expect(new Set(entries.map((e) => e.slug)).size).toBe(2);
    const wireless = entries.find((e) => e.key === key(black))!;
    expect((wireless.listings as unknown as MouseListing[]).map((l) => [l.colour, l.partNumber]).sort()).toEqual([['black', '910-000001'], ['white', '910-000002']]);
    expect(wireless.parts).toBeNull();
    // The same id as scraper/images.py model_id: sha1("<cat>\0<model key>"), first 12 hex.
    expect(photoId('mouse', key(black))).toBe(createHash('sha1').update(`mouse\0${key(black)}`, 'utf8').digest('hex').slice(0, 12));
  });

  it('is never a builder part', () => {
    expect(slotOf('mouse')).toBeNull();
    expect(SLOTS as readonly string[]).not.toContain('mouse');
  });

  it('built but not published: no search entries', () => {
    expect(CATEGORY_IDS).toContain('mouse');
    expect(searchFile({ mouse: input().latest } as never, AT).cats.mouse).toBeUndefined();
  });

  it('the publishing check guards an enabled mouse category', () => {
    const only = (problems: string[]) => problems.filter((p) => p.startsWith('mouse:'));
    const manifest = (models: number, listings = models) => ({ builtAt: AT, cats: { mouse: { models, listings, historyPoints: models } }, builder: {} }) as unknown as Manifest;
    expect(MIN_MODELS.mouse).toBeGreaterThan(1);
    expect(only(checkData(manifest(0), null))).toEqual(['mouse: no listings']);
    expect(only(checkData({ builtAt: AT, cats: {}, builder: {} } as unknown as Manifest, null))).toEqual(['mouse: no listings']);
    expect(only(checkData(manifest(MIN_MODELS.mouse - 1), null))).toHaveLength(1);
    expect(only(checkData(manifest(MIN_MODELS.mouse), null))).toEqual([]);
    expect(only(checkData(manifest(650), manifest(1000))).length).toBeGreaterThan(0); // 35% fewer than the live site
    expect(only(checkData(manifest(750), manifest(1000)))).toEqual([]);
  });
});
