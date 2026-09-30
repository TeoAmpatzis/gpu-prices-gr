import type { SourceName } from '../types';

export const SOURCES: Record<SourceName, { label: string; badge: string; color: string }> = {
  skroutz: {
    label: 'Skroutz',
    badge: 'bg-skroutz/15 text-orange-800 ring-skroutz/40 dark:text-skroutz',
    color: '#f68b24',
  },
  bestprice: {
    label: 'BestPrice',
    badge: 'bg-bestprice/10 text-blue-800 ring-bestprice/40 dark:bg-bestprice/15 dark:text-blue-400',
    color: '#3b82f6',
  },
  // A shop, not an aggregator: its listings are its own products and prices.
  eshop: {
    label: 'e-shop.gr',
    badge: 'bg-eshop/10 text-rose-800 ring-eshop/40 dark:bg-eshop/15 dark:text-rose-400',
    color: '#e11d48',
  },
  shopflix: {
    label: 'Shopflix',
    badge: 'bg-shopflix/10 text-violet-800 ring-shopflix/40 dark:bg-shopflix/15 dark:text-violet-400',
    color: '#7c3aed',
  },
  snif: {
    label: 'Snif',
    badge: 'bg-snif/10 text-cyan-800 ring-snif/40 dark:bg-snif/15 dark:text-cyan-400',
    color: '#0891b2',
  },
};

export const SOURCE_NAMES = Object.keys(SOURCES) as SourceName[];
