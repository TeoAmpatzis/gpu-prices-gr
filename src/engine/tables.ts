// Tables the engine uses today. All come from v1 (copied 2026-10-10; tests/unit/engine/tables.test.ts checks
// they still equal v1's), none has a per-row source, so the results built on them say basis "v1-estimate".

/** v1 `GPU_PSU` (src/lib/builder.ts): recommended PSU for a whole system per graphics chip. */
export const V1_GPU_PSU: Record<string, number> = {
  'RTX 5090': 1000, 'RTX 5080': 850, 'RTX 5070 Ti': 750, 'RTX 5070': 650, 'RTX 5060 Ti': 600, 'RTX 5060': 550,
  'RTX 5050': 550, 'RTX 4090': 850, 'RTX 4080 Super': 750, 'RTX 4080': 750, 'RTX 4070 Ti Super': 700,
  'RTX 4070 Ti': 700, 'RTX 4070 Super': 650, 'RTX 4070': 650, 'RTX 4060 Ti': 550, 'RTX 4060': 550,
  'RTX 3090 Ti': 850, 'RTX 3090': 750, 'RTX 3080 Ti': 750, 'RTX 3080': 750, 'RTX 3070 Ti': 750, 'RTX 3070': 650,
  'RTX 3060 Ti': 600, 'RTX 3060': 550, 'RTX 3050': 550, 'RTX 2060 Super': 550, 'RTX 2060': 500,
  'GTX 1660 Ti': 450, 'GTX 1660 Super': 450, 'GTX 1660': 450, 'GTX 1050 Ti': 300, 'GTX 1050': 300, 'GTX 745': 300,
  'GT 1030': 300, 'GT 730': 300, 'GT 710': 300, 'GT 610': 300, 'GT 240': 300, 'GT 210': 300,
  'RX 9070 XT': 750, 'RX 9070 GRE': 650, 'RX 9070': 650, 'RX 9060 XT': 500, 'RX 9060': 500, 'RX 7900 XTX': 800,
  'RX 7900 XT': 750, 'RX 7900 GRE': 700, 'RX 7800 XT': 700, 'RX 7700 XT': 700, 'RX 7600 XT': 600, 'RX 7600': 550,
  'RX 6950 XT': 850, 'RX 6900 XT': 850, 'RX 6800 XT': 750, 'RX 6800': 650, 'RX 6750 XT': 650, 'RX 6700 XT': 650,
  'RX 6650 XT': 500, 'RX 6600 XT': 500, 'RX 6600': 500, 'RX 6500 XT': 400, 'RX 6400': 350, 'RX 5600 XT': 550,
  'RX 580': 500, 'RX 560': 400, 'RX 550': 400, 'Arc B580': 600, 'Arc B570': 500, 'Arc A770': 650, 'Arc A750': 600,
  'Arc A580': 600, 'Arc A380': 300, 'Arc A310': 300,
};

/** v1: top-tier desktop CPUs get +100 W on top of the card's figure (no source). */
export const V1_HIGH_END_CPU = /^(Ryzen 9|Core i9|Core Ultra 9)\b/;
export const V1_HIGH_END_EXTRA_W = 100;

export type BoardSize = 'Mini ITX' | 'Micro ATX' | 'ATX' | 'E-ATX';
/** Smallest to largest; a case that takes one size takes every smaller one. */
export const BOARD_RANK: BoardSize[] = ['Mini ITX', 'Micro ATX', 'ATX', 'E-ATX'];
/** v1 `BOARD_BY_CASE_SIZE` (src/lib/categories.tsx): the usual largest board for a case size (an estimate). */
export const BOARD_BY_CASE_SIZE: Record<string, BoardSize> = {
  'Full Tower': 'E-ATX', 'Midi Tower': 'ATX', 'Mini Tower': 'Micro ATX', 'SFF / Cube': 'Mini ITX', Άλλο: 'ATX',
};

/** v1 `ESTIMATE`: a chip's length range counts once ≥ 8 cards of ≥ 3 makers are measured; margin 10 mm. */
export const CHIP_ESTIMATE = { cards: 8, makers: 3, marginMm: 10 };

/** Margins (plan, decisions after Phase 0): within this much of a limit, or equal to it, is a warning. */
export const MARGIN = { gpuMm: 10, coolerMm: 5, psuShare: 0.1 };

/** v1 audit D-01: an air cooler "height" under 30 mm is a fan's thickness, so it is not used. */
export const MIN_AIR_COOLER_MM = 30;

/** Fans a board can drive without a hub, when the board doesn't say (plan rule 23: a general note). */
export const TYPICAL_FAN_HEADERS = 3;

/** The plan's power formula (B4): (card + CPU limit + board + sticks + drives + fans + pump) × headroom, rounded up to a step. */
export const POWER = { boardW: 50, perStickW: 5, perDriveW: 8, perFanW: 3, pumpW: 5, headroom: 1.3, roundToW: 50 } as const;
