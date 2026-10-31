// Build-time check (step 5, task 2): a fit value that rests on one shop page, and is contradicted by another page,
// by the model's own listings or by its size class, becomes unknown ("Fit not verified") instead of a wrong
// answer that hides parts. Runs after the plausible ranges (index.ts), on whole models, in the same mode.
//
//   G1  two product pages (specs.json) of a model state the same measurement and differ by more than the tolerance
//   G2  a value outside its size class's typical range, not confirmed by two agreeing pages
//   G3  the model's listings disagree on a non-shared fit value (case maxBoard, board formFactor)
//   G4  a shop title names a socket the cooler's `sockets` field lacks -> `socketsTitle` (rule 10 asks the buyer)
//   G5  a board's chipset names its socket (H610 -> LGA1700, B840 -> AM5) and the listing's socket differs -> the chipset's socket
//
// The scraper's files are not changed; specs.json is read at build time only (vite-plugin-data) and not shipped.
import type { BaseListing, Category, Latest } from '../../types';
import { CATEGORIES, type CategoryConfig } from '../../lib/categories';
import { mostCommon } from '../../lib/data';
import type { ValidationMode } from './index';
import { RANGES } from './ranges';

export type ConflictId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export interface ConflictCheck { id: ConflictId; cat: Category; field: string }
export interface Conflict {
  check: ConflictId;
  cat: Category;
  model: string; // the model key
  field: string;
  values: unknown[]; // what the pages / listings / class said
  action: 'unknown' | 'corrected' | 'title-socket';
}
type Row = Record<string, unknown>;
export type SpecsFile = Record<string, Row>; // listing id -> the product page's fields

/** G1: the checked fields, their tolerance (mm) and the plausible range the page values must pass first. */
export const G1_FIELDS: { cat: Category; field: string; tolerance: number; range: string; safer: 'min' | 'max' }[] = [
  // `safer`: the page value the scraper's SAFER join keeps (smaller clearance, taller cooler); any other current
  // value was set later (a maker page or an override) and is left alone.
  { cat: 'case', field: 'gpuMaxMm', tolerance: 50, range: 'case-gpu-max', safer: 'min' },
  { cat: 'case', field: 'coolerMaxMm', tolerance: 20, range: 'case-cooler-max', safer: 'min' },
  { cat: 'cooler', field: 'heightMm', tolerance: 20, range: 'cooler-height', safer: 'max' },
];
/** G2: a Midi/Full Tower below this card length is more likely a misread than a case (Midi p1 = 250 mm). */
export const TOWER_MIN_GPU_MM = 230;
/** Two pages agree on a value when they are this close (mm). */
const AGREE_MM = 5;
const BOARD_RANK = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
const UNKNOWN_BOARD = 'Άλλο';
/** G5: chipsets that exist for one socket only, spelled as in the mobo data (`chipset`, `socket`). Only chipsets found in the
 *  data of 31/10 plus the AM4 ones the plan names; a chipset whose listings split between two real sockets (W890: LGA1851 and
 *  LGA4710) or that is no desktop chipset (X550) is left out. A test checks each entry against the data's majority socket. */
const SOCKET_OF: Record<string, string[]> = {
  AM4: ['A320', 'B350', 'B450', 'X370', 'X470', 'A520', 'B550', 'X570'],
  AM5: ['A620', 'B650', 'B650E', 'X670', 'X670E', 'B840', 'B850', 'X870', 'X870E'],
  LGA1700: ['H610', 'B660', 'H670', 'Q670', 'Q670E', 'W680', 'Z690', 'B760', 'H770', 'Z790', 'C262', 'C266'],
  LGA1851: ['H810', 'B860', 'Z890', 'Q870', 'W880'],
  LGA1200: ['H410', 'W480', 'Z590', 'C252', 'C256'],
  LGA1151: ['H110', 'Q270'],
  LGA2066: ['X299'],
  LGA4677: ['W790'],
  sTR5: ['TRX50', 'WRX90'],
  TR4: ['X399'],
};
export const CHIPSET_SOCKET: Record<string, string> = Object.fromEntries(
  Object.entries(SOCKET_OF).flatMap(([socket, chipsets]) => chipsets.map((c) => [c, socket])),
);

