import type { BaseListing, Category } from '../types';
import type { Model } from './data';
import { encodeOfferChoice } from './productSelection';
import { modelSlug } from './slug';

export interface CatalogueProduct<L extends BaseListing = BaseListing> {
  key: string;
  familyKey: string;
  familySlug: string;
  listing: L;
}
/** Presentation only: preserve each source listing and family order without importing builder code. */
export function catalogueProducts<L extends BaseListing>(cat: Category, families: readonly Model<L>[]): CatalogueProduct<L>[] {
  return families.flatMap((family) => {
    const familySlug = modelSlug(cat, family);
    return family.listings.map((listing) => ({ key: encodeOfferChoice(listing), familyKey: family.key, familySlug, listing }));
  });
}
