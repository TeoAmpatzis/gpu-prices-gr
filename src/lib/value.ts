// Value-for-money scores used by the "Recommended" sort (higher = more for the money).
// Only categories with a meaningful "how much you get" measure have one.

import type { FanListing, GpuListing, PsuListing, RamListing } from '../types';
import type { Model } from './data';

/**
 * Approximate relative gaming performance per GPU chip (RTX 4060 = 100), rounded from widely
 * published review averages at 1080p/1440p. Good enough to rank value; not a benchmark.
 */
const GPU_PERF: Record<string, number> = {
  'RTX 5090': 330, 'RTX 4090': 280, 'RTX 5080': 215, 'RTX 4080 Super': 205, 'RTX 4080': 200, 'RTX 5070 Ti': 190,
  'RTX 4070 Ti Super': 175, 'RTX 3090 Ti': 170, 'RTX 4070 Ti': 160, 'RTX 5070': 150, 'RTX 4070 Super': 150,
  'RTX 3090': 150, 'RTX 3080 Ti': 145, 'RTX 3080': 135, 'RTX 4070': 128, 'RTX 5060 Ti': 125, 'RTX 5060': 115,
  'RTX 3070 Ti': 115, 'RTX 4060 Ti': 110, 'RTX 3070': 108, 'RTX 4060': 100, 'RTX 3060 Ti': 95, 'RTX 5050': 85,
  'RTX 3060': 78, 'RTX 2060 Super': 75, 'RTX 2060': 65, 'RTX 3050': 55, 'GTX 1660 Super': 55, 'GTX 1660 Ti': 55,
  'GTX 1660': 50, 'GTX 1650': 38, 'GTX 1050 Ti': 28, 'GTX 1050': 22, 'GT 1030': 12, 'GT 730': 5, 'GT 710': 3,
  'RX 7900 XTX': 200, 'RX 9070 XT': 185, 'RX 7900 XT': 175, 'RX 9070': 165, 'RX 6950 XT': 150, 'RX 7900 GRE': 150,
  'RX 9070 GRE': 145, 'RX 7800 XT': 140, 'RX 6900 XT': 140, 'RX 6800 XT': 135, 'RX 9060 XT': 120, 'RX 7700 XT': 120,
  'RX 6800': 118, 'RX 9060': 105, 'RX 6750 XT': 105, 'RX 6700 XT': 100, 'RX 7600 XT': 95, 'RX 7600': 92,
  'RX 6650 XT': 88, 'RX 6600 XT': 85, 'RX 6600': 78, 'RX 5600 XT': 65, 'RX 6500 XT': 45, 'RX 580': 45, 'RX 6400': 35,
  'RX 560': 22, 'RX 550': 15,
  'Arc B580': 105, 'Arc B570': 92, 'Arc A770': 90, 'Arc A750': 82, 'Arc A580': 75, 'Arc A380': 35, 'Arc A310': 25,
};

/** Relative gaming performance of a GPU chip (RTX 4060 = 100), or null when not in the table. */
export const gpuPerf = (chip: string): number | null => GPU_PERF[chip] ?? null;

export const gpuValue = (m: Model<GpuListing>): number | null => {
  const perf = gpuPerf(m.cheapest.chip);
  return perf ? perf / m.cheapest.price : null;
};

/** GB per euro, nudged up for faster kits (6000MHz is the reference). */
export const ramValue = (m: Model<RamListing>): number => {
  const speed = m.cheapest.speed ?? (m.cheapest.type === 'DDR5' ? 4800 : 2666);
  return (m.cheapest.capacity * Math.pow(speed / 6000, 0.3)) / m.cheapest.price;
};

const EFFICIENCY: Record<string, number> = {
  Titanium: 1.2, Platinum: 1.15, Gold: 1.1, Silver: 1.03, Bronze: 1, Standard: 0.9, Diamond: 1.2,
};
/** Watts per euro, weighted by efficiency rating (unrated units count less). */
export const psuValue = (m: Model<PsuListing>): number =>
  (m.cheapest.watts * (EFFICIENCY[m.cheapest.efficiency ?? ''] ?? 0.85)) / m.cheapest.price;

/** Fans per euro. */
export const fanValue = (m: Model<FanListing>): number => m.cheapest.pack / m.cheapest.price;
