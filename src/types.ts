// Mirror of the JSON written by scraper/main.py (see scraper/models.py).

export type Category = 'gpu' | 'cpu' | 'mobo' | 'ram' | 'storage' | 'psu' | 'case' | 'fan' | 'cooler';
export type Brand = 'NVIDIA' | 'AMD' | 'Intel';
export type BoardSize = 'E-ATX' | 'ATX' | 'Micro ATX' | 'Mini ITX';
export type SourceName = 'skroutz' | 'bestprice' | 'eshop' | 'shopflix' | 'snif';

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
  drop?: number | null; // discount (%) the site itself shows for this offer
  img?: string | null; // builder.json rows only: the model's stored photo ("<cat>/<id>")
  pop?: number | null; // builder.json rows only: the model's popularity × POP_SCALE (src/lib/ranking.ts popularityRaw)
}

export interface GpuListing extends BaseListing {
  brand: Brand;
  vram: number;
  partner: string;
  memType?: string | null; // "GDDR7", "GDDR6X"…
  // From a product page (scraper/specs.py: Skroutz, BestPrice), shared with the same card on the other
  // sites (normalize.card_key); the safer value when sites disagree.
  lengthMm?: number | null;
  minPsu?: number | null; // card maker's minimum PSU watts
}

export interface CpuListing extends BaseListing {
  brand: Exclude<Brand, 'NVIDIA'>;
  cores: number | null;
  socket: string | null; // e.g. "AM5", "LGA1851"
  packaging?: 'Box' | 'Tray' | null;
  igpu?: boolean; // integrated graphics
  coolerIncluded?: boolean | null; // a cooler in the box; null = not stated
  tdp?: number | null; // W
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
  // From product pages (scraper/specs.py parse_mobo); not used by v1, so list.json leaves them out.
  m2Slots?: number | null;
  m2Gen?: number | null; // highest PCIe generation of its M.2 slots
  sataPorts?: number | null;
  maxMemoryGB?: number | null;
  biosFlashback?: boolean | null; // true when stated; null = not stated
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
  gpuMaxMm?: number | null; // longest graphics card it takes
  coolerMaxMm?: number | null; // tallest CPU air cooler it takes
  fanSlots?: number | null; // fan positions (front + rear + top + …)
  radiatorMounts?: string | null; // e.g. "Άνω, Κάτω, Μπροστά"
  // From the case maker's own page (scraper/makers): per position and fan size.
  fanMounts?: CaseFans[] | null; // positions: front 3 × 120 or 2 × 140 = two entries
  fansIncluded?: CaseFans[] | null; // fans in the box, e.g. front 3 × 120, rear 1 × 120; [] = the maker says none
  hasFans?: boolean | null; // "comes with fans", count not stated (BestPrice "Προεγκατεστημένοι Ανεμιστήρες")
  radiators?: CaseRadiator[] | null; // radiator sizes per position, e.g. front [240, 280, 360]
}

export type CasePosition = 'front' | 'rear' | 'top' | 'bottom' | 'side';
export interface CaseFans {
  pos: CasePosition | null; // null: the maker lists included fans without a position
  size: number | null; // mm; null when a shop title gives only the count ("WITH 3 ARGB FANS")
  n: number;
}
export interface CaseRadiator {
  pos: CasePosition;
  sizes: number[]; // mm
}

export interface FanListing extends BaseListing {
  brand: string; // vendor
  chip: string; // vendor + model + size (+ pack), e.g. "Arctic P12 Pro 120mm ×3"
  size: number; // mm
  pack: number; // fans in the box
  rgb: boolean;
  pwm?: boolean;
  connector?: '3-pin' | '4-pin PWM' | string | null; // stated by the site (title or product page)
  airflowCfm?: number | null; // product page
  pressureMm?: number | null; // static pressure, mmH2O (Skroutz product page)
  fanType?: 'airflow' | 'pressure' | null; // only when the maker's series name says so
}

export interface CoolerListing extends BaseListing {
  brand: string; // vendor
  chip: string; // vendor + model, e.g. "Arctic Liquid Freezer III Pro 360"
  type: 'Air' | 'AIO';
  radiator: number | null; // AIO radiator length in mm
  rgb: boolean;
  sockets?: string | null; // supported sockets, comma-joined: "AM4,AM5,LGA1700,LGA1851"
  heightMm?: number | null; // air coolers
}

