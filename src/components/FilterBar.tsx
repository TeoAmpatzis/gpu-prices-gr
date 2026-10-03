import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, RotateCcw, Search } from 'lucide-react';
import type { BaseListing } from '../types';
import { defaultFilters, type Filters, type SortKey } from '../lib/data';
import type { FacetCounts } from '../lib/facets';
import { groupName, segmentOptions, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Text } from '../lib/i18n';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';
import SortHelp from './SortHelp';

/** Search waits this long after the last keystroke before filtering (ms). */
const SEARCH_DELAY = 150;

const SORTS: { value: SortKey; label: Text }[] = [
  { value: 'model', label: T.sortModel },
  { value: 'price-asc', label: T.sortPriceAsc },
  { value: 'price-desc', label: T.sortPriceDesc },
  { value: 'offers', label: T.sortOffers },
  { value: 'discount', label: T.sortDiscount },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/** Multi-select chip with its faceted count; a chip that would show nothing is greyed out and inert. */
function Chip({
  active,
  dot,
  count,
  onClick,
  children,
}: {
  active: boolean;
  dot?: string;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={empty}
      onClick={onClick}
      className={`tap inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-accent/10 text-accent ring-accent dark:ring-accent/30'
          : 'text-muted ring-line-strong enabled:hover:bg-hover enabled:hover:text-fg enabled:hover:ring-muted dark:enabled:hover:ring-line-strong'
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {children}
      {count != null && <span className="text-xs tabular-nums text-faint">{count}</span>}
    </button>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-3">
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  filters: Filters;
  onChange: (f: Filters) => void;
  /** Options of each extra filter (computed once per data load). */
  options: Record<string, { value: string; label: Text }[]>;
  /** Faceted counts; missing while they are being computed. */
  counts?: FacetCounts;
  /** Inside the phone bottom sheet: no card frame and no own title row. */
  bare?: boolean;
}

/** Filters: search + sort, group pills, segment, sales, sources, category-specific specs, max price. */
export default function FilterBar<L extends BaseListing>({ cfg, filters: f, onChange, options, counts, bare }: Props<L>) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...f, [k]: v });

  // Search: the box updates at once, the results 150 ms after the last keystroke.
  const [query, setQuery] = useState(f.query);
  const latest = useRef({ f, onChange });
  latest.current = { f, onChange };
  const sent = useRef(f.query);
  useEffect(() => {
    // A change that didn't come from typing here (reset, a removed chip, the URL) replaces the text.
    if (f.query !== sent.current) {
      sent.current = f.query;
      setQuery(f.query);
    }
  }, [f.query]);
  useEffect(() => {
    if (query === sent.current) return;
    const id = setTimeout(() => {
      sent.current = query;
      latest.current.onChange({ ...latest.current.f, query });
    }, SEARCH_DELAY);
    return () => clearTimeout(id);
  }, [query]);
  const segments = segmentOptions(cfg);
  const sorts = cfg.capacityTb ? [...SORTS, { value: 'per-tb' as const, label: T.sortPerTb }] : SORTS;

  return (
    <div className={bare ? 'flex flex-col gap-3' : 'card flex flex-col gap-3 p-4'}>
      {!bare && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t(T.filters)}</span>
          <button
            type="button"
            onClick={() => onChange({ ...defaultFilters(cfg.groups), per: f.per })}
            className="tap inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted edge transition hover:bg-hover hover:text-fg dark:ring-0"
            title={t(T.resetTitle)}
          >
            <RotateCcw className="h-4 w-4" /> {t(T.reset)}
          </button>
        </div>
      )}
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(cfg.searchPlaceholder)}
          aria-label={t(T.search)}
          className="field w-full text-ellipsis py-2 pl-9 pr-3"
        />
      </label>
      <div className="relative flex items-center gap-2">
        <select
          className="field min-w-0 flex-1 px-3 py-2"
          value={f.sort}
          onChange={(e) => set('sort', e.target.value as SortKey)}
          aria-label={t(T.sortLabel)}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.label)}
            </option>
          ))}
        </select>
        <SortHelp />
      </div>

      <Section label={t(cfg.groupLabel)}>
        {cfg.groups.map((g) => (
          <Chip
            key={g}
            active={f.groups.includes(g)}
            dot={cfg.groupDot[g]}
            count={counts?.groups[g]}
            onClick={() => set('groups', toggle(f.groups, g))}
          >
            {groupName(g, lang)}
          </Chip>
        ))}
      </Section>

      {cfg.segments && (
        <Section label={t(T.segment)}>
          {/* Each option is as wide as its label (count below it), so long labels such as
              "Server / Workstation" wrap inside the control instead of pushing out of the panel. */}
          <div className="flex w-full gap-0.5 rounded-lg bg-hover p-0.5 ring-1 ring-inset ring-edge">
            {segments.map((c) => {
              const n = counts?.segment[c.value];
              const selected = f.segment === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={n === 0 && !selected}
                  onClick={() => set('segment', c.value)}
                  className={`tap flex min-w-0 flex-auto flex-col items-center justify-center rounded-md px-1.5 py-1 text-center text-sm font-medium leading-tight transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected ? 'bg-panel text-fg shadow-sm ring-1 ring-accent dark:ring-line' : 'text-muted enabled:hover:text-fg'
                  }`}
                >
                  <span className="max-w-full [overflow-wrap:anywhere]">{t(c.label)}</span>
                  {n != null && <span className="text-xs tabular-nums text-faint">{n}</span>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section label={t(T.sales)}>
        <Chip active={f.saleOnly} dot="bg-sale-fg" count={counts?.sale} onClick={() => set('saleOnly', !f.saleOnly)}>
          {t(T.saleOnly)}
        </Chip>
        <Chip active={f.lowOnly} dot="bg-low-fg" count={counts?.low} onClick={() => set('lowOnly', !f.lowOnly)}>
          {t(T.lowOnly)}
        </Chip>
      </Section>

      <Section label={t(T.source)}>
        {SOURCE_NAMES.map((s) => (
          <Chip
            key={s}
            active={f.sources.includes(s)}
            count={counts?.sources[s]}
            onClick={() => set('sources', toggle(f.sources, s))}
          >
            {SOURCES[s].label}
          </Chip>
        ))}
      </Section>

      <Section label={t(T.specsPrice)}>
        <div className="flex w-full flex-col gap-2.5">
          {cfg.extraFilters.map((x) => (
            <label key={x.key} className="flex flex-col gap-1">
              <span className="text-xs text-muted">{t(x.label)}</span>
              <select
                className="field w-full px-2.5 py-1.5"
                value={f.extra[x.key] ?? ''}
                onChange={(e) => set('extra', { ...f.extra, [x.key]: e.target.value })}
              >
                <option value="">{t(T.any)}</option>
                {(options[x.key] ?? []).map((o) => {
                  const n = counts?.extra[x.key]?.[o.value];
                  // Options that would show nothing are disabled (the selected one never is).
                  return (
                    <option key={o.value} value={o.value} disabled={n === 0 && f.extra[x.key] !== o.value}>
                      {t(o.label)}
                      {n != null ? ` (${n})` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t(T.maxPriceLabel)}</span>
            <span className="relative">
              <input
                type="number"
                min={0}
                step={50}
                value={f.maxPrice ?? ''}
                onChange={(e) => set('maxPrice', e.target.value === '' ? null : Number(e.target.value))}
                placeholder={t(T.maxPrice)}
                className="field w-full py-1.5 pl-2.5 pr-7"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-faint">
                €
              </span>
            </span>
          </label>
        </div>
      </Section>
    </div>
  );
}
