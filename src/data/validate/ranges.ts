// Plausible ranges for measured values (owner-approved 2026-10-11, adjusted against real data).
// A value outside its range is a scraping error (e.g. a case "up to 3.502 mm"), not a measurement.
import type { Category } from '../../types';

export interface RangeCheck {
  id: string;
  cat: Category;
  field: string;
  min: number; // inclusive
  max: number; // inclusive
  unit: string;
  applies?: (l: Record<string, unknown>) => boolean;
  reportOnly?: true; // never set to null, even in 'enforce'
}

export const RANGES: RangeCheck[] = [
  // under 30 mm is unknown: shop pages also give a fan's 25 mm thickness as the tower height (owner 2026-10-11)
  { id: 'cooler-height', cat: 'cooler', field: 'heightMm', min: 30, max: 200, unit: 'mm' },
  { id: 'case-gpu-max', cat: 'case', field: 'gpuMaxMm', min: 100, max: 700, unit: 'mm' },
  { id: 'case-cooler-max', cat: 'case', field: 'coolerMaxMm', min: 25, max: 250, unit: 'mm' },
  { id: 'gpu-length', cat: 'gpu', field: 'lengthMm', min: 100, max: 400, unit: 'mm' },
  { id: 'psu-watts', cat: 'psu', field: 'watts', min: 150, max: 3000, unit: 'W', reportOnly: true }, // watts is not nullable
  { id: 'ram-ddr4-speed', cat: 'ram', field: 'speed', min: 1600, max: 5333, unit: 'MHz', applies: (l) => l['type'] === 'DDR4' },
  { id: 'ram-ddr5-speed', cat: 'ram', field: 'speed', min: 4000, max: 10000, unit: 'MHz', applies: (l) => l['type'] === 'DDR5' },
  { id: 'ram-cas', cat: 'ram', field: 'cas', min: 5, max: 60, unit: 'CL' },
  { id: 'cpu-tdp', cat: 'cpu', field: 'tdp', min: 10, max: 500, unit: 'W' },
  { id: 'mobo-max-memory', cat: 'mobo', field: 'maxMemoryGB', min: 4, max: 16384, unit: 'GB' },
];
