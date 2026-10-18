// A product page's offers (step 4, task 6): the shops table's order and what each row shows beyond the listing.
import type { BaseListing, Latest, SourceName } from '../types';
import { ownTotal } from './data';

/** The shops table shows this many offers until "Show all N" is pressed. */
export const FIRST_OFFERS = 20;

/**
 * The offer's total as the page shows it: price + shipping, when the offer's own shipping is known (data.ownTotal
 * accepts its total), so price + shipping = total on every row, as the price cell writes it; null when unknown.
 * The listing's cached `total` can differ from that sum by up to 2% (ownTotal's margin), so it is not shown itself.
 */
export function offerTotal(l: BaseListing): number | null {
  const own = ownTotal(l);
  return own.total != null && own.shipping != null ? own.price + own.shipping : null;
}

/**
 * The offers in the table's order: by total (offerTotal: price + shipping, when the offer's own shipping is known),
 * else by price; at the same amount an offer with a known total comes first (its shipping is certain), then the lower
 * price, then the id (a stable order). Every offer goes through ownTotal, so a cached total of another offer of the
 * product is unknown here as it is on the category page. The input is not changed.
 */
export function sortOffers<L extends BaseListing>(listings: L[]): L[] {
  return listings
    .map((l) => {
      const own = ownTotal(l);
      return { l: own, t: offerTotal(own) };
    })
    .sort((a, b) => compareOffers(a.l, a.t, b.l, b.t))
    .map(({ l }) => l);
}

function compareOffers(a: BaseListing, at: number | null, b: BaseListing, bt: number | null): number {
  const amount = (at ?? a.price) - (bt ?? b.price);
  if (amount !== 0) return amount;
  const known = (at == null ? 1 : 0) - (bt == null ? 1 : 0);
  if (known !== 0) return known;
  if (a.price !== b.price) return a.price - b.price;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The offer's availability as its site states it, or null. No source collects it yet (backlog B8), so the listings
 * have no such field today and the column stays hidden; once a source adds it, the column appears.
 */
export function availabilityOf(l: BaseListing): string | null {
  const v = (l as BaseListing & { availability?: unknown }).availability;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** The availability column is shown only when at least one offer states it. */
export const hasAvailability = (listings: BaseListing[]): boolean => listings.some((l) => availabilityOf(l) != null);

/** When the offer's price was read: its source's last update (the model chunk's `sources`), or null when unknown. */
export const checkedAt = (sources: Latest['sources'], source: SourceName): string | null => sources[source]?.updatedAt ?? null;
