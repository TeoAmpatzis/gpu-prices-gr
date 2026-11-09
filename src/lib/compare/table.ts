import type { BaseListing, Category } from '../../types';
import { specGroups, SPEC_GROUP_ORDER, type SpecGroupId } from '../../ui/specs';
import { formatPrice } from '../format';
import type { Lang } from '../i18n';
import { availabilityOf, offerTotal } from '../offers';
import type { CompareRef } from './refs';

/** One compared product: the listings it stands for (a family's all, or just the exact listing selected). */
export interface CompareItem {
  ref: CompareRef;
  listings: readonly BaseListing[];
}

/** same: every item states it and they are equal; differs: all state it, not equal; partial: some items do not state it. */
export type RowStatus = 'same' | 'differs' | 'partial' | 'none';

export interface CompareRow {
  id: string;
  label: string;
  group: SpecGroupId | 'price';
  values: (string | null)[];
  /** Per item, e.g. "from the shop page" (specs.ts); undefined = none. */
  tags: (string | undefined)[];
  status: RowStatus;
  /** Price rows only: the one item with the strictly lowest known amount, when every item's amount is known. */
  lower?: number;
}

const statusOf = (values: (string | null)[]): RowStatus => {
  const known = values.filter((v) => v != null);
  if (known.length === 0) return 'none';
  if (known.length < values.length) return 'partial';
  return known.every((v) => v === known[0]) ? 'same' : 'differs';
};

/** Index of the single lowest amount, when all amounts are known and there is no tie for it. */
function strictLowest(amounts: (number | null)[]): number | undefined {
  if (amounts.length < 2 || amounts.some((n) => n == null)) return undefined;
  const nums = amounts as number[];
  const min = Math.min(...nums);
  return nums.filter((n) => n === min).length === 1 ? nums.indexOf(min) : undefined;
}

const PRICE_LABELS = {
  price: { el: 'Χαμηλότερη τιμή', en: 'Lowest price' },
  total: { el: 'Χαμηλότερο σύνολο με αποστολή', en: 'Lowest total with delivery' },
  availability: { el: 'Διαθεσιμότητα', en: 'Availability' },
} as const;

/**
 * The comparison rows of one category: the product page's spec rows (ui/specs.ts), aligned by label, then the
 * price rows. No winner is chosen: only the two money rows get a "lower" marker, and only when every amount is known.
 * An unknown total stays unknown; availability is shown only when an offer actually states it.
 */
export function buildTable(cat: Category, items: readonly CompareItem[], lang: Lang): { rows: CompareRow[] } {
  const rows: CompareRow[] = [];
  const perItem = items.map((it) => specGroups(cat, [...it.listings], lang));
  for (const group of SPEC_GROUP_ORDER) {
    const labels: string[] = [];
    for (const groups of perItem) for (const g of groups) if (g.id === group) for (const i of g.items) if (!labels.includes(i.label)) labels.push(i.label);
    for (const label of labels) {
      const found = perItem.map((groups) => groups.find((g) => g.id === group)?.items.find((i) => i.label === label));
      const values = found.map((f) => f?.value ?? null);
      rows.push({ id: `${group}:${label}`, label, group, values, tags: found.map((f) => f?.tag), status: statusOf(values) });
    }
  }
  const prices = items.map((it) => (it.listings.length ? Math.min(...it.listings.map((l) => l.price)) : null));
  const totals = items.map((it) => {
    const known = it.listings.map(offerTotal).filter((n): n is number => n != null);
    return known.length ? Math.min(...known) : null;
  });
  const money = (id: 'price' | 'total', amounts: (number | null)[]): CompareRow => {
    const values = amounts.map((n) => (n == null ? null : formatPrice(n, lang)));
    return { id: `price:${id}`, label: PRICE_LABELS[id][lang], group: 'price', values, tags: [], status: statusOf(values), lower: strictLowest(amounts) };
  };
  rows.push(money('price', prices), money('total', totals));
  const stock = items.map((it) => it.listings.map(availabilityOf).find((v) => v != null) ?? null);
  if (stock.some((v) => v != null)) {
    rows.push({ id: 'price:availability', label: PRICE_LABELS.availability[lang], group: 'price', values: stock, tags: [], status: statusOf(stock) });
  }
  return { rows };
}

/** "Hide identical" hides only rows every item states and that are equal; "hide unknown" only rows no item states. */
export const visibleRows = (rows: readonly CompareRow[], o: { hideIdentical: boolean; hideUnknown: boolean }): CompareRow[] =>
  rows.filter((r) => !(o.hideIdentical && r.status === 'same') && !(o.hideUnknown && r.status === 'none'));
