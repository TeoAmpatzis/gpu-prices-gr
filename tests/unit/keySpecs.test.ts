// Product page header's key specs (step 4, task 6, fix round 1): specs only, never a price; four when the category
// has that many, filled from the spec line after the table's columns.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { keySpecs, FILL, MIN_SPECS } from '../../src/components/product/keySpecs';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from '../../src/lib/categories';
import { groupModels, ownTotal } from '../../src/lib/data';
import type { Lang } from '../../src/lib/i18n';
import { specsOf } from '../../src/ui/specs';
import type { BaseListing, Category, CoolerListing, Latest } from '../../src/types';

const cfgOf = (cat: Category) => CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
const read = (cat: Category): Latest | null => {
  try {
    return validateLatest(cat, JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')), VALIDATION_MODE).latest;
  } catch {
    return null;
  }
};
/** The header labels of the columns that are not specs: worked out from a price, or the cheapest offer's maker. */
const notSpecs = (cat: Category, lang: Lang) =>
  [...cfgOf(cat).before, ...cfgOf(cat).after].filter((c) => c.fromPrice || c.maker).map((c) => (typeof c.header === 'string' ? c.header : c.header[lang]));

describe('key specs', () => {
  it('the price-derived and maker columns are marked (Cheapest from, €/TB, Per fan)', () => {
    expect(notSpecs('gpu', 'el')).toEqual(['Φθηνότερο από']);
    expect(notSpecs('ram', 'en')).toEqual(['Cheapest from']);
    expect(notSpecs('psu', 'en')).toEqual(['Cheapest from']);
    expect(notSpecs('storage', 'en')).toEqual(['€/TB']);
    expect(notSpecs('fan', 'el')).toEqual(['Ανά τεμάχιο']);
  });

  for (const cat of CATEGORY_IDS) {
    const latest = read(cat);
    if (!latest) continue;
    const cfg = cfgOf(cat);
    const models = groupModels(latest.listings.map(ownTotal), cfg)
      .sort((a, b) => b.listings.length - a.listings.length)
      .slice(0, 60);

    for (const lang of ['el', 'en'] as const) {
      it(`${cat} (${lang}): no price, no maker column, no "€" value; four specs when the category has them`, () => {
        const banned = notSpecs(cat, lang);
        let four = 0;
        for (const m of models) {
          const specs = keySpecs(cfg, m, lang);
          for (const s of specs) {
            expect(banned).not.toContain(s.label);
            expect(typeof s.value === 'string' ? s.value : '').not.toMatch(/€/);
            expect(s.value === '' || s.value === '—' || s.value == null).toBe(false);
          }
          expect(new Set(specs.map((s) => s.key)).size).toBe(specs.length);
          if (specs.length >= MIN_SPECS) four++;
        }
        // AIO coolers have three (Type names the radiator); every category reaches four on most popular models.
        expect(four).toBeGreaterThan(models.length / 2);
      });
    }

    it(`${cat}: fill entries exist in the spec line`, () => {
      expect(FILL[cat].every((i) => i === 'group' || i === 'rgb' || (Number.isInteger(i) && i >= 0 && i < 5))).toBe(true);
    });
  }

  it('storage: separate spec-line entries, no composite Type column; four on a drive whose data has them', () => {
    const latest = read('storage');
    if (!latest) return;
    const cfg = cfgOf('storage');
    const models = groupModels(latest.listings.map(ownTotal), cfg);
    let ssd = 0;
    let hdd = 0;
    for (const m of models) {
      const specs = keySpecs(cfg, m, 'el');
      const line = specsOf('storage', m.listings, 'el').filter((s) => s.value != null);
      expect(specs.length).toBe(line.length); // every stated spec, each its own entry
      expect(specs.map((s) => s.key).every((k) => k.startsWith('fill-'))).toBe(true); // no table column
      expect(specs.some((s) => typeof s.value === 'string' && s.value.includes(' · '))).toBe(false); // nothing composite
      if (specs.length >= MIN_SPECS) {
        if (specs[0].value === 'HDD') hdd++;
        else ssd++;
      }
    }
    expect(ssd).toBeGreaterThan(0);
    expect(hdd).toBeGreaterThan(0);
    // An HDD's labels read well: "RPM 7.200", "Cache 256 MB".
    const hddSpecs = models.map((m) => keySpecs(cfg, m, 'en')).find((s) => s.length >= MIN_SPECS && s[0].value === 'HDD')!;
    expect(hddSpecs.map((s) => s.label)).toEqual(['Type', 'Size', 'RPM', 'Cache']);
    expect(hddSpecs.every((s) => typeof s.value === 'string' && !/\b(rpm|cache)$/.test(s.value))).toBe(true);
  });

  it('coolers: an AIO shows its radiator once (in Type); air coolers keep their height; every cooler has RGB', () => {
    const latest = read('cooler');
    if (!latest) return;
    const cfg = cfgOf('cooler');
    const models = groupModels(latest.listings.map(ownTotal), cfg);
    let aio = 0;
    let air = 0;
    for (const m of models) {
      const specs = keySpecs(cfg, m, 'en');
      const labels = specs.map((s) => s.label);
      expect(labels).toContain('RGB');
      expect(['Yes', 'no RGB']).toContain(specs.find((s) => s.label === 'RGB')!.value);
      expect(labels).not.toContain('Radiator');
      if ((m.cheapest as CoolerListing).type === 'AIO') {
        aio++;
        expect(String(specs[0].value)).toMatch(/^AIO \d+mm$/);
      } else if (labels.includes('Height')) air++;
    }
    expect(aio).toBeGreaterThan(0);
    expect(air).toBeGreaterThan(0);
  });
});
