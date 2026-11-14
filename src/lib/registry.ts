import type { Slot } from './slots';

/**
 * The category registry: the one list the `Category` union comes from. A category exists in the data and the
 * site (`enabled`/`visible` say whether it is published); `builderSlot` is set only for those that are PC Builder
 * parts. Everything else about a category (filters, specs, texts) stays in its own config. The scraper's list is
 * scraper/category_ids.py; tests/unit/registry.test.ts checks the two agree.
 */
export interface CategoryEntry {
  /** components = parts of a PC; peripherals = things you plug in (no builder slot, never in the engine). */
  domain: 'components' | 'peripherals';
  builderSlot?: Slot;
  /** Supported by code: the data pipeline handles it. Not the same as published (`visible`). */
  enabled: boolean;
  /** Published on the site (navigation, search, sitemap). */
  visible: boolean;
}

const part = (slot: Slot): CategoryEntry => ({ domain: 'components', builderSlot: slot, enabled: true, visible: true });

export const REGISTRY = {
  gpu: part('gpu'),
  cpu: part('cpu'),
  mobo: part('mobo'),
  ram: part('ram'),
  storage: part('storage'),
  psu: part('psu'),
  case: part('case'),
  fan: part('fan'),
  cooler: part('cooler'),
  // Peripherals: never a builder part. Hidden until the monitor data passes its gates (FINAL_PLAN Phase 2).
  monitor: { domain: 'peripherals', enabled: true, visible: true },
  mouse: { domain: 'peripherals', enabled: true, visible: true },
  // Headphones: disabled until the owner approves the first collection (docs/peripherals/HEADPHONES_DESIGN.md).
  headphones: { domain: 'peripherals', enabled: false, visible: false },
} as const satisfies Record<string, CategoryEntry>;

export type Category = keyof typeof REGISTRY;
/** A category that is a builder part: the key type of builder-only maps. */
export type SlotCategory = Extract<Category, Slot>;

/** The builder slot of a category, or null when it is not a builder part. */
export function slotOf(cat: Category): Slot | null {
  return (REGISTRY[cat] as CategoryEntry).builderSlot ?? null;
}
