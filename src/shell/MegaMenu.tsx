import { tr, useLang } from '../lib/i18n';
import type { Category } from '../types';
import { UI, plural } from '../ui/strings';
import { BUILDER, CATS, GROUPS, TOOLS_TITLE, href } from './nav';

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
        className={`tap flex items-center gap-3 rounded-lg px-2 py-1.5 ${here ? 'bg-brand-subtle text-accent' : 'text-fg hover:bg-hover'}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${here ? 'border-brand-subtle-line bg-panel' : 'border-line bg-sunken'}`}>
          <c.icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{tr(lang, c.name)}</span>
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
    <div id={id} className="ui-pop grid gap-x-4 gap-y-3 p-4 md:grid-cols-[1fr_1fr_0.8fr]">
      {GROUPS.map((g) => (
        <section key={tr('en', g.title)} aria-label={tr(lang, g.title)}>
          <h2 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, g.title)}</h2>
          <ul className="flex flex-col gap-0.5">
            {g.cats.map((c) => (
              <Item key={c} cat={c} current={current} counts={counts} onPick={onPick} />
            ))}
          </ul>
        </section>
      ))}
      <section aria-label={tr(lang, TOOLS_TITLE)}>
        <h2 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, TOOLS_TITLE)}</h2>
        <a
          href={href.builder}
          onClick={onPick}
          aria-current={current === 'builder' ? 'page' : undefined}
          className={`tap flex items-center gap-3 rounded-lg px-2 py-1.5 ${current === 'builder' ? 'bg-brand-subtle text-accent' : 'text-fg hover:bg-hover'}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-solid text-on-brand">
            <BUILDER.icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">{tr(lang, BUILDER.name)}</span>
        </a>
      </section>
    </div>
  );
}
