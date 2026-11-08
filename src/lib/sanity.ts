// Suspect prices (design 2026-11-08 WS1). One wrong price (a PSU class at €28.66 among ~€140, a 4 GB RAM kit at
// €465) sets a model's cheapest price, its Recommended score, its "value" and the builder's pick. A listing whose price is
// far from the other listings of its own model (PSU and RAM models are spec classes, so their listings are peers too)
// is a probable wrong price: it is left out of the derived files and reported, never shown as a deal.

/** Below this share of the peers' median price. (0.4 flagged 1.2% of the real data, mostly natural spread inside RAM and PSU classes; 0.25 flags 0.4%.) */
export const PEER_LOW = 0.25;
/** Above this multiple of the peers' median price. */
export const PEER_HIGH = 5;
/** A model needs at least this many OTHER listings before any of its listings is judged. */
export const MIN_PEERS = 3;

export interface Suspect {
  id: string;
  source: string;
  price: number;
  peerMedian: number;
  rule: 'low' | 'high';
}

interface Priced {
  id: string;
  source: string;
  price: number;
}

/** Same key the site uses to tell one source's product from another's. */
export const listingKey = (l: { id: string; source: string }) => `${l.source}\u0000${l.id}`;

const median = (sorted: number[]) => {
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** The suspect listings by `listingKey`, in input order. `modelKey` groups listings into models. */
export function suspectListings<L extends Priced>(listings: L[], modelKey: (l: L) => string): Map<string, Suspect> {
  const groups = new Map<string, L[]>();
  for (const l of listings) {
    const k = modelKey(l);
    const g = groups.get(k);
    if (g) g.push(l);
    else groups.set(k, [l]);
  }
  const out = new Map<string, Suspect>();
  for (const g of groups.values()) {
    if (g.length <= MIN_PEERS) continue;
    const sorted = g.map((l) => l.price).sort((a, b) => a - b);
    for (const l of g) {
      // Median of the OTHER listings: remove one occurrence of this price from the sorted prices.
      const without = sorted.slice();
      without.splice(without.indexOf(l.price), 1);
      const peers = median(without);
      const rule = l.price < peers * PEER_LOW ? 'low' : l.price > peers * PEER_HIGH ? 'high' : null;
      if (rule) out.set(listingKey(l), { id: l.id, source: l.source, price: l.price, peerMedian: peers, rule });
    }
  }
  return out;
}
