// The compatibility engine's shapes (v2 Phase 2, "ελάχιστο λειτουργικό v2", step 1). Pure TypeScript: no
// React, no DOM, no fetch. The builder, the "Μόνο συμβατά" filter and the product page call it.

export type PartCategory = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'cooler' | 'storage' | 'case' | 'fan' | 'psu';

/** One chosen part: its category, a unique key in the build, a display name, a quantity and its fields. */
export interface Part {
  category: PartCategory;
  key: string;
  /**
   * Display name. The CPU tables (memory, power, BIOS) match the bare model name, e.g. "Ryzen 5 7600": a CPU's
   * `fields.chip` (same form) is read first and `name` is the fallback. GPU tables read `fields.chip`.
   */
  name: string;
  quantity: number;
  /** Validated field values (null / missing = not known), as in the data files and the scenarios. */
  fields: Record<string, unknown>;
}

export type Build = Part[];

/** What a rule found for one case. "unknown" is shown as a note: "Δεν μπορέσαμε να ελέγξουμε…". */
export type Status = 'pass' | 'error' | 'warning' | 'note' | 'unknown';

/** Where the answer comes from: a stated value, an estimate, v1's unsourced estimate, a maker's list, nothing. */
export type Basis = 'stated' | 'estimate' | 'v1-estimate' | 'maker-list' | 'unknown';

export interface Msg {
  el: string;
  en: string;
}

export type RuleId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
  | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26
  | 27 | 28 | 29 | 30;

export interface Finding {
  rule: RuleId;
  status: Status;
  basis: Basis;
  /** Keys of the parts the finding is about (the "Μόνο συμβατά" filter uses them). */
  parts: string[];
  message: Msg;
  /** What to do about it (errors, warnings, unknowns). */
  fix?: Msg;
}

/** A graphics chip's measured card lengths (v1 `fitContext`): used to estimate a card of unknown length. */
export interface ChipLengths {
  cards: number;
  makers: number;
  min: number;
  max: number;
}

/** Rule 13's table (chipset × CPU generation). None exists in the data yet, so rule 13 is unknown without it. */
export type BiosVerdict = 'ok' | 'update' | 'may-update' | 'not-listed' | 'unsupported';
export type BiosLookup = (chipset: string, cpuName: string) => BiosVerdict | undefined;

/** Gaming resolution (the tier table's resolutions). */
export type Resolution = '1080p' | '1440p' | '4k';

/** What the build is for (the builder's first step). Rules 27–30 speak only for gaming; a gaming use without a resolution is 1080p. */
export interface Use {
  kind: 'gaming' | 'everyday' | 'creating' | 'unsure';
  res?: Resolution;
}

export interface Context {
  chipLengths?: Record<string, ChipLengths>;
  bios?: BiosLookup;
  use?: Use;
}
