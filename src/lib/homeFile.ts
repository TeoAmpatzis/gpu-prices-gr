// Build-only homepage derivation; never import this module from browser components.
import type { AutoFile, BaseListing, Category, Latest, ModelChunk } from '../types';
import { autoFor } from './autoPick';
import { rulesOf } from './categoryRules';
import { fromColumns } from './columns';
import { slotModels } from './builderData';
import type { BuilderFiles } from './derive';
import { saleOf } from './data';
import { dealIsFresh, type HomeBuild, type HomeDeal, type HomeFile } from './homeData';
import { CATEGORY_LIST } from './routes';
import { encodeShare } from './share';
import { SLOTS, type Slot } from './slots';

/** A drop above this is far more often a wrong listing than a real price (a single listing has no peers for the suspect-price check). */
export const HOME_MAX_DROP = 50;

/**
 * A home page drop must be one a visitor can check: a part of the category's default view (no workstation, server or
 * NAS parts) that a second listing confirms (the next offer is not more than twice the price).
 */
function confirmed(id: Category, row: BaseListing, listings: BaseListing[]): boolean {
  const rules = rulesOf(id);
  if (rules.isPro(row) || (rules.segmentOf?.(row) ?? 'main') !== 'main') return false;
  const next = listings.filter((l) => l !== row).reduce<number | null>((m, l) => (m == null || l.price < m ? l.price : m), null);
  return next != null && next <= row.price * 2;
}

/**
 * The "from €" of a category tile (audit P3-008): the lowest price in the category's default view (no workstation,
 * server or NAS parts), over models that two or more listings confirm. A price under half of the model's next offer
 * is taken as a wrong listing and the next offer counts instead.
 */
export function tileMin(id: Category, rows: BaseListing[]): number | null {
  const rules = rulesOf(id);
  const models = new Map<string, number[]>();
  for (const l of rows) {
    if (rules.isPro(l) || (rules.segmentOf?.(l) ?? 'main') !== 'main') continue;
    const key = rules.modelKey(l);
    models.set(key, [...(models.get(key) ?? []), l.price]);
  }
  let min: number | null = null;
  for (const prices of models.values()) {
    if (prices.length < 2) continue;
    const [first, second] = prices.sort((a, b) => a - b);
    const price = first * 2 < second ? second : first;
    if (min == null || price < min) min = price;
  }
  return min;
}
/** Uses already validated inputs, trusted model histories and the existing automatic outputs. */
export function homeFile(latest: Partial<Record<Category, Latest>>, chunks: Partial<Record<Category, ModelChunk[]>>, auto: AutoFile, slots: BuilderFiles['slots'], builtAt: string): HomeFile {
  const now = Date.parse(builtAt);
  const categories = CATEGORY_LIST.map((id) => {
    const rows = latest[id]?.listings ?? [];
    return { id, count: rows.length, min: tileMin(id, rows) };
  });
  const deals: HomeDeal[] = [];
  for (const id of CATEGORY_LIST) for (const chunk of chunks[id] ?? []) for (const model of Object.values(chunk.models)) {
    // The same deal the list and product badges show (src/lib/deals.ts: 30-day typical price, decided at build time).
    const row = model.listings.reduce<BaseListing | undefined>((m, l) => (!m || l.price < m.price ? l : m), undefined);
    const sale = row && saleOf(model.listings, row);
    if (!row || !sale?.reference || sale.pct > HOME_MAX_DROP || !confirmed(id, row, model.listings)) continue;
    const checkedAt = row.scrapedAt || latest[id]?.sources[row.source]?.updatedAt || '';
    const sourceAt = latest[id]?.sources[row.source]?.updatedAt || '';
    const date = checkedAt.slice(0, 10);
    if (!dealIsFresh({ date, checkedAt }, now) || !dealIsFresh({ date, checkedAt: sourceAt }, now)) continue;
    deals.push({ href: `/${id}/${model.slug}`, name: model.chip, source: row.source, date, checkedAt, price: row.price, median: sale.reference, percent: sale.pct });
  }
  deals.sort((a, b) => b.percent - a.percent || a.href.localeCompare(b.href));
  const rows = Object.fromEntries(SLOTS.map((slot) => [slot, slots[slot] ? slotModels(slot, fromColumns(slots[slot]) as never) : []]));
  const builds: HomeBuild[] = ([700, 1000, 1500, 2500] as const).map((budget) => {
    const resolution = budget <= 1000 ? '1080p' : budget === 1500 ? '1440p' : '4k';
    const choice = autoFor(auto, `gaming-${resolution}`, budget);
    const empty: HomeBuild = { budget, resolution, available: false, parts: {}, labels: {}, fanQty: 1, total: null, shipping: null, href: '/builder' };
    if (choice.kind !== 'build') return empty;
    const { build } = choice;
    const labels: HomeBuild['labels'] = {};
    let shipping: number | null = 0;
    for (const [slot, key] of Object.entries(build.parts) as [Slot, string][]) {
      const model = rows[slot]?.find((m) => m.key === key);
      if (!model) return empty;
      const row = model.cheapest;
      labels[slot] = row.title || model.chip;
      const fee = row.ship;
      if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) shipping = null;
      else if (shipping != null) shipping += fee * (slot === 'fan' ? build.fanQty : 1);
    }
    const parts = Object.fromEntries(Object.entries(build.parts).map(([s, key]) => [s, { key }]));
    const href = encodeShare({ parts, fanQty: build.fanQty, use: 'gaming', res: resolution, budget }, labels);
    return { budget, resolution, available: true, parts: build.parts, labels, fanQty: build.fanQty, total: build.total, shipping: shipping == null ? null : Math.round(shipping * 100) / 100, href };
  });
  return { builtAt, categories, deals: deals.slice(0, 5), builds };
}
