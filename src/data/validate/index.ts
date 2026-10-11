// Finds measured values outside plausible ranges. 'report' only lists them; 'enforce' also returns
// listings with those values set to null ("not stated"), so they never reach the compatibility engine.
import type { BaseListing, Category, Latest } from '../../types';
import { RANGES } from './ranges';

export type ValidationMode = 'report' | 'enforce';
export const VALIDATION_MODE: ValidationMode = 'enforce';

export interface Rejection { check: string; cat: Category; id: string; title: string; chip: string; field: string; value: number }
export interface ValidationResult<L extends BaseListing> {
  latest: Latest<L>; // report: the input object itself; enforce: a new object
  rejections: Rejection[];
  stated: Record<string, number>; // per check id: listings where the value was a finite number
}

export function validateLatest<L extends BaseListing>(cat: Category, latest: Latest<L>, mode: ValidationMode): ValidationResult<L> {
  const checks = RANGES.filter((c) => c.cat === cat);
  const rejections: Rejection[] = [];
  const stated: Record<string, number> = {};
  for (const c of checks) stated[c.id] = 0;
  const listings = latest.listings.map((l) => {
    const rec = l as unknown as Record<string, unknown>;
    let copy: Record<string, unknown> | null = null;
    for (const c of checks) {
      if (c.applies && !c.applies(rec)) continue;
      const v = rec[c.field];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      stated[c.id]++;
      if (v >= c.min && v <= c.max) continue;
      rejections.push({ check: c.id, cat, id: l.id, title: l.title, chip: l.chip, field: c.field, value: v });
      if (!c.reportOnly) (copy ??= { ...rec })[c.field] = null;
    }
    return copy ? (copy as unknown as L) : l;
  });
  return { latest: mode === 'report' ? latest : { ...latest, listings }, rejections, stated };
}
