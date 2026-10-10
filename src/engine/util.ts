// Small helpers shared by the rules: reading part fields safely and building findings.
import type { Basis, Build, Finding, Msg, Part, PartCategory, RuleId, Status } from './types';

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
