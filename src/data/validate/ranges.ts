// Plausible ranges for measured values (owner-approved 2026-10-11, adjusted against real data).
// A value outside its range is a scraping error (e.g. a case "up to 3.502 mm"), not a measurement.
import type { Category } from '../../types';
import { gpuPowerRow } from '../../engine/data/gpuPower';

export interface RangeCheck {
  id: string;
  cat: Category;
  field: string;
  min: number; // inclusive
  max: number; // inclusive
  unit: string;
  applies?: (l: Record<string, unknown>) => boolean;
  reportOnly?: true; // never set to null, even in 'enforce'
  /** A per-listing lower bound used instead of `min` (null = this listing is not checked). */
  lowerBound?: (l: Record<string, unknown>) => number | null;
  /** Text for reports when the range is not a fixed min-max. */
  rangeText?: string;
}

/**
 * A card's own `minPsu` is implausible when it is under the chip's board power + 100 W (owner 2026-10-12: a card
 * maker's own lower figure than the chip maker's is a real statement, so that is not checked). Only for chips whose
 * row in the GPU table has a board power. Returns the lowest plausible value, or null when not checked.
 */
export function minPsuFloor(l: Record<string, unknown>): number | null {
  const chip = l['chip'];
  const row = typeof chip === 'string' ? gpuPowerRow(chip) : undefined;
  return row?.boardPowerW !== undefined ? row.boardPowerW + 100 : null;
}

export const RANGES: RangeCheck[] = [
  // under 30 mm is unknown: shop pages also give a fan's 25 mm thickness as the tower height (owner 2026-10-11)
  { id: 'cooler-height', cat: 'cooler', field: 'heightMm', min: 30, max: 200, unit: 'mm' },
  { id: 'case-gpu-max', cat: 'case', field: 'gpuMaxMm', min: 100, max: 700, unit: 'mm' },
  // max 300: real clearances of big towers are 260-275 mm (owner 2026-10-20; was 250)
  { id: 'case-cooler-max', cat: 'case', field: 'coolerMaxMm', min: 25, max: 300, unit: 'mm' },
  { id: 'gpu-length', cat: 'gpu', field: 'lengthMm', min: 100, max: 400, unit: 'mm' },
  { id: 'gpu-minpsu-plausible', cat: 'gpu', field: 'minPsu', min: 0, max: 100000, unit: 'W', lowerBound: minPsuFloor,
    rangeText: 'at least the chip board power + 100 W (chips with a board power in the GPU power table)' },
  { id: 'psu-watts', cat: 'psu', field: 'watts', min: 150, max: 3000, unit: 'W', reportOnly: true }, // watts is not nullable
  { id: 'ram-ddr4-speed', cat: 'ram', field: 'speed', min: 1600, max: 5333, unit: 'MHz', applies: (l) => l['type'] === 'DDR4' },
  { id: 'ram-ddr5-speed', cat: 'ram', field: 'speed', min: 4000, max: 10000, unit: 'MHz', applies: (l) => l['type'] === 'DDR5' },
  { id: 'ram-cas', cat: 'ram', field: 'cas', min: 5, max: 60, unit: 'CL' },
  { id: 'cpu-tdp', cat: 'cpu', field: 'tdp', min: 10, max: 500, unit: 'W' },
  { id: 'mobo-max-memory', cat: 'mobo', field: 'maxMemoryGB', min: 4, max: 16384, unit: 'GB' },
];
