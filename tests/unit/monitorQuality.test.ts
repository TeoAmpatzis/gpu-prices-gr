import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/lib/categories';
import { MONITOR_RULES, OTHER } from '../../src/lib/categoryRules';
import { decodePhotos, modelKeys } from '../../src/lib/columns';
import { decodeList } from '../../src/lib/data';
import { listFile, modelChunks, searchFile, type CategoryInput, type ImageLookup } from '../../src/lib/derive';
import { photoId, productImage } from '../../src/lib/images';
import { modelChunkOf } from '../../src/lib/modelData';
import { slotOf } from '../../src/lib/pick';
import { REGISTRY } from '../../src/lib/registry';
import { SLOTS } from '../../src/lib/slots';
import { modelSlug, slugLookup } from '../../src/lib/slug';
import { specGroups } from '../../src/ui/specs';
import type { Category, Latest, MonitorListing, SourceName } from '../../src/types';

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
const BUILT_AT = '2026-11-10T18:00:00.000Z';
const SCRAPED_AT = '2026-11-10T17:00:00Z';

function settledFixture(id: string, price: number, extra: Partial<MonitorListing> = {}): MonitorListing {
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

function acceptedInput(): CategoryInput {
  const dell = settledFixture('bestprice:2163748774', 229.9, {
    gtin: '5397184999999',
    pgPanel: 'IPS',
    pgConnectors: ['HDMI', 'DisplayPort'],
    pgVesa: '100x100',
  });
  const samsung = settledFixture('snif:42403033', 179.5);
  // Post-staging monitor latest.json never carries rejected listings (scraper/main.py stage splits rejects into rejected.json).
  const latest: Latest<MonitorListing> = {
    updatedAt: SCRAPED_AT,
    sources: {
      bestprice: { ok: true, count: 1, updatedAt: SCRAPED_AT },
      snif: { ok: true, count: 1, updatedAt: SCRAPED_AT },
    },
    listings: [dell, samsung],
  };
  return {
    latest,
    history: {
      [dell.chip]: [{ d: '2026-11-09', min: 239.9, source: 'bestprice' }, { d: '2026-11-10', min: 229.9, source: 'bestprice' }],
      [samsung.chip]: [{ d: '2026-11-10', min: 179.5, source: 'snif' }],
    },
    imported: {},
  };
}

const pyPhotoId = (cat: string, key: string) => createHash('sha1').update(`${cat}\0${key}`, 'utf8').digest('hex').slice(0, 12);

describe('monitor quality TS derivation and photo contract', () => {
  it('derives list, model chunks and search entries for only the reviewed accepted fixture set', () => {
    const input = acceptedInput();
    const listings = input.latest.listings as MonitorListing[];
    const expectedIds = listings.map((l) => l.id);
    const expectedKeys = listings.map((l) => CATEGORIES.monitor.modelKey(l));
    const rejectedIds = new Set(CORPUS.filter((r) => r.expectedReject !== null).map((r) => r.id));

    const lookup: ImageLookup = (cat, key) => (cat === 'monitor' && key === expectedKeys[0] ? `monitor/${photoId(cat, key)}` : undefined);
    const list = listFile('monitor', input, BUILT_AT, lookup);
    const decoded = decodeList(list);
    expect(decoded.latest.listings.map((l) => l.id)).toEqual(expectedIds);
    for (const id of decoded.latest.listings.map((l) => l.id)) {
      expect(rejectedIds.has(id)).toBe(false);
    }
    expect(modelKeys(list)).toEqual([...expectedKeys].sort());

    const chunks = modelChunks('monitor', input, BUILT_AT, lookup);
    const entries = chunks.flatMap((c) => Object.values(c.models));
    expect(entries.map((e) => e.key).sort()).toEqual([...expectedKeys].sort());
    for (const listing of listings) {
      const slug = modelSlug('monitor', { key: listing.chip, chip: listing.chip, listings: [listing], cheapest: listing });
      const chunkIndex = modelChunkOf(slugLookup('monitor', slug));
      const entry = chunks[chunkIndex].models[slugLookup('monitor', slug)];
      expect(entry).toBeDefined();
      expect(entry.listings.map((l) => l.id)).toEqual([listing.id]);
      expect(entry.listings[0].url).toBe(listing.url);
      expect(entry.parts).toBeNull();
    }

    const search = searchFile({ monitor: input.latest }, BUILT_AT);
    expect(search.cats.monitor?.m).toEqual([
      ['Dell P2426HEB', 229.9],
      ['Samsung LS27FM500', 179.5],
    ]);
    expect(search.cats.monitor?.mk).toEqual(['Dell', 'Samsung']);
  });

  it('derives matching photo bitset, model chunk flags and 96/320 WebP paths with safe missing-photo fallback', () => {
    const input = acceptedInput();
    const [dell, samsung] = input.latest.listings as MonitorListing[];

    for (const key of [dell.chip, samsung.chip]) {
      expect(photoId('monitor', key)).toBe(pyPhotoId('monitor', key));
    }

    const onePhoto: ImageLookup = (cat, key) => (cat === 'monitor' && key === dell.chip ? `monitor/${photoId(cat, key)}` : undefined);
    const listOne = listFile('monitor', input, BUILT_AT, onePhoto);
    const hasOne = decodePhotos(listOne);
    expect([...hasOne]).toEqual([dell.chip]);

    const dellPhoto = productImage('monitor', dell.chip, hasOne.has(dell.chip));
    expect(dellPhoto).toEqual({ src: `/img/monitor/${photoId('monitor', dell.chip)}` });
    expect(`${dellPhoto!.src}-96.webp`).toBe(`/img/monitor/${pyPhotoId('monitor', dell.chip)}-96.webp`);
    expect(`${dellPhoto!.src}-320.webp`).toBe(`/img/monitor/${pyPhotoId('monitor', dell.chip)}-320.webp`);
    expect(productImage('monitor', samsung.chip, hasOne.has(samsung.chip))).toBeNull();

    const chunksOne = modelChunks('monitor', input, BUILT_AT, onePhoto);
    const byKeyOne = Object.fromEntries(chunksOne.flatMap((c) => Object.values(c.models)).map((e) => [e.key, e]));
    expect(byKeyOne[dell.chip].photo).toBe(true);
    expect(byKeyOne[samsung.chip].photo).toBe(false);

    const bothPhotos: ImageLookup = (cat, key) => `${cat}/${photoId(cat, key)}`;
    const hasBoth = decodePhotos(listFile('monitor', input, BUILT_AT, bothPhotos));
    expect([...hasBoth].sort()).toEqual([dell.chip, samsung.chip].sort());
    const byKeyBoth = Object.fromEntries(
      modelChunks('monitor', input, BUILT_AT, bothPhotos)
        .flatMap((c) => Object.values(c.models))
        .map((e) => [e.key, e]),
    );
    expect(byKeyBoth[dell.chip].photo).toBe(true);
    expect(byKeyBoth[samsung.chip].photo).toBe(true);

    const noPhotos = decodePhotos(listFile('monitor', input, BUILT_AT));
    expect(noPhotos.size).toBe(0);
    expect(productImage('monitor', dell.chip, noPhotos.has(dell.chip))).toBeNull();
  });

  it('omits raw image URLs and page cache payloads from list columns, keeps unknown specs unmatched, and has no builder slot', () => {
    const input = acceptedInput();
    const list = listFile('monitor', input, BUILT_AT);

    for (const omitted of ['url', 'scrapedAt', 'image', 'photoSku', 'gtin', 'pgPanel', 'pgConnectors', 'pgVesa', 'reject', 'code', 'width', 'colour', 'revision']) {
      expect(list.cols).not.toContain(omitted);
    }

    const unknownSizeMonitor = settledFixture('skroutz:68482111', 99);
    const totallyUnknownMonitor: MonitorListing = {
      ...unknownSizeMonitor,
      size: null,
      height: null,
      width: null,
      hz: null,
      panel: null,
    };
    expect(MONITOR_RULES.group(unknownSizeMonitor)).toBe(OTHER);
    expect(MONITOR_RULES.group(totallyUnknownMonitor)).toBe(OTHER);
    const hzFilter = MONITOR_RULES.extraFilters.find((f) => f.key === 'hz')!;
    const resFilter = MONITOR_RULES.extraFilters.find((f) => f.key === 'res')!;
    const panelFilter = MONITOR_RULES.extraFilters.find((f) => f.key === 'panel')!;
    expect(hzFilter.test(unknownSizeMonitor, '60')).toBe(false);
    expect(resFilter.test(totallyUnknownMonitor, 'fhd')).toBe(false);
    expect(panelFilter.test(totallyUnknownMonitor, 'ips')).toBe(false);
    expect(specGroups('monitor', [totallyUnknownMonitor], 'en')).toEqual([]);

    expect(slotOf('monitor')).toBeNull();
    expect('builderSlot' in REGISTRY.monitor).toBe(false);
    expect((SLOTS as readonly Category[]).includes('monitor')).toBe(false);
  });
});
