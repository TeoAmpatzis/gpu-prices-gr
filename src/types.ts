// Mirror of the JSON written by scraper/main.py (see scraper/models.py).

export type Category = 'gpu' | 'cpu';
export type Brand = 'NVIDIA' | 'AMD' | 'Intel';
export type SourceName = 'skroutz' | 'bestprice';

export interface BaseListing {
  id: string;
  source: SourceName;
  title: string;
  url: string;
  price: number;
  shopCount: number | null;
  brand: Brand;
  chip: string;
  scrapedAt: string;
}

export interface GpuListing extends BaseListing {
  vram: number;
  partner: string;
}

export interface CpuListing extends BaseListing {
  cores: number | null;
  socket: string | null; // e.g. "AM5", "LGA1851"
}

export interface SourceMeta {
  count: number;
  ok: boolean;
  updatedAt: string | null;
}

export interface Latest<L extends BaseListing = BaseListing> {
  updatedAt: string;
  sources: Partial<Record<SourceName, SourceMeta>>;
  listings: L[];
}

export interface HistoryPoint {
  d: string; // YYYY-MM-DD
  min: number;
  source: SourceName;
}

/** Keyed by model, e.g. "RTX 5060 Ti 16GB" or "Ryzen 7 9800X3D". */
export type History = Record<string, HistoryPoint[]>;
