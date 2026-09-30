// Mirror of the JSON written by scraper/main.py (see scraper/models.py).

export type Category = 'gpu' | 'cpu' | 'mobo' | 'ram' | 'psu' | 'case' | 'fan' | 'cooler';
export type Brand = 'NVIDIA' | 'AMD' | 'Intel';
export type BoardSize = 'E-ATX' | 'ATX' | 'Micro ATX' | 'Mini ITX';
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
  // Best price + delivery across the product's shops (scraper/shipping.py); VAT is always included.
  // null = not known (not checked yet, or the shop doesn't publish its fee); absent in older data.
  shipping?: number | null;
  total?: number | null;
  merchant?: string | null; // shop with that best total
}

export interface GpuListing extends BaseListing {
  brand: Brand;
  vram: number;
  partner: string;
  memType?: string | null; // "GDDR7", "GDDR6X"…
}

export interface CpuListing extends BaseListing {
  brand: Exclude<Brand, 'NVIDIA'>;
  cores: number | null;
  socket: string | null; // e.g. "AM5", "LGA1851"
  packaging?: 'Box' | 'Tray' | null;
  igpu?: boolean; // integrated graphics
}

export interface MoboListing extends BaseListing {
  brand: string; // vendor, e.g. "Asus"
  chip: string; // vendor + board name, e.g. "Asus TUF Gaming B850-Plus WiFi"
  chipset: string | null; // e.g. "B850", "X870E"; null for boards without one in the name (server)
  socket: string | null; // e.g. "AM5", "LGA1851"
  formFactor: BoardSize | 'Άλλο';
  memory: 'DDR4' | 'DDR5' | null; // null = unknown (LGA1700 boards come in both)
  wifi: boolean;
  ramSlots?: number | null;
}

export interface RamListing extends BaseListing {
  brand: string; // vendor, e.g. "Kingston"
  chip: string; // kit spec, e.g. "DDR5 32GB (2×16GB) 6000MHz"
  type: 'DDR2' | 'DDR3' | 'DDR4' | 'DDR5';
  capacity: number; // total GB
  modules: number;
  speed: number | null; // MHz
  cas?: number | null; // CAS latency (CL)
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
  maxBoard?: BoardSize | null; // largest motherboard it takes, if stated
}

export interface FanListing extends BaseListing {
  brand: string; // vendor
  chip: string; // vendor + model + size (+ pack), e.g. "Arctic P12 Pro 120mm ×3"
  size: number; // mm
  pack: number; // fans in the box
  rgb: boolean;
  pwm?: boolean;
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
