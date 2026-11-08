// The product page header's key specs (step 4, task 6): the category table's spec columns that have a value, in
// the table's order, then, when that leaves fewer than four, the category's spec line (ui/specs.ts, the specs the
// v2 cards show) fills in. Never a price: columns worked out from a price (€/TB, per fan) and the "cheapest from"
// maker column are left out. Storage takes its spec line alone (its table packs every spec into one Type cell).
import type { ReactNode } from 'react';
import { groupName, type CategoryConfig } from '../../lib/categories';
import type { Model } from '../../lib/data';
import { tr, type Lang } from '../../lib/i18n';
import type { BaseListing, Category, CoolerListing } from '../../types';
import { specsOf } from '../../ui/specs';
import { UI } from '../../ui/strings';

export interface KeySpec {
  key: string;
  label: string;
  value: ReactNode;
}

/** At least this many specs when the category has them (the brief: 4–5). */
export const MIN_SPECS = 4;

/**
 * The entries that fill in after the columns, per category: indexes into specsOf's list, 'group' = the category
 * page's group (its pills and row dot, labelled as the pills are), 'rgb' = whether a listing says RGB; only specs
 * the columns don't already show.
 * - gpu: VRAM, Memory + length, PSU ≥
 * - cpu: Cores, Socket + graphics, TDP
 * - mobo: Chipset, Socket, Size, Memory (four already)
 * - ram: Type (Desktop / Laptop), CL + memory type (DDR5…), kit, speed
 * - psu: Type + power, efficiency, cables
 * - case: Size, Max board + card ≤, cooler ≤
 * - fan: Pack + size, connector, RGB
 * - cooler: Type + height (air only: an AIO's Type already names its radiator), sockets, RGB
 * - storage: the spec line alone (LINE_ONLY): type, size, read speed + DRAM (SSD) / rpm + cache (HDD)
 */
export const FILL: Record<Category, (number | 'group' | 'rgb')[]> = {
  gpu: [1, 2],
  cpu: [2, 3],
  mobo: [],
  ram: ['group', 1, 2],
  psu: [0, 1, 2],
  case: [2, 3],
  fan: [0, 2, 3],
  cooler: [1, 2, 'rgb'],
  storage: [0, 1, 2, 3],
  monitor: [], // hidden until Phase 3 decides the key specs
};

/** Categories whose header takes no table column, only the FILL entries (storage: one composite Type cell). */
export const LINE_ONLY: ReadonlySet<Category> = new Set(['storage']);

/** Spec-line labels shown otherwise in the header ("rpm" → "RPM"; the rest get a capital first letter). */
const LABELS: Record<string, string> = { rpm: 'RPM' };

const blank = (v: ReactNode) => v == null || v === '' || v === '—';
const upperFirst = (s: string, lang: Lang) => LABELS[s] ?? s.charAt(0).toLocaleUpperCase(lang) + s.slice(1);

/**
 * A spec-line value without the label it carries ("TDP 65 W" → "65 W", "256 MB cache" → "256 MB", "7.200 rpm" →
 * "7.200"): the header shows the label above it. A value that is just its label ("DRAM", "RGB") is a yes.
 */
function bare(v: string, label: string, lang: Lang): string {
  if (v === label) return tr(lang, UI.specYes);
  if (v.startsWith(`${label} `)) return v.slice(label.length + 1);
  if (v.endsWith(` ${label}`)) return v.slice(0, -label.length - 1);
  return v;
}

export function keySpecs(cfg: CategoryConfig<BaseListing>, m: Model<BaseListing>, lang: Lang): KeySpec[] {
  const columns: KeySpec[] = LINE_ONLY.has(cfg.id)
    ? []
    : [...cfg.before, ...cfg.after]
        .filter((c) => !c.fromPrice && !c.maker)
        .map((c) => ({ key: tr('en', c.header), label: tr(lang, c.header), value: c.cell(m, lang) }))
        .filter(({ value }) => !blank(value));
  if (columns.length >= MIN_SPECS) return columns;
  const line = specsOf(cfg.id, m.listings, lang);
  // The cooler Type column says "AIO 360mm" for an AIO: its spec line's radiator (entry 1) would repeat it.
  const aio = cfg.id === 'cooler' && (m.cheapest as unknown as CoolerListing).type === 'AIO';
  const fill: KeySpec[] = [];
  for (const i of FILL[cfg.id]) {
    const key = `fill-${i}`;
    if (i === 'group') {
      if (m.group) fill.push({ key, label: tr(lang, cfg.groupLabel), value: groupName(m.group, lang) });
    } else if (i === 'rgb') {
      const rgb = m.listings.some((l) => (l as BaseListing & { rgb?: boolean }).rgb);
      fill.push({ key, label: 'RGB', value: tr(lang, rgb ? UI.specYes : UI.noRgb) });
    } else {
      const s = line[i];
      if (!s || s.value == null || (aio && i === 1)) continue;
      fill.push({ key, label: upperFirst(s.label, lang), value: bare(s.value, s.label, lang) });
    }
  }
  return [...columns, ...fill];
}
