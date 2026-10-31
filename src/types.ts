// Mirror of the JSON written by scraper/main.py (see scraper/models.py).
import type { AliasRecord } from './data/modelAliases';
import type { Slot } from './lib/slots';

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
  img?: string | null; // builder step file rows only: the model's stored photo ("<cat>/<id>")
  pop?: number | null; // builder step file rows only: the model's popularity × POP_SCALE (src/lib/ranking.ts popularityRaw)
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
  /** Build time (src/engine/data/cpuBox.ts): the cooler the maker's page names for a Box CPU with one in the box. */
  boxCooler?: string | null;
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
  // From product pages (scraper/specs.py parse_mobo); not used by v1, so list.v2.json leaves them out.
  m2Slots?: number | null;
  m2Gen?: number | null; // highest PCIe generation of its M.2 slots
  sataPorts?: number | null;
  maxMemoryGB?: number | null;
  biosFlashback?: boolean | null; // true when stated; null = not stated
  /** Build time (validate/conflicts G3): the shops disagree on the size, so formFactor is 'Άλλο' = unknown, not "other". */
  formConflict?: boolean;
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
  atx3?: boolean | null; // a title or BestPrice's URL says ATX 3.x; null = not stated. Per product, not shared.
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
  bays35?: number | null; // internal 3.5" drive bays (v2 Phase 2; not in v1's list.json)
  bays25?: number | null; // internal 2.5" drive bays
  usbCFront?: boolean | null; // front USB-C port; null = the page lists no front ports
  /** Build time (src/engine/data/casePsu.ts): the PSU sizes the maker's page says the case takes; absent = not stated. */
  psuFormFactors?: string[] | null;
  /** Build time (casePsu.ts): the case's own power, 'external' (adapter, no PSU bay) or the unit in the box. */
  psuIncluded?: string | null;
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
  /** Build time (validate/conflicts G4): sockets a shop title names that `sockets` lacks, comma-joined ("AM4"); absent = none. */
  socketsTitle?: string | null;
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
  /**
   * Build-only, model chunks only (never in the scraper's history.json): an import glitch (task 7b, src/lib/dips.ts
   * importGlitches), left out of the line, the low and the median like a C6 dip.
   */
  g?: 1;
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

/** /data/<cat>/list.v2.json — everything a category page needs, without links and full history. */
export interface ListFile extends Columns {
  v: 2; // 2 = compact hist + photos bitset; the browser asks for list.v2.json and refuses any other version
  builtAt: string; // ISO time of the build; also the version for detail/history requests
  updatedAt: string;
  sources: Latest['sources'];
  /**
   * Per current model, the few daily lows that give the same week change and all-time low as the full history,
   * compact: [days from `histBase` of the first point, cents, then days since the previous point, cents, …]
   * (src/lib/columns.ts decodeHist); a model without history has [].
   */
  hist: Record<string, number[]>;
  /** Day (YYYY-MM-DD) that the day offsets in `hist` count from. */
  histBase: string;
  imported: Imported;
  /**
   * Which models have a stored photo: base64 bitset over the sorted keys of `hist` (bit set = photo). The photo's
   * path is /img/<cat>/<id>, id = images.photoId(cat, key) (served as -96|320.webp); none = category icon.
   */
  photos: string;
}

/** /data/<cat>/detail.json — listing id → shop URL (loaded when a product is opened). */
export type DetailFile = Record<string, string>;

/**
 * The PC builder's files (step 5 task 6, src/lib/derive.ts builderFiles; build outputs, never committed). The first
 * screen reads only /data/builder/index.json; each step's parts are /data/builder/<slot>.json, fetched when the step
 * or its picker opens; their shop links and search titles /data/builder/<slot>-extra.json (src/lib/builderFiles.ts).
 */
export interface BuilderIndex {
  v: 2;
  builtAt: string;
  /** Per slot: rows in its file and the file's size (bytes, not compressed), for skeleton counts and the data check. */
  slots: Record<Slot, { rows: number; bytes: number }>;
  /** Rule 6 estimates: measured length range per graphics chip (builder.fitContext over the offered cards). */
  chipLengths: Record<string, { cards: number; makers: number; min: number; max: number }>;
  /** The cheapest build per use, for "costs at least X € today" (filled by step 5 task 10). */
  minimum: Partial<Record<BuilderUseKey, { total: number; parts: Partial<Record<Slot, string>> } | null>>;
  /** % of graphics cards / cases / coolers whose measurements are known (all models, not just offered). */
  coverage: { gpu: number; case: number; cooler: number };
}
export type BuilderUseKey = 'gaming-1080p' | 'gaming-1440p' | 'gaming-4k' | 'everyday' | 'creating' | 'unsure';

