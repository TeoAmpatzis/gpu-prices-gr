// Build-only homepage derivation; never import this module from browser components.
import type { AutoFile, BaseListing, Category, Latest, ModelChunk } from '../types';
import { autoFor } from './autoPick';
import { fromColumns } from './columns';
import { slotModels } from './builderData';
import type { BuilderFiles } from './derive';
import { saleOf } from './data';
import { dealIsFresh, type HomeBuild, type HomeDeal, type HomeFile } from './homeData';
import { CATEGORY_LIST } from './routes';
import { encodeShare } from './share';
import { SLOTS, type Slot } from './slots';

/** A drop above this is far more often a wrong listing than a real price (a single listing has no peers for the suspect-price check). */
export const HOME_MAX_DROP = 60;

/** Uses already validated inputs, trusted model histories and the existing automatic outputs. */
export function homeFile(latest: Partial<Record<Category, Latest>>, chunks: Partial<Record<Category, ModelChunk[]>>, auto: AutoFile, slots: BuilderFiles['slots'], builtAt: string): HomeFile {
  const now = Date.parse(builtAt);
  const categories = CATEGORY_LIST.map((id) => {
    const rows = latest[id]?.listings ?? [];
    return { id, count: rows.length, min: rows.length ? Math.min(...rows.map((l) => l.price)) : null };
  });
  const deals: HomeDeal[] = [];
  for (const id of CATEGORY_LIST) for (const chunk of chunks[id] ?? []) for (const model of Object.values(chunk.models)) {
    // The same deal the list and product badges show (src/lib/deals.ts: 30-day typical price, decided at build time).
    const row = model.listings.reduce<BaseListing | undefined>((m, l) => (!m || l.price < m.price ? l : m), undefined);
    const sale = row && saleOf(model.listings, row);
    if (!row || !sale?.reference || sale.pct > HOME_MAX_DROP) continue;
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
