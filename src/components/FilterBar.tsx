import type { ReactNode } from 'react';
import { Check, RotateCcw, Search } from 'lucide-react';
import type { BaseListing } from '../types';
import { defaultFilters, type Filters, type Segment, type SortKey } from '../lib/data';
import { groupName, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Text } from '../lib/i18n';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';

const SORTS: { value: SortKey; label: Text }[] = [
  { value: 'model', label: T.sortModel },
  { value: 'price-asc', label: T.sortPriceAsc },
  { value: 'price-desc', label: T.sortPriceDesc },
  { value: 'offers', label: T.sortOffers },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/** Multi-select chip. */
function Chip({ active, dot, onClick, children }: { active: boolean; dot?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset transition ${
        active
          ? 'bg-accent/10 text-accent ring-accent/30'
          : 'text-muted ring-line-strong hover:bg-hover hover:text-fg'
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {children}
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
  listings: L[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

/** Filter sidebar: search + sort, group pills, segment, sources, category-specific specs, max price. */
export default function FilterBar<L extends BaseListing>({ cfg, listings, filters: f, onChange }: Props<L>) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...f, [k]: v });
  const segments: { value: Segment; label: Text }[] = cfg.segments
    ? [
        { value: 'main', label: cfg.segments.main },
        { value: 'pro', label: cfg.segments.pro },
        { value: 'all', label: T.all },
      ]
    : [];

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t(T.filters)}</span>
        <button
          type="button"
          onClick={() => onChange(defaultFilters(cfg.groups))}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted transition hover:bg-hover hover:text-fg"
          title={t(T.resetTitle)}
        >
          <RotateCcw className="h-4 w-4" /> {t(T.reset)}
        </button>
      </div>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          value={f.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder={t(cfg.searchPlaceholder)}
          className="field w-full py-2 pl-9 pr-3"
        />
      </label>
      <select className="field w-full px-3 py-2" value={f.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {t(s.label)}
          </option>
        ))}
      </select>

      <Section label={t(cfg.groupLabel)}>
        {cfg.groups.map((g) => (
          <Chip key={g} active={f.groups.includes(g)} dot={cfg.groupDot[g]} onClick={() => set('groups', toggle(f.groups, g))}>
            {groupName(g, lang)}
          </Chip>
        ))}
      </Section>

      {cfg.segments && (
        <Section label={t(T.segment)}>
          <div className="flex w-full rounded-lg bg-hover p-0.5 ring-1 ring-inset ring-line">
            {segments.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={f.segment === c.value}
                onClick={() => set('segment', c.value)}
                className={`flex-1 rounded-md px-2 py-1 text-sm font-medium transition ${
                  f.segment === c.value ? 'bg-panel text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg'
                }`}
              >
                {t(c.label)}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section label={t(T.source)}>
        {SOURCE_NAMES.map((s) => (
          <Chip key={s} active={f.sources.includes(s)} onClick={() => set('sources', toggle(f.sources, s))}>
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
                {x.options(listings).map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.label)}
                  </option>
                ))}
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
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-faint">€</span>
            </span>
          </label>
        </div>
      </Section>
    </div>
  );
}
