import { RotateCcw, Search } from 'lucide-react';
import type { BaseListing } from '../types';
import { defaultFilters, type Filters, type Segment, type SortKey } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'model', label: 'Μοντέλο' },
  { value: 'price-asc', label: 'Τιμή ↑' },
  { value: 'price-desc', label: 'Τιμή ↓' },
  { value: 'offers', label: 'Περισσότερα προϊόντα' },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

const pill = (active: boolean) =>
  `rounded-md px-2.5 py-1.5 text-sm ring-1 ring-inset transition ${
    active ? 'bg-fg text-page ring-fg' : 'text-muted ring-line-strong hover:text-fg'
  }`;

const select =
  'rounded-md bg-surface px-2 py-1.5 text-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-faint';

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  listings: L[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar<L extends BaseListing>({ cfg, listings, filters: f, onChange }: Props<L>) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...f, [k]: v });
  const segments: { value: Segment; label: string }[] = [
    { value: 'main', label: cfg.segments.main },
    { value: 'pro', label: cfg.segments.pro },
    { value: 'all', label: 'Όλα' },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface/60 p-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={f.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={cfg.searchPlaceholder}
            className="w-full rounded-md bg-sunken py-1.5 pl-8 pr-3 text-sm ring-1 ring-inset ring-line-strong placeholder:text-faint focus:outline-none focus:ring-faint"
          />
        </label>
        <select className={select} value={f.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Ταξινόμηση: {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onChange(defaultFilters(cfg.brands))}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted hover:text-fg"
          title="Επαναφορά φίλτρων"
        >
          <RotateCcw className="h-4 w-4" /> Επαναφορά
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex gap-1.5">
          {cfg.brands.map((b) => (
            <button key={b} className={pill(f.brands.includes(b))} onClick={() => set('brands', toggle(f.brands, b))}>
              {b}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {segments.map((c) => (
            <button key={c.value} className={pill(f.segment === c.value)} onClick={() => set('segment', c.value)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {SOURCE_NAMES.map((s) => (
            <button key={s} className={pill(f.sources.includes(s))} onClick={() => set('sources', toggle(f.sources, s))}>
              {SOURCES[s].label}
            </button>
          ))}
        </div>
        {cfg.extraFilters.map((x) => (
          <select
            key={x.key}
            className={select}
            value={f[x.key]}
            onChange={(e) => onChange({ ...f, [x.key]: x.key === 'socket' ? e.target.value : Number(e.target.value) })}
          >
            {x.options(listings).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        <label className="flex items-center gap-2 text-sm text-muted">
          Έως
          <input
            type="number"
            min={0}
            step={50}
            value={f.maxPrice ?? ''}
            onChange={(e) => set('maxPrice', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="€"
            className="w-24 rounded-md bg-sunken px-2 py-1.5 text-sm text-fg ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-faint"
          />
          €
        </label>
      </div>
    </div>
  );
}
