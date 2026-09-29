import type { SourceName } from '../types';

export const SOURCES: Record<SourceName, { label: string; badge: string; color: string }> = {
  skroutz: {
    label: 'Skroutz',
    badge: 'bg-skroutz/15 text-orange-700 ring-skroutz/30 dark:text-skroutz',
    color: '#f68b24',
  },
  bestprice: {
    label: 'BestPrice',
    badge: 'bg-bestprice/15 text-blue-700 ring-bestprice/30 dark:text-blue-400',
    color: '#3b82f6',
  },
};

export const SOURCE_NAMES = Object.keys(SOURCES) as SourceName[];
