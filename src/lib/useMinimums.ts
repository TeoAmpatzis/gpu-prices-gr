// What each use of the builder needs at least (step 5 task 10; docs/redesign-v2.md minimums, owner's answer to
// question 6, 25/10): the automatic build and the Recommended order read them. "Not sure" uses the 1080p gaming
// minimums; gaming without a resolution is 1080p.
import type { Resolution, Use } from '../engine/types';
import type { BuilderUseKey } from '../types';

export type UseKey = BuilderUseKey;
export const USE_KEYS: UseKey[] = ['gaming-1080p', 'gaming-1440p', 'gaming-4k', 'everyday', 'creating', 'unsure'];

export interface UseMinimum {
  cores: number;
  /** The CPU must have graphics of its own (no graphics card in this use). */
  igpu: boolean;
  /** Card memory at least (GB); null = no card needed. */
  vramGb: number | null;
  /** RAM in total (GB). */
  ramGb: number;
  /** The first drive: an NVMe of at least this capacity (GB, 1 TB = 1000). */
  storageGb: number;
  /** Graphics card in the automatic build: required, optional (a CPU with graphics can do without), none. */
  card: 'yes' | 'optional' | 'no';
  /** The resolution whose card tiers rank the cards (1080p when the use is not gaming). */
  res: Resolution;
}

const GAMING_1080P: UseMinimum = { cores: 6, igpu: false, vramGb: 8, ramGb: 16, storageGb: 1000, card: 'yes', res: '1080p' };

export const USE_MINIMUMS: Record<UseKey, UseMinimum> = {
  'gaming-1080p': GAMING_1080P,
  'gaming-1440p': { cores: 6, igpu: false, vramGb: 12, ramGb: 32, storageGb: 1000, card: 'yes', res: '1440p' },
  'gaming-4k': { cores: 8, igpu: false, vramGb: 16, ramGb: 32, storageGb: 2000, card: 'yes', res: '4k' },
  everyday: { cores: 6, igpu: true, vramGb: null, ramGb: 16, storageGb: 500, card: 'no', res: '1080p' },
  creating: { cores: 8, igpu: false, vramGb: null, ramGb: 32, storageGb: 2000, card: 'optional', res: '1080p' },
  unsure: GAMING_1080P,
};

/** The builder's use (and resolution) as a key of the tables above; null when no use is chosen. */
export const toUseKey = (kind: Use['kind'] | null | undefined, res?: Resolution | null): UseKey | null =>
  !kind ? null : kind === 'gaming' ? `gaming-${res ?? '1080p'}` : kind;

/** The engine's context for a use key (rules 27–30 speak only for gaming). */
export const engineUseOf = (k: UseKey): Use =>
  k.startsWith('gaming-') ? { kind: 'gaming', res: USE_MINIMUMS[k].res } : { kind: k as Exclude<Use['kind'], 'gaming'> };
