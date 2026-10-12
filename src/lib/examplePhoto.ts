import type { BaseListing } from '../types';
import type { CategoryConfig } from './categories';
import type { Model } from './data';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9α-ω]/g, '');

/** The model's listings come from several makers, so its one photo is an example (photos exist per model, not per listing). */
export function isExamplePhoto<L extends BaseListing>(
  cfg: Pick<CategoryConfig<L>, 'before' | 'after'>,
  m: Pick<Model<L>, 'listings'>,
): boolean {
  const maker = [...cfg.before, ...cfg.after].find((c) => c.maker)?.maker;
  if (!maker) return false;
  return new Set(m.listings.map((l) => norm(maker(l) ?? '')).filter(Boolean)).size > 1;
}
