// A product page's alternatives (step 4, task 9; part 7): "Same, cheaper" (same kind, at least 5% cheaper) and "Better
// value" (within ±10% of the price, higher value score), each a short list of links with photo, name and price. The
// next-tier list waits for step 5.
import type { LucideIcon } from 'lucide-react';
import { formatPrice } from '../../lib/data';
import { tr, useLang, type Text } from '../../lib/i18n';
import { productImage } from '../../lib/images';
import type { Category, ModelEntry } from '../../types';
import { UI } from '../../ui/strings';
import ProductPhoto from '../ProductPhoto';

const LISTS: { kind: 'cheaper' | 'value'; title: Text }[] = [
  { kind: 'cheaper', title: UI.altCheaper },
  { kind: 'value', title: UI.altValue },
];

export function Alternatives({ cat, icon, alternatives }: { cat: Category; icon: LucideIcon; alternatives: ModelEntry['alternatives'] }) {
  const lang = useLang();
  const lists = LISTS.map((l) => ({ ...l, items: alternatives.filter((a) => a.kind === l.kind) })).filter((l) => l.items.length > 0);
  if (lists.length === 0) return null;
  return (
    <section aria-label={tr(lang, UI.alternativesTitle)} data-alternatives className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{tr(lang, UI.alternativesTitle)}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {lists.map((l) => (
          <div key={l.kind} data-alt-list={l.kind} className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{tr(lang, l.title)}</h3>
            <ul className="flex flex-col gap-2">
              {l.items.map((a) => (
                <li key={a.key}>
                  <a
                    href={`/${cat}/${a.slug}`}
                    data-alt
                    className="tap flex items-center gap-3 rounded-xl bg-panel p-2 pr-3 ring-1 ring-edge transition hover:ring-edge-hover"
                  >
                    <ProductPhoto image={productImage(cat, a.key, a.img)} size="md" icon={icon} alt="" />
                    <span className="min-w-0 flex-1 text-sm font-medium text-fg [overflow-wrap:anywhere]">{a.chip}</span>
                    <span className="ui-num shrink-0 text-sm font-semibold text-fg">{formatPrice(a.price, lang)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
