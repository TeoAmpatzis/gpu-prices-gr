import { ArrowRight, Search, X, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { formatPrice } from '../lib/format';
import { matchCategories, search, type Group, type PreparedIndex } from '../lib/search';
import type { Category } from '../types';
import { UI, num } from './strings';

export interface SearchSetup {
  /** Starts loading the index (called on hover, focus or touch); resolves to the prepared index. */
  load: () => Promise<PreparedIndex>;
  sections: { id: Category | 'builder'; name: Text; icon: LucideIcon; words: string[] }[];
  href: {
    section: (id: Category | 'builder') => string;
    model: (cat: Category, name: string) => string;
    all: (cat: Category, q: string) => string;
    maker: (cat: Category, maker: string) => string;
  };
  /** Opens a link (the router's navigate at Stop 3). */
  go: (href: string) => void;
}

interface Opt {
  id: string;
  href: string;
  kind: 'section' | 'model' | 'all' | 'maker';
  label: string;
  meta?: string;
  icon?: LucideIcon;
}

/**
 * The global search (combobox pattern, WAI-ARIA 1.2): suggestions grouped by category as you type, ↑/↓ to
 * move, Enter to open, Esc to close (then to clear). The index loads on first hover/focus/touch only.
 * Categories (and the PC Builder) answer at once, before the index arrives.
 */
export function SearchBox({
  setup,
  variant = 'header',
  initialQuery = '',
  initialOpen = false,
  autoFocus = false,
}: {
  setup: SearchSetup;
  variant?: 'header' | 'large' | 'panel';
  initialQuery?: string;
  initialOpen?: boolean;
  autoFocus?: boolean;
}) {
  const lang = useLang();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(initialOpen);
  const [index, setIndex] = useState<PreparedIndex | null>(null);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  const warm = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    setup.load().then(setIndex, () => {
      loading.current = false;
    });
  }, [setup]);
  // A box that opens pre-filled (catalogue, phone panel) loads the index at once.
  useEffect(() => {
    if (initialOpen || initialQuery) warm();
  }, [initialOpen, initialQuery, warm]);
  useEffect(() => {
    const away = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const sectionHits = useMemo(
    () => matchCategories(q, setup.sections.map((s) => ({ cat: s.id, words: [tr('el', s.name), tr('en', s.name), ...s.words] }))),
    [q, setup.sections],
  );
  const groups: Group[] = useMemo(() => (index && q.trim() ? search(index, q) : []), [index, q]);

  const sectionOf = (id: Category | 'builder') => setup.sections.find((s) => s.id === id)!;
  const opts: { title?: string; icon?: LucideIcon; items: Opt[] }[] = [];
  if (sectionHits.length) {
    opts.push({
      title: tr(lang, UI.categories),
      items: sectionHits.map((id) => ({ id: `s-${id}`, href: setup.href.section(id), kind: 'section', label: tr(lang, sectionOf(id).name), icon: sectionOf(id).icon })),
    });
  }
  for (const g of groups) {
    const s = sectionOf(g.cat);
    opts.push({
      title: tr(lang, s.name),
      icon: s.icon,
      items: [
        ...g.makers.map((m) => ({ id: `k-${g.cat}-${m}`, href: setup.href.maker(g.cat, m), kind: 'maker' as const, label: m, meta: tr(lang, UI.maker) })),
        ...g.hits.map((h, i) => ({
          id: `m-${g.cat}-${i}`,
          href: setup.href.model(g.cat, h.name),
          kind: 'model' as const,
          label: h.name,
          meta: `${tr(lang, UI.from)} ${formatPrice(h.price, lang)}`,
        })),
        ...(g.total > g.hits.length
          ? [{ id: `a-${g.cat}`, href: setup.href.all(g.cat, q), kind: 'all' as const, label: `${tr(lang, UI.seeAllIn)} ${tr(lang, s.name)} (${num(lang, g.total)})` }]
          : []),
      ],
    });
  }
  const flat = opts.flatMap((g) => g.items);
  const shown = open && q.trim().length > 0;
  const activeOpt = active >= 0 && active < flat.length ? flat[active] : null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (!flat.length) return;
      setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % flat.length : a <= 0 ? flat.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      const target = activeOpt ?? flat.find((o) => o.kind !== 'section') ?? flat[0];
      if (target) {
        e.preventDefault();
        setOpen(false);
        setup.go(target.href);
      }
    } else if (e.key === 'Escape') {
      if (open && q) setOpen(false);
      else setQ('');
      setActive(-1);
    }
  };

  const large = variant === 'large';
  return (
    <div ref={wrapRef} className="relative w-full" onPointerEnter={warm} onTouchStart={warm}>
      <div className="relative">
        <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint ${large ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown && activeOpt ? `${listId}-${activeOpt.id}` : undefined}
          aria-label={tr(lang, UI.searchLabel)}
          placeholder={tr(lang, UI.searchPlaceholder)}
          autoFocus={autoFocus}
          value={q}
          onFocus={() => {
            warm();
            setOpen(true);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKey}
          className={`ui-field pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden ${large ? 'min-h-12 text-base' : ''}`}
        />
        {q && (
          <button
            type="button"
            className="tap-square absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-faint hover:text-fg"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{tr(lang, UI.clearSearch)}</span>
          </button>
        )}
      </div>
      {shown && (
        <div
          className={`ui-pop ui-enter-pop z-40 mt-2 overflow-y-auto p-1.5 ${variant === 'panel' ? 'relative max-h-none border-0 shadow-none' : 'absolute inset-x-0 max-h-[min(70vh,32rem)]'}`}
        >
          <ul id={listId} role="listbox" aria-label={tr(lang, UI.search)}>
            {opts.map((g, gi) => (
              <li key={gi} role="presentation" className={gi > 0 ? 'mt-1 border-t border-line pt-1' : ''}>
                <div id={`${listId}-g${gi}`} className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-faint" role="presentation">
                  {g.icon && <g.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {g.title}
                </div>
                <ul role="group" aria-labelledby={`${listId}-g${gi}`}>
                  {g.items.map((o) => {
                    const i = flat.indexOf(o);
                    const isActive = i === active;
                    return (
                      <li
                        key={o.id}
                        id={`${listId}-${o.id}`}
                        role="option"
                        aria-selected={isActive}
                        onPointerEnter={() => setActive(i)}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setup.go(o.href);
                        }}
                        className={`tap flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${isActive ? 'bg-brand-subtle text-accent' : 'text-fg'}`}
                      >
                        {o.icon && <o.icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
                        <span className={`min-w-0 flex-1 ${o.kind === 'all' ? 'font-medium text-accent' : 'truncate'}`}>{o.label}</span>
                        {o.meta && <span className="ui-num shrink-0 text-xs text-muted">{o.meta}</span>}
                        {(o.kind === 'all' || o.kind === 'section') && <ArrowRight className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {!index && <p className="px-2.5 py-2 text-sm text-faint">{tr(lang, UI.searchLoading)}</p>}
          {index && !flat.length && (
            <p className="px-2.5 py-2 text-sm text-muted">
              {tr(lang, UI.searchNone)} «{q.trim()}»
            </p>
          )}
        </div>
      )}
    </div>
  );
}
