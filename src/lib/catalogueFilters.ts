import type { BaseListing, DailyLow, Imported } from '../types';
import type { CategoryRules } from './categoryRules';
import type { CategoryConfig } from './categories';
import { filterModels, type Filters, type Model, allTimeLow, saleOf } from './data';
import { catalogueProducts, type CatalogueProduct } from './catalogueProducts';
import { recommendedScores } from './ranking';

export interface CatalogueRecord<L extends BaseListing> extends CatalogueProduct<L> {
  family: Model<L>;
}
/** Secondary ranges use only measurements present in the source contract. */
export const RANGE_FIELDS = {
  gpu: { field: 'lengthMm', label: { el: 'Μήκος (mm)', en: 'Length (mm)' } },
  cpu: { field: 'tdp', label: { el: 'TDP (W)', en: 'TDP (W)' } },
  ram: { field: 'speed', label: { el: 'Ταχύτητα (MT/s)', en: 'Speed (MT/s)' } },
  storage: {
    field: 'capacity',
    label: { el: 'Χωρητικότητα (GB)', en: 'Capacity (GB)' },
  },
  case: {
    field: 'gpuMaxMm',
    label: { el: 'Μέγιστο μήκος GPU (mm)', en: 'Maximum GPU length (mm)' },
  },
  psu: { field: 'watts', label: { el: 'Ισχύς (W)', en: 'Wattage (W)' } },
  cooler: {
    field: 'heightMm',
    label: { el: 'Ύψος αερόψυκτρας (mm)', en: 'Air cooler height (mm)' },
  },
} as const;

export const RANGE_UNITS: Record<string, string> = {
  gpu: 'mm',
  cpu: 'W',
  ram: 'MT/s',
  storage: 'GB',
  case: 'mm',
  psu: 'W',
  cooler: 'mm',
};
export function numericValue(l: BaseListing, cat: string): number | null {
  const range = RANGE_FIELDS[cat as keyof typeof RANGE_FIELDS];
  if (!range) return null;
  const value = (l as unknown as Record<string, unknown>)[range.field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
/** Family ranking/history remain family evidence; every price/spec/source gate is listing-local. */
export function filterCatalogue<L extends BaseListing>(
  all: L[],
  f: Filters,
  cfg: CategoryRules<L>,
  history: Record<string, DailyLow[]> = {},
  imported: Imported = {},
): CatalogueRecord<L>[] {
  const families = filterModels(all, { ...f, maxPrice: null, saleOnly: false, lowOnly: false }, cfg, history, imported);
  return families.flatMap((family) =>
    catalogueProducts(cfg.id, [family])
      .filter(({ listing: l }) => {
        if ((f.maxPrice != null && l.price > f.maxPrice) || (f.minPrice != null && l.price < f.minPrice)) return false;
        const v = numericValue(l, cfg.id);
        if (f.numericMin != null || f.numericMax != null) {
          if (v == null) {
            if (f.includeUnknown === false) return false;
          } else if ((f.numericMin != null && v < f.numericMin) || (f.numericMax != null && v > f.numericMax)) return false;
        }
        return (!f.saleOnly || saleOf([l], l) != null) && (!f.lowOnly || allTimeLow(history[family.key], imported[family.key], l.price) != null);
      })
      .map((p) => ({ ...p, family })),
  );
}
export function sortCatalogue<L extends BaseListing>(products: CatalogueRecord<L>[], f: Filters, cfg: CategoryConfig<L>): CatalogueRecord<L>[] {
  const families = [...new Map(products.map((p) => [p.familyKey, p.family])).values()];
  const scores = f.sort === 'model' ? recommendedScores(families, cfg.id, cfg.value) : new Map<string, number>();
  const ratio = (p: CatalogueRecord<L>) => {
    const tb = cfg.capacityTb?.(p.listing);
    return tb ? p.listing.price / tb : Infinity;
  };
  return products.sort((a, b) => {
    const price = a.listing.price - b.listing.price;
    if (f.sort === 'price-asc') return price || a.key.localeCompare(b.key);
    if (f.sort === 'price-desc') return -price || a.key.localeCompare(b.key);
    if (f.sort === 'per-tb') return ratio(a) - ratio(b) || price;
    if (f.sort === 'offers') return (b.listing.shopCount ?? 0) - (a.listing.shopCount ?? 0) || price;
    if (f.sort === 'discount') return (saleOf([b.listing], b.listing)?.pct ?? 0) - (saleOf([a.listing], a.listing)?.pct ?? 0) || price;
    return (
      Number(a.family.pro) - Number(b.family.pro) ||
      (scores.get(b.familyKey) ?? 0) - (scores.get(a.familyKey) ?? 0) ||
      cfg.tierScore(b.family) - cfg.tierScore(a.family) ||
      a.familyKey.localeCompare(b.familyKey) ||
      price
    );
  });
}