/** All the checks, for reports. */
export const CONFLICT_CHECKS: ConflictCheck[] = [
  ...G1_FIELDS.map((f) => ({ id: 'G1' as const, cat: f.cat, field: f.field })),
  { id: 'G2', cat: 'case', field: 'gpuMaxMm' },
  { id: 'G2', cat: 'case', field: 'maxBoard' },
  { id: 'G3', cat: 'case', field: 'maxBoard' },
  { id: 'G3', cat: 'mobo', field: 'formFactor' },
  { id: 'G4', cat: 'cooler', field: 'socketsTitle' },
  { id: 'G5', cat: 'mobo', field: 'socket' },
];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** Sockets a shop title can name, in the scraper's spelling: "AM4", "1200" or "LGA 1200" -> LGA1200. */
// Not a model name ("Jonsbo CR-1200": a letter and a dash before) and not a fan speed ("1200 rpm", "1200-1700 rpm").
const TITLE_SOCKETS = /(?<![A-Za-z0-9])(?<![A-Za-z]-)(AM[45]|(?:LGA\s?)?(?:1200|1700|1851))(?![A-Za-z0-9])(?!\s*rpm)(?!-\d+\s*rpm)/gi;
export function titleSockets(title: string): string[] {
  const out = new Set<string>();
  for (const m of title.matchAll(TITLE_SOCKETS)) {
    const s = m[1].toUpperCase().replace(/\s/g, '');
    out.add(s.startsWith('AM') || s.startsWith('LGA') ? s : `LGA${s}`);
  }
  return [...out];
}

/** A board name that says ITX (not mATX / Micro ATX) is a Mini ITX board whichever shop says otherwise. */
export function nameSaysMiniItx(name: string): boolean {
  return /itx/i.test(name) && !/m-?atx|micro/i.test(name);
}

function rangeOf(id: string): { min: number; max: number } {
  const r = RANGES.find((x) => x.id === id);
  if (!r) throw new Error(`no range ${id}`);
  return r;
}

