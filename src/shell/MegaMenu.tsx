import { tr, useLang } from '../lib/i18n';
import type { Category } from '../types';
import { UI, plural } from '../ui/strings';
import { CATS, GROUPS, href } from './nav';
import { SHELL } from './texts';

export type Current = Category | 'builder' | null;

/** One category link: icon tile, name, model count; the current one is marked (aria-current). */
function Item({ cat, current, counts, onPick }: { cat: Category; current: Current; counts?: Partial<Record<Category, number>>; onPick?: () => void }) {
  const lang = useLang();
  const c = CATS[cat];
  const here = current === cat;
  return (
    <li>
      <a
        href={href.category(cat)}
        onClick={onPick}
        aria-current={here ? 'page' : undefined}
        className={`tap flex min-h-[66px] items-center gap-3 rounded-xl p-3 ${here ? 'bg-sunken text-fg' : 'text-fg hover:bg-sunken'}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-sunken text-accent">
          <c.icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{tr(lang, c.name)}</span>
          {counts?.[cat] != null && <span className="ui-num block text-xs text-muted">{plural(lang, counts[cat]!, UI.modelForms)}</span>}
        </span>
      </a>
    </li>
  );
}

/**
 * The "Εξαρτήματα" panel (desktop and tablet): Βασικά · Κουτί, ρεύμα και ψύξη · Εργαλεία, with the current
 * section marked (UX-01, UX-02, UX-03). Opened from the header's button; the same groups make the
 * phone tiles page.
 */
export function MegaMenu({ id, current, counts, onPick }: { id?: string; current: Current; counts?: Partial<Record<Category, number>>; onPick?: () => void }) {
  const lang = useLang();
  return (
    <nav id={id} aria-label={tr(lang, UI.parts)} className="ui-pop p-3">
      <ul className="grid gap-1 md:grid-cols-3">
        {GROUPS.flatMap((g) => g.cats).map((cat) => (
          <Item key={cat} cat={cat} current={current} counts={counts} onPick={onPick} />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-3 pb-1 pt-3 text-sm">
        <span className="text-muted">{tr(lang, SHELL.priceSources)}</span>
        <a href={href.parts} onClick={onPick} className="tap inline-flex items-center rounded text-accent underline hover:text-fg">{tr(lang, SHELL.allCategories)}</a>
      </div>
    </nav>
  );
}
