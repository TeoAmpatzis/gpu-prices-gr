import type { SourceName } from '../types';

export const SOURCES: Record<SourceName, { label: string; badge: string; color: string }> = {
  skroutz: { label: 'Skroutz', badge: 'bg-skroutz/15 text-skroutz ring-skroutz/30', color: '#f68b24' },
  bestprice: { label: 'BestPrice', badge: 'bg-bestprice/15 text-blue-400 ring-bestprice/30', color: '#3b82f6' },
};

export const SOURCE_NAMES = Object.keys(SOURCES) as SourceName[];
