// Mirror of the JSON written by scraper/main.py (see scraper/models.py).

export type Brand = 'NVIDIA' | 'AMD' | 'Intel';
export type SourceName = 'skroutz' | 'bestprice';

export interface Listing {
  id: string;
  source: SourceName;
  title: string;
  url: string;
  price: number;
  shopCount: number | null;
  brand: Brand;
  chip: string;
  vram: number;
  partner: string;
  scrapedAt: string;
}

export interface SourceMeta {
  count: number;
  ok: boolean;
  updatedAt: string | null;
}

export interface Latest {
  updatedAt: string;
  sources: Partial<Record<SourceName, SourceMeta>>;
  listings: Listing[];
}

export interface HistoryPoint {
  d: string; // YYYY-MM-DD
  min: number;
  source: SourceName;
}

/** Keyed by model, e.g. "RTX 5060 Ti 16GB". */
export type History = Record<string, HistoryPoint[]>;
