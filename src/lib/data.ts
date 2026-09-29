import type { Brand, History, Latest, Listing, SourceName } from '../types';

export async function loadData(): Promise<{ latest: Latest; history: History }> {
  const [latest, history] = await Promise.all([
    fetch('/data/latest.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`latest.json: HTTP ${r.status}`);
      return r.json() as Promise<Latest>;
    }),
    fetch('/data/history.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<History>) : {}))
      .catch(() => ({})),
  ]);
  return { latest, history };
}

/** Same key as scraper/main.py model_key(). */
export const modelKey = (l: Pick<Listing, 'chip' | 'vram'>) => `${l.chip} ${l.vram}GB`;

const WORKSTATION = /^(RTX PRO |RTX A\d|T\d|RTX \d{4} (Ada|\(Pro\)))/;
export const isWorkstation = (chip: string) => WORKSTATION.test(chip);

export interface Model {
  key: string;
  chip: string;
  brand: Brand;
  vram: number;
  workstation: boolean;
  listings: Listing[]; // sorted by price ascending
  cheapest: Listing;
  maxPrice: number;
}

export function groupModels(listings: Listing[]): Model[] {
  const map = new Map<string, Listing[]>();
  for (const l of listings) {
    const k = modelKey(l);
    const arr = map.get(k);
    if (arr) arr.push(l);
    else map.set(k, [l]);
  }
  return [...map.entries()].map(([key, ls]) => {
    ls.sort((a, b) => a.price - b.price);
    const first = ls[0];
    return {
      key,
      chip: first.chip,
      brand: first.brand,
      vram: first.vram,
      workstation: isWorkstation(first.chip),
      listings: ls,
      cheapest: first,
      maxPrice: ls[ls.length - 1].price,
    };
  });
}

export type SortKey = 'price-asc' | 'price-desc' | 'model' | 'offers';
export type Category = 'gaming' | 'workstation' | 'all';

export interface Filters {
  query: string;
  brands: Brand[];
  sources: SourceName[];
  category: Category;
  minVram: number;
  maxPrice: number | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  brands: ['NVIDIA', 'AMD', 'Intel'],
  sources: ['skroutz', 'bestprice'],
  category: 'gaming',
  minVram: 0,
  maxPrice: null,
  sort: 'model',
};

const BRAND_ORDER: Record<Brand, number> = { NVIDIA: 0, AMD: 1, Intel: 2 };

/** Rough "newer/higher tier first" ordering from the model number. */
function tierScore(chip: string): number {
  const n = Number(chip.match(/\d{3,4}/)?.[0] ?? 0);
  let score = n;
  if (/\bArc B/.test(chip)) score += 10000;
  if (/Ti Super|XTX/.test(chip)) score += 7;
  else if (/\bTi\b|XT\b/.test(chip)) score += 5;
  else if (/Super|GRE/.test(chip)) score += 3;
  return score;
}

export function applyFilters(all: Listing[], f: Filters): Model[] {
  const q = f.query.trim().toLowerCase();
  const listings = all.filter(
    (l) =>
      f.brands.includes(l.brand) &&
      f.sources.includes(l.source) &&
      l.vram >= f.minVram &&
      (!q || `${l.chip} ${l.title} ${l.partner}`.toLowerCase().includes(q)),
  );
  let models = groupModels(listings).filter(
    (m) =>
      (f.category === 'all' || (f.category === 'workstation') === m.workstation) &&
      (f.maxPrice == null || m.cheapest.price <= f.maxPrice),
  );
  const cmp: Record<SortKey, (a: Model, b: Model) => number> = {
    'price-asc': (a, b) => a.cheapest.price - b.cheapest.price,
    'price-desc': (a, b) => b.cheapest.price - a.cheapest.price,
    offers: (a, b) => b.listings.length - a.listings.length,
    model: (a, b) =>
      BRAND_ORDER[a.brand] - BRAND_ORDER[b.brand] ||
      tierScore(b.chip) - tierScore(a.chip) ||
      b.vram - a.vram,
  };
  models = models.sort(cmp[f.sort]);
  return models;
}

const eur = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });
export const formatPrice = (n: number) => eur.format(n);

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτά`;
  const h = Math.round(mins / 60);
  if (h < 48) return `πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`;
  return `πριν ${Math.round(h / 24)} μέρες`;
}
