// Small helpers shared by the rules: reading part fields safely and building findings.
import type { Basis, Build, Finding, Msg, Part, PartCategory, RuleId, Status } from './types';
import { plural, type Forms } from '../lib/text';

export const one = (b: Build, c: PartCategory): Part | undefined => b.find((p) => p.category === c);
export const all = (b: Build, c: PartCategory): Part[] => b.filter((p) => p.category === c);

export const num = (p: Part | undefined, f: string): number | null => {
  const v = p?.fields[f];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
export const str = (p: Part | undefined, f: string): string | null => {
  const v = p?.fields[f];
  return typeof v === 'string' && v.trim() ? v : null;
};
export const bool = (p: Part | undefined, f: string): boolean | null => {
  const v = p?.fields[f];
  return typeof v === 'boolean' ? v : null;
};
export const list = <T>(p: Part | undefined, f: string): T[] | null => {
  const v = p?.fields[f];
  return Array.isArray(v) ? (v as T[]) : null;
};

/** Sum of a numeric field × quantity over parts; null if any part lacks it. */
export const total = (ps: Part[], f: string): number | null => {
  let sum = 0;
  for (const p of ps) {
    const v = num(p, f);
    if (v === null) return null;
    sum += v * p.quantity;
  }
  return sum;
};

export const keys = (...ps: (Part | undefined)[]): string[] => ps.filter((p): p is Part => !!p).map((p) => p.key);

export const msg = (el: string, en: string): Msg => ({ el, en });

/** A count and its noun in both languages (task 14, #31): nOf(1, F.slot) → { el: '1 θέση', en: '1 slot' }. */
export const nOf = (n: number, f: Forms): Msg => ({ el: plural('el', n, f), en: plural('en', n, f) });

/** The nouns the rules count (Greek case as the sentence needs it: `…Acc` accusative, `…Gen` genitive). */
export const F = {
  m2Drive: { el: ['δίσκος M.2', 'δίσκοι M.2'], en: ['M.2 drive', 'M.2 drives'] },
  sataDrive: { el: ['δίσκος SATA', 'δίσκοι SATA'], en: ['SATA drive', 'SATA drives'] },
  hddDrive: { el: ['δίσκος 3.5"', 'δίσκοι 3.5"'], en: ['3.5" drive', '3.5" drives'] },
  driveAcc: { el: ['δίσκο', 'δίσκους'], en: ['drive', 'drives'] },
  slot: { el: ['θέση', 'θέσεις'], en: ['slot', 'slots'] },
  m2Slot: { el: ['θέση M.2', 'θέσεις M.2'], en: ['M.2 slot', 'M.2 slots'] },
  expansionSlot: { el: ['θέση επέκτασης', 'θέσεις επέκτασης'], en: ['expansion slot', 'expansion slots'] },
  port: { el: ['θύρα', 'θύρες'], en: ['port', 'ports'] },
  sataPort: { el: ['θύρα SATA', 'θύρες SATA'], en: ['SATA port', 'SATA ports'] },
  bay: { el: ['θέση', 'θέσεις'], en: ['bay', 'bays'] },
  fan: { el: ['ανεμιστήρας', 'ανεμιστήρες'], en: ['fan', 'fans'] },
  fanAcc: { el: ['ανεμιστήρα', 'ανεμιστήρες'], en: ['fan', 'fans'] },
  fan120: { el: ['ανεμιστήρας 120 mm', 'ανεμιστήρες 120 mm'], en: ['× 120 mm fan', '× 120 mm fans'] },
  position: { el: ['θέση', 'θέσεις'], en: ['position', 'positions'] },
  fanPosition: { el: ['θέση ανεμιστήρα', 'θέσεις ανεμιστήρων'], en: ['fan position', 'fan positions'] },
  header: { el: ['header', 'headers'], en: ['header', 'headers'] },
  fanHeader: { el: ['header ανεμιστήρα', 'headers ανεμιστήρων'], en: ['fan header', 'fan headers'] },
  stick: { el: ['στικ', 'στικ'], en: ['stick', 'sticks'] },
  memoryStick: { el: ['στικ μνήμης', 'στικ μνήμης'], en: ['memory stick', 'memory sticks'] },
  module: { el: ['μονάδα', 'μονάδες'], en: ['stick', 'sticks'] },
} satisfies Record<string, Forms>;

export function finding(rule: RuleId, status: Status, basis: Basis, parts: string[], message: Msg, fix?: Msg): Finding {
  return fix ? { rule, status, basis, parts, message, fix } : { rule, status, basis, parts, message };
}

/** "Δεν μπορέσαμε να ελέγξουμε …" — the one wording for every unknown (plan: unknown is never hidden). */
export function unknown(rule: RuleId, parts: string[], what: Msg, fix?: Msg): Finding {
  return finding(rule, 'unknown', 'unknown', parts, msg(`Δεν μπορέσαμε να ελέγξουμε ${what.el}`, `We couldn't check ${what.en}`), fix);
}

/** How a finding is shown: an unknown is a note. */
export const shownLevel = (s: Status): Exclude<Status, 'unknown'> => (s === 'unknown' ? 'note' : s);

export const fmtMm = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)} mm`;
