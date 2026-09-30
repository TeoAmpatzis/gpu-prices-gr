import type { SourceName } from '../types';

/** Label and badge colours per source; the colours are design tokens (src/index.css: --<source>-bg/-fg). */
export const SOURCES: Record<SourceName, { label: string; badge: string }> = {
  skroutz: { label: 'Skroutz', badge: 'bg-skroutz-bg text-skroutz-fg' },
  bestprice: { label: 'BestPrice', badge: 'bg-bestprice-bg text-bestprice-fg' },
  // A shop, not an aggregator: its listings are its own products and prices.
  eshop: { label: 'e-shop.gr', badge: 'bg-eshop-bg text-eshop-fg' },
  shopflix: { label: 'Shopflix', badge: 'bg-shopflix-bg text-shopflix-fg' },
  snif: { label: 'Snif', badge: 'bg-snif-bg text-snif-fg' },
};

export const SOURCE_NAMES = Object.keys(SOURCES) as SourceName[];
