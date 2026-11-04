import type { Category, SourceName } from '../types';
import type { Slot } from './slots';

export interface HomeDeal {
  href: string;
  name: string;
  source: SourceName;
  date: string;
  checkedAt: string;
  price: number;
  median: number;
  percent: number;
}
export interface HomeBuild {
  budget: number;
  resolution: '1080p' | '1440p' | '4k';
  available: boolean;
  parts: Partial<Record<Slot, string>>;
  labels: Partial<Record<Slot, string>>;
  fanQty: number;
  total: number | null;
  /** Additional shipping; null if any selected line does not state its shipping. */
  shipping: number | null;
  href: string;
}
export interface HomeFile {
  builtAt: string;
  categories: { id: Category; count: number; min: number | null }[];
  deals: HomeDeal[];
  builds: HomeBuild[];
}

/** Rechecked when rendering: an old generated file must not retain a fresh discount claim. */
export function dealIsFresh(deal: Pick<HomeDeal, 'date' | 'checkedAt'>, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deal.date)) return false;
  const day = Date.parse(`${deal.date}T00:00:00Z`);
  const checked = Date.parse(deal.checkedAt);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== deal.date || !Number.isFinite(checked)) return false;
  const today = Math.floor(now / 864e5) * 864e5;
  return day <= today && day >= today - 864e5 && checked <= now && now - checked <= 864e5;
}

let pending: Promise<HomeFile> | undefined;
/** Small post-paint feed. Failed requests are forgotten so Retry performs a real new request. */
export function loadHome(): Promise<HomeFile> {
  pending ??= fetch('/data/home.json').then(async (r) => {
    if (!r.ok) throw new Error(`home.json: HTTP ${r.status}`);
    return r.json() as Promise<HomeFile>;
  }).catch((error: unknown) => { pending = undefined; throw error; });
  return pending;
}