export function conflicts(
  cat: Category,
  latest: Latest,
  specs: SpecsFile,
  mode: ValidationMode = 'enforce',
): { latest: Latest; conflicts: Conflict[] } {
  const cfg = CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
  const found: Conflict[] = [];
  // model key -> its listings (copies we may change)
  const groups = new Map<string, Row[]>();
  const rows: Row[] = latest.listings.map((l) => ({ ...(l as unknown as Row) }));
  rows.forEach((r, i) => {
    const k = cfg.modelKey(latest.listings[i] as BaseListing);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  });
  const set = (ls: Row[], field: string, v: unknown) => ls.forEach((l) => (l[field] = v));
  const log = (check: ConflictId, model: string, field: string, values: unknown[], action: Conflict['action']) =>
    found.push({ check, cat, model, field, values, action });
  /** The values the model's product pages state for `field` (one per page), range-checked when `range` is given. */
  const pageValues = (ls: Row[], field: string, range?: string): number[] => {
    const r = range ? rangeOf(range) : null;
    const out: number[] = [];
    for (const l of ls) {
      const v = num(specs[String(l['id'])]?.[field]);
      if (v !== null && (!r || (v >= r.min && v <= r.max))) out.push(v);
    }
    return out;
  };
  const pageStrings = (ls: Row[], field: string): string[] =>
    ls.map((l) => str(specs[String(l['id'])]?.[field])).filter((v): v is string => v !== null);
  /** G1 on one field of one model. */
  const g1 = (model: string, ls: Row[], f: (typeof G1_FIELDS)[number]) => {
    const own = ls.map((l) => num(l[f.field])).filter((v): v is number => v !== null);
    if (!own.length) return;
    const pages = pageValues(ls, f.field, f.range);
    if (pages.length < 2 || Math.max(...pages) - Math.min(...pages) <= f.tolerance) return;
    // Only the value the scraper's SAFER join took from the pages is undone; a maker page or an override set anything else.
    const pick = f.safer === 'min' ? Math.min(...pages) : Math.max(...pages);
    if (!own.includes(pick)) return;
    log('G1', model, f.field, [...pages].sort((a, b) => a - b), 'unknown');
    set(ls, f.field, null);
  };

  for (const [model, ls] of groups) {
    if (cat === 'case') {
      for (const f of G1_FIELDS.filter((x) => x.cat === cat)) g1(model, ls, f);
      // G3: the listings disagree on the board size
      const boards = new Set(ls.map((l) => str(l['maxBoard'])).filter((v): v is string => v !== null));
      if (boards.size > 1) {
        log('G3', model, 'maxBoard', [...boards].sort(), 'unknown');
        set(ls, 'maxBoard', null);
      }
      // G2: outside the size class
      const size = mostCommon(ls.map((l) => str(l['size'])).filter((s) => s !== null && s !== UNKNOWN_BOARD)); // 'Άλλο' = not a size
      const len = ls.map((l) => num(l['gpuMaxMm'])).find((v) => v !== null) ?? null;
      if (len !== null && (size === 'Midi Tower' || size === 'Full Tower') && len < TOWER_MIN_GPU_MM) {
        const agree = pageValues(ls, 'gpuMaxMm').filter((v) => Math.abs(v - len) <= AGREE_MM).length >= 2;
        if (!agree) {
          log('G2', model, 'gpuMaxMm', [len], 'unknown');
          set(ls, 'gpuMaxMm', null);
        }
      }
      const board = ls.map((l) => str(l['maxBoard'])).find((v) => v !== null) ?? null;
      if (board !== null) {
        const wrong = (size === 'SFF / Cube' && BOARD_RANK.indexOf(board) >= BOARD_RANK.indexOf('ATX')) || (size === 'Mini Tower' && board === 'E-ATX');
        if (wrong && pageStrings(ls, 'maxBoard').filter((v) => v === board).length < 2) {
          log('G2', model, 'maxBoard', [`${board} in ${size}`], 'unknown');
          set(ls, 'maxBoard', null);
        }
      }
    } else if (cat === 'mobo') {
      // G3: the listings disagree on the board size ('Άλλο' = a listing that states no size, not a disagreement).
      // Unknown stays 'Άλλο' for the category page and gets `formConflict`, which lets the builder keep the board
      // (rule 5 answers "unknown") instead of dropping it like the boards the scraper itself labels 'Άλλο'.
      const forms = new Set(ls.map((l) => str(l['formFactor'])).filter((v): v is string => v !== null && v !== UNKNOWN_BOARD));
      if (forms.size > 1) {
        const itx = nameSaysMiniItx(str(ls[0]['chip']) ?? model);
        log('G3', model, 'formFactor', [...forms].sort(), itx ? 'corrected' : 'unknown');
        set(ls, 'formFactor', itx ? 'Mini ITX' : UNKNOWN_BOARD);
        if (!itx) set(ls, 'formConflict', true);
      }
      // G5: the chipset names the socket; a listing that says another socket (from its title or a shared value) is corrected.
      const wrong = ls.filter((l) => {
        const want = CHIPSET_SOCKET[str(l['chipset']) ?? ''], have = str(l['socket']);
        return want !== undefined && have !== null && have !== want;
      });
      if (wrong.length) {
        const chipsets = [...new Set(wrong.map((l) => String(l['chipset'])))].sort();
        const was = [...new Set(wrong.map((l) => String(l['socket'])))].sort();
        log('G5', model, 'socket', [`${was.join(', ')} / ${chipsets.map((c) => `${c} = ${CHIPSET_SOCKET[c]}`).join(', ')}`], 'corrected');
        for (const l of wrong) l['socket'] = CHIPSET_SOCKET[String(l['chipset'])];
      }
    } else if (cat === 'cooler') {
      // G1: tower height (page values under 30 mm are fan widths and drop out through the range)
      for (const f of G1_FIELDS.filter((x) => x.cat === cat)) g1(model, ls, f);
      // G4: a title names a socket the spec field lacks
      // every title against the model's sockets as the builder reads them (mostCommon of the listings)
      const stated = mostCommon(ls.map((l) => str(l['sockets'])));
      const extra = new Set<string>();
      if (stated !== null) {
        const have = new Set(stated.split(',').map((s) => s.trim().toUpperCase()));
        for (const l of ls) for (const s of titleSockets(String(l['title'] ?? ''))) if (!have.has(s)) extra.add(s);
      }
      if (extra.size) {
        const value = [...extra].sort().join(',');
        log('G4', model, 'socketsTitle', [value], 'title-socket');
        set(ls, 'socketsTitle', value);
      }
    }
  }
  return { latest: mode === 'report' ? latest : { ...latest, listings: rows as unknown as Latest['listings'] }, conflicts: found };
}
