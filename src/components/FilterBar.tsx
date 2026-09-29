import { RotateCcw, Search } from 'lucide-react';
import type { Brand } from '../types';
import { DEFAULT_FILTERS, type Category, type Filters, type SortKey } from '../lib/data';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';

const BRANDS: Brand[] = ['NVIDIA', 'AMD', 'Intel'];
const VRAM_OPTIONS = [0, 8, 12, 16, 24];
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'all', label: 'Όλες' },
];
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
    active ? 'bg-zinc-100 text-zinc-900 ring-zinc-100' : 'text-zinc-400 ring-zinc-700 hover:text-zinc-100'
  }`;

const select =
  'rounded-md bg-zinc-900 px-2 py-1.5 text-sm ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-zinc-400';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar({ filters: f, onChange }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...f, [k]: v });

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-zinc-900/60 p-3 ring-1 ring-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={f.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Αναζήτηση (π.χ. 5070 Ti, Sapphire)"
            className="w-full rounded-md bg-zinc-950 py-1.5 pl-8 pr-3 text-sm ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:ring-zinc-400"
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
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
          title="Επαναφορά φίλτρων"
        >
          <RotateCcw className="h-4 w-4" /> Επαναφορά
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex gap-1.5">
          {BRANDS.map((b) => (
            <button key={b} className={pill(f.brands.includes(b))} onClick={() => set('brands', toggle(f.brands, b))}>
              {b}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c.value} className={pill(f.category === c.value)} onClick={() => set('category', c.value)}>
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
        <select className={select} value={f.minVram} onChange={(e) => set('minVram', Number(e.target.value))}>
          {VRAM_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v === 0 ? 'Όλα τα VRAM' : `VRAM ≥ ${v}GB`}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Έως
          <input
            type="number"
            min={0}
            step={50}
            value={f.maxPrice ?? ''}
            onChange={(e) => set('maxPrice', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="€"
            className="w-24 rounded-md bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700 focus:outline-none focus:ring-zinc-400"
          />
          €
        </label>
      </div>
    </div>
  );
}