export type StorageTier = 'Consumer' | 'NAS' | 'Server';

export interface StorageListing extends BaseListing {
  brand: string; // vendor, e.g. "Samsung"
  chip: string; // vendor + series + capacity (+ shape when not the usual one), e.g. "Samsung 990 Pro 1TB"
  media: 'SSD' | 'HDD';
  iface: 'NVMe' | 'SATA' | 'SAS' | null;
  pcie: 3 | 4 | 5 | null; // NVMe PCIe generation
  formFactor: string | null; // "M.2 2280", "M.2 2230", '2.5"', '3.5"', "mSATA", "U.2", "PCIe card"
  capacity: number; // GB (1TB = 1000)
  tier: StorageTier; // scraper/normalize_storage.py: NAS/surveillance and server/data-centre series
  // Stated in a title or on a product page (scraper/specs.py); null = not stated.
  dram?: boolean | null; // SSD DRAM cache
  readMBs?: number | null; // sequential read, MB/s
  writeMBs?: number | null;
  tbw?: number | null; // endurance, TB written
  heatsink?: boolean | null;
  rpm?: number | null; // HDD
  cacheMB?: number | null; // HDD
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
  i?: 1; // imported from Skroutz's price history (Skroutz-only, so not used for sale detection)
}

/** history_imported.json: models whose Skroutz history was imported (older files: just the date). */
export type Imported = Record<string, string | { d: string; low?: number; since?: string }>;

/** Keyed by model, e.g. "RTX 5060 Ti 16GB", "Ryzen 7 9800X3D", "DDR5 32GB (2×16GB) 6000MHz Desktop". */
export type History = Record<string, HistoryPoint[]>;

/** A daily low as the table needs it (no source); see src/lib/derive.ts `reduceHistory`. */
export type DailyLow = Pick<HistoryPoint, 'd' | 'min'>;

// ---- Files generated at build time from the scraper's JSON (src/lib/derive.ts, vite-plugin-data.ts).
// The scraper's own files above are unchanged; these are derived in the Vercel build, not committed.

/** Listings as columns: field names once, then one array per listing (a missing field is null). */
export interface Columns {
  cols: string[];
  rows: unknown[][];
}

/** /data/<cat>/list.json — everything a category page needs, without links and full history. */
export interface ListFile extends Columns {
  v: 1;
  builtAt: string; // ISO time of the build; also the version for detail/history requests
  updatedAt: string;
  sources: Latest['sources'];
  /** Per model, the few daily lows that give the same week change and all-time low as the full history. */
  hist: Record<string, [string, number][]>;
  imported: Imported;
  /** Model key → its stored photo ("<cat>/<id>", served as /img/<cat>/<id>-96|320.webp); none = no photo. */
  img?: Record<string, string>;
}

/** /data/<cat>/detail.json — listing id → shop URL (loaded when a product is opened). */
export type DetailFile = Record<string, string>;

/** /data/builder.json — one row per model the PC builder can offer, per slot (src/lib/derive.ts). */
export interface BuilderFile {
  v: 1;
  builtAt: string;
  slots: Record<string, Columns>;
  /** % of graphics cards / cases / coolers whose measurements are known (all models, not just offered). */
  coverage: { gpu: number; case: number; cooler: number };
}

/** /data/builder-<slot>.json — a slot kept out of builder.json (builder.LAZY_SLOTS: storage), loaded
 * when its step opens; its rows keep their URL and shop titles. */
export interface BuilderSlotFile extends Columns {
  v: 1;
  builtAt: string;
}

/** /data/builder-extra.json — by builder row id: shop URL, and the model's shop titles (picker search). */
export interface BuilderExtra {
  urls: Record<string, string>;
  titles: Record<string, string>;
}

/** /data/manifest.json — counts per category; the next build compares its data against them. */
export interface Manifest {
  builtAt: string;
  /** historyPoints: all daily lows in history.json (a drop means history was lost; optional in older manifests). */
  cats: Partial<Record<Category, { models: number; listings: number; historyPoints?: number; updatedAt: string }>>;
  builder: Record<string, number>; // models offered per builder slot
}
