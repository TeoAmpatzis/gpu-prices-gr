// The variants line of a product page (step 4, task 9). The model chunk lists the OTHER versions of a product
// (ModelEntry.variants: label, order, price) and the model's own label and order (variantLabel, variantOrder), all from
// src/lib/derive.ts: the line is those chips sorted by order, the current model among them.
import type { ModelEntry } from '../../types';

export interface VariantChip {
  label: string;
  current: boolean;
  slug: string | null;
  price: number | null;
}

/** The chips of the line, smallest first, the current model (not a link) among them. */
export function variantChips(entry: Pick<ModelEntry, 'variants' | 'variantLabel' | 'variantOrder'>): VariantChip[] {
  const chips: { order: number; chip: VariantChip }[] = entry.variants.map((v) => ({ order: v.order, chip: { label: v.label, current: false, slug: v.slug, price: v.price } }));
  if (entry.variantLabel != null && entry.variantOrder != null) {
    chips.push({ order: entry.variantOrder, chip: { label: entry.variantLabel, current: true, slug: null, price: null } });
  }
  return chips.sort((a, b) => a.order - b.order).map((c) => c.chip);
}