/** /data/builder/<slot>.json — one row per model the builder can offer in that step (columns; no links, no titles). */
export interface BuilderSlotFile extends Columns {
  v: 2;
  builtAt: string;
}

/** /data/builder/<slot>-extra.json — by row id: shop URL, and the model's shop titles (picker search). */
export interface BuilderExtraFile {
  v: 2;
  builtAt: string;
  urls: Record<string, string>;
  titles: Record<string, string>;
}

/** /data/aliases.json (build step: main's scraper/model_aliases.json, src/data/modelAliases.ts aliasFile). */
export interface AliasFile {
  v: 1;
  builtAt: string;
  cats: Record<Category, AliasRecord[]>;
}

/** /data/manifest.json — counts per category; the next build compares its data against them. */
export interface Manifest {
  builtAt: string;
  /** historyPoints: all daily lows in history.json (a drop means history was lost; optional in older manifests). */
  cats: Partial<
    Record<
      Category,
      {
        models: number;
        listings: number;
        historyPoints?: number;
        updatedAt: string;
        /** Each source's last successful read of this category (the status line; optional in older manifests). */
        sources?: Partial<Record<SourceName, { updatedAt: string | null; ok: boolean }>>;
      }
    >
  >;
  builder: Record<string, number>; // models offered per builder slot
}

/**
 * One model's product page (src/lib/derive.ts modelChunks), in /data/<cat>/model/<nnn>.json: filed under its slug's
 * lookup form (src/lib/slug.ts slugLookup), in that form's chunk (src/lib/modelData.ts modelChunkOf).
 */
export interface ModelEntry {
  key: string; // model key (history.json, list files)
  chip: string; // shown name, as on the category page
  slug: string; // canonical address segment (src/lib/slug.ts modelSlug over all its listings)
  /** The model has a stored photo (the same images index as list files' `photos` bitset): no request for one that hasn't. */
  photo: boolean;
  listings: BaseListing[]; // every listing with all its fields (url, scrapedAt…), cheapest first
  /**
   * The model's full history.json points, as the scraper wrote them (with `source`, and `i` for imported ones); import
   * glitches (task 7b) carry `g: 1`.
   */
  history: HistoryPoint[];
  dips: string[]; // dates of the implausible dips and import glitches (src/lib/dips.ts untrustedPoints), which the chart marks
  /**
   * history_imported.json entry (a low that 3+ models of the category share, or that is one of the dips, left out, as on
   * the category page).
   */
  imported: Imported[string] | null;
  /**
   * Engine fields (src/lib/pick.ts toPart) by the builder's key (src/lib/builder.ts slotModels): a graphics card per
   * listing id, a CPU per "<chip>|<cooler in the box>" (Box and Tray apart), any other part one entry under the model
   * key. null when the category is not a builder slot.
   */
  parts: Record<string, Record<string, unknown>> | null;
  /** Same product, other sizes (GPU VRAM, drive capacity, RAM kit, PSU watts), smallest first; never the model itself. */
  variants: { key: string; slug: string; label: string; order: number; price: number }[];
  /** This model's own label in its variants family ("16GB", "2TB", "32GB (2×16GB)", "850W") and its sort order there; null when it has no family. */
  variantLabel: string | null;
  variantOrder: number | null;
  /**
   * Graphics cards with no measured length of their own: the length range (mm) of the chip's measured air-cooled cards
   * (builder.fitContext, the builder's ESTIMATE rule), shown as an estimate. Absent when the chip has too few cards.
   */
  lengthEstimate?: { min: number; max: number };
  /**
   * "cheaper": up to 3 parts of the same kind (derive.sameKind: desktop CPU same socket, board same socket + size,
   * case same size group, cooler same type + radiator, fan same size) at least 5% cheaper, best Recommended score
   * first (none for GPU, RAM, drives, PSUs: their variants); then "value": up to 3 of better value (src/lib/value.ts)
   * within ±10% of the price.
   */
  alternatives: { kind: 'cheaper' | 'value'; key: string; slug: string; chip: string; price: number; img: boolean }[];
}

/** /data/<cat>/model/<nnn>.json (256 per category) — the product pages' models, by slug. */
export interface ModelChunk {
  v: 1;
  builtAt: string;
  sources: Latest['sources'];
  models: Record<string, ModelEntry>;
}
