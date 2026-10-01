// Faceted counts: for every filter option, how many models the page would show if it were picked,
// given all the *other* active filters (the option's own group is left out, as shops usually do).
// One applyFilters run per group (not per option), then the options are counted on its result.

import type { BaseListing, DailyLow, Imported, SourceName } from '../types';
import type { CategoryConfig } from './categories';
import { applyFilters, defaultFilters, type Filters, type Model, type Segment } from './data';
import { SOURCE_NAMES } from './sources';

export interface FacetCounts {
  groups: Record<string, number>;
  sources: Record<SourceName, number>;
  segment: Record<Segment, number>;
  sale: number;
  low: number;
  /** extra filter key → option value → count */
  extra: Record<string, Record<string, number>>;
}

export function facetCounts<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryConfig<L>,
  history: Record<string, DailyLow[]>,
  imported: Imported,
  /** Options of each extra filter (as shown in the sidebar). */
  options: Record<string, { value: string }[]>,
): FacetCounts {
  const d = defaultFilters(cfg.groups);
  const run = (without: Partial<Filters>) =>
    applyFilters(all, { ...f, ...without }, cfg, history, imported, { sort: false });
  // A listing counts for an option only if it would also pass the max-price filter.
  const withinPrice = (l: L) => f.maxPrice == null || l.price <= f.maxPrice;
  const countModels = (models: Model<L>[], test: (l: L) => boolean) =>
    models.reduce((n, m) => n + (m.listings.some((l) => test(l) && withinPrice(l)) ? 1 : 0), 0);

  const groupModels = run({ groups: d.groups });
  const groups = Object.fromEntries(cfg.groups.map((g) => [g, groupModels.filter((m) => m.group === g).length]));

  const sourceModels = run({ sources: d.sources });
  const sources = Object.fromEntries(
    SOURCE_NAMES.map((s) => [s, countModels(sourceModels, (l) => l.source === s)]),
  ) as Record<SourceName, number>;

  const segmentModels = run({ segment: 'all' });
  const pro = segmentModels.filter((m) => m.pro).length;
  const segment = { main: segmentModels.length - pro, pro, all: segmentModels.length };

  const sale = run({ saleOnly: false }).filter((m) => m.sale).length;
  const low = run({ lowOnly: false }).filter((m) => m.low).length;

  const extra: FacetCounts['extra'] = {};
  for (const x of cfg.extraFilters) {
    const models = run({ extra: { ...f.extra, [x.key]: '' } });
    extra[x.key] = Object.fromEntries(
      (options[x.key] ?? []).map((o) => [o.value, countModels(models, (l) => x.test(l, o.value))]),
    );
  }
  return { groups, sources, segment, sale, low, extra };
}
