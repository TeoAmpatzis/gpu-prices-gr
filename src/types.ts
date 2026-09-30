// Mirror of the JSON written by scraper/main.py (see scraper/models.py).

export type Category = 'gpu' | 'cpu' | 'mobo' | 'ram' | 'psu' | 'case' | 'fan' | 'cooler';
export type Brand = 'NVIDIA' | 'AMD' | 'Intel';
export type SourceName = 'skroutz' | 'bestprice' | 'eshop';

export interface BaseListing {
  id: string;
  source: SourceName;
  title: string;
  url: string;
  price: number;
  shopCount: number | null;
  brand: string;
  chip: string;
  scrapedAt: string;
}

export interface GpuListing extends BaseListing {
  brand: Brand;
  vram: number;
  partner: string;
}

export interface CpuListing extends BaseListing {
  brand: Exclude<Brand, 'NVIDIA'>;
  cores: number | null;
  socket: string | null; // e.g. "AM5", "LGA1851"
}

export interface MoboListing extends BaseListing {
  brand: string; // vendor, e.g. "Asus"
  chip: string; // vendor + board name, e.g. "Asus TUF Gaming B850-Plus WiFi"
  chipset: string | null; // e.g. "B850", "X870E"; null for boards without one in the name (server)
  socket: string | null; // e.g. "AM5", "LGA1851"
  formFactor: 'ATX' | 'Micro ATX' | 'Mini ITX' | 'E-ATX' | 'Άλλο';
  memory: 'DDR4' | 'DDR5' | null; // null = unknown (LGA1700 boards come in both)
  wifi: boolean;
}

export interface RamListing extends BaseListing {
  brand: string; // vendor, e.g. "Kingston"
  chip: string; // kit spec, e.g. "DDR5 32GB (2×16GB) 6000MHz"
  type: 'DDR2' | 'DDR3' | 'DDR4' | 'DDR5';
  capacity: number; // total GB
  modules: number;
  speed: number | null; // MHz
  formFactor: 'Desktop' | 'Laptop' | 'Server';
}

export interface PsuListing extends BaseListing {
  brand: string; // vendor, e.g. "Corsair"
  chip: string; // spec, e.g. "850W Gold"
  watts: number;
  efficiency: 'Titanium' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Diamond' | 'Standard' | null; // null = not stated
  modular: 'Full' | 'Semi' | 'Non' | null; // null = unknown (BestPrice titles don't say)
  formFactor: 'ATX' | 'SFX' | 'TFX' | 'Flex';
}

export interface CaseListing extends BaseListing {
  brand: string; // vendor, e.g. "Lian Li"
  chip: string; // vendor + model without colour, e.g. "Lian Li O11 Vision Compact"
  size: 'Full Tower' | 'Midi Tower' | 'Mini Tower' | 'SFF / Cube' | 'Άλλο';
  window: boolean;
  rgb: boolean;
}

export interface FanListing extends BaseListing {
  brand: string; // vendor
  chip: string; // vendor + model + size (+ pack), e.g. "Arctic P12 Pro 120mm ×3"
  size: number; // mm
  pack: number; // fans in the box
  rgb: boolean;
}

export interface CoolerListing extends BaseListing {
  brand: string; // vendor
  chip: string; // vendor + model, e.g. "Arctic Liquid Freezer III Pro 360"
  type: 'Air' | 'AIO';
  radiator: number | null; // AIO radiator length in mm
  rgb: boolean;
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

/** Keyed by model, e.g. "RTX 5060 Ti 16GB", "Ryzen 7 9800X3D", "DDR5 32GB (2×16GB) 6000MHz Desktop". */
export type History = Record<string, HistoryPoint[]>;
