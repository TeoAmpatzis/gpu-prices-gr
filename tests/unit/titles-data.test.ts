// C5 over today's data: no two offers of one model read the same in the expanded row unless their full titles are
// equal (final review, step 3). Same inputs as ModelRow: the model's listings, its name, the GPU word lists.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from '../../src/lib/categories';
import { groupModels } from '../../src/lib/data';
import { shortTitles, titleKey, titleOptions } from '../../src/lib/titles';
import type { BaseListing, Latest } from '../../src/types';

/**
 * Offers whose short title equals another offer's of the same model while the full titles differ in more than the
 * model's own words and spec words (`titleKey`: those removed, case and brackets ignored). Titles that differ only
 * there ("… 4GB GDDR6 ECO" / "… 4GB ECO") are the same offer text on purpose (C5).
 */
export function collisions(): { cat: string; model: string; short: string; titles: string[] }[] {
  const out: { cat: string; model: string; short: string; titles: string[] }[] = [];
  for (const cat of CATEGORY_IDS) {
    const latest = validateLatest(cat, JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')) as Latest, VALIDATION_MODE).latest;
    const models = groupModels(latest.listings as BaseListing[], CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>);
    for (const m of models) {
      const titles = m.listings.map((l) => l.title);
      const opts = titleOptions(cat);
      const shorts = shortTitles(titles, m.chip, opts);
      const by = new Map<string, Map<string, string>>();
      shorts.forEach((s, i) => by.set(s, (by.get(s) ?? new Map()).set(titleKey(titles[i], m.chip, opts), titles[i])));
      for (const [s, keys] of by) if (keys.size > 1) out.push({ cat, model: m.chip, short: s, titles: [...keys.values()] });
    }
  }
  return out;
}

describe('short titles over today\'s data', () => {
  it('no two offers of one model share a short title unless their full titles are equal', () => {
    const found = collisions();
    const offers = found.reduce((n, c) => n + c.titles.length, 0);
    console.log(`[titles] ${found.length} colliding short titles, ${offers} offers`);
    for (const c of found.slice(0, 12)) console.log(`  ${c.cat} ${c.model}: "${c.short}" <- ${c.titles.map((t) => `"${t}"`).join(' | ')}`);
    expect(found).toEqual([]);
  });
});

describe('RAM short titles', () => {
  it('no short title keeps a lone digit that is the "N Modules" count', () => {
    const bad: string[] = [];
    const latest = validateLatest('ram', JSON.parse(readFileSync('public/data/ram/latest.json', 'utf8')) as Latest, VALIDATION_MODE).latest;
    for (const m of groupModels(latest.listings as BaseListing[], CATEGORIES.ram as unknown as CategoryConfig<BaseListing>)) {
      if (m.listings.length < 2) continue; // a lone offer keeps its full title
      const titles = m.listings.map((l) => l.title);
      shortTitles(titles, m.chip, titleOptions('ram')).forEach((s, i) => {
        // A lone digit word left in the short title that, in the full title, is the count in "N Modules".
        const d = [...titles[i].matchAll(/(?<![\w×x])(\d)\s+modules?/gi)].map((x) => x[1]).find((x) => s.split(/\s+/).includes(x));
        if (d) bad.push(`${s} <- ${titles[i]}`);
      });
    }
    console.log(`[titles] RAM short titles keeping the Modules count: ${bad.length}`);
    for (const b of bad.slice(0, 8)) console.log('  ' + b);
    expect(bad).toEqual([]);
  });
});
