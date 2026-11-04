// A product page's variants (step 4, task 9; docs/redesign-v2.md "Σελίδα προϊόντος" part 5): the other versions of the
// same product (GPU VRAM, drive capacity, RAM kit, PSU wattage) as one line of chips, the current one selected (not a
// link), each other one a link to its own page with its lowest price.
import { useMemo } from 'react';
import { formatPrice } from '../../lib/data';
import { tr, useLang } from '../../lib/i18n';
import type { Category, ModelEntry } from '../../types';
import { variantChips } from './variantChips';
import { PRODUCT } from './productStrings';

export function Variants({ cat, entry }: { cat: Category; entry: ModelEntry }) {
  const lang = useLang();
  const chips = useMemo(() => variantChips(entry), [entry]);
  if (entry.variants.length === 0) return null;
  return (
    <section aria-label={tr(lang, PRODUCT.variants)} data-variants className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">{tr(lang, PRODUCT.variants)}</h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <li key={c.slug ?? 'current'}>
            {c.current ? (
              <span
                aria-current="true"
                data-variant-current
                className="tap inline-flex items-center rounded-lg bg-panel px-3 py-1.5 text-sm font-semibold text-fg ring-2 ring-accent"
              >
                {c.label}
              </span>
            ) : (
              <a
                href={`/${cat}/${c.slug}`}
                data-variant
                className="tap inline-flex items-center gap-2 rounded-lg bg-panel px-3 py-1.5 text-sm font-medium text-fg-soft ring-1 ring-edge transition hover:text-fg hover:ring-edge-hover"
              >
                <span>{c.label}</span>
                {c.price != null && <span className="ui-num text-xs text-muted">{formatPrice(c.price, lang)}</span>}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
