import { useId, useState } from 'react';
import { tr, useLang } from '../lib/i18n';
import { UI, num } from './strings';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export interface Option {
  value: string;
  label: string;
  count: number;
}

/**
 * A filter group as a checkbox list with counts (plan: replaces v1's single-choice dropdowns, UX-11).
 * More than `limit` options: "Show more". From `searchFrom` options: a search box inside the list.
 * An option with 0 results is disabled unless it is ticked.
 */
export function CheckList({
  title,
  options,
  selected,
  onToggle,
  limit = 8,
  searchFrom = 15,
  initialOpen = false,
  initialQuery = '',
}: {
  title: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  limit?: number;
  searchFrom?: number;
  initialOpen?: boolean;
  initialQuery?: string;
}) {
  const lang = useLang();
  const [open, setOpen] = useState(initialOpen);
  const [q, setQ] = useState(initialQuery);
  const listId = useId();
  const matching = q ? options.filter((o) => fold(o.label).includes(fold(q))) : options;
  const shown = open || q ? matching : matching.slice(0, limit);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-fg">{title}</legend>
      {options.length >= searchFrom && (
        <input
          type="search"
          className="ui-field mb-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${tr(lang, UI.searchIn)}: ${title}`}
          aria-label={`${tr(lang, UI.searchIn)}: ${title}`}
          aria-controls={listId}
        />
      )}
      <ul id={listId} className="flex flex-col">
        {shown.map((o) => {
          const on = selected.has(o.value);
          const off = o.count === 0 && !on;
          return (
            <li key={o.value}>
              <label className={`tap flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm hover:bg-hover ${off ? 'cursor-not-allowed text-faint' : 'text-fg'}`}>
                <input type="checkbox" className="ui-check" checked={on} disabled={off} onChange={() => onToggle(o.value)} />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <span className="ui-num text-faint">{num(lang, o.count)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {q && !matching.length && <p className="px-1 py-2 text-sm text-faint">{tr(lang, UI.noOptions)}</p>}
      {!q && matching.length > limit && (
        <button
          type="button"
          className="tap mt-1 px-1 text-sm font-medium text-accent hover:underline"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          {open ? tr(lang, UI.showLess) : `${tr(lang, UI.showMore)} (${num(lang, matching.length - limit)})`}
        </button>
      )}
    </fieldset>
  );
}

/** A range with two thumbs and min/max number inputs (UX-11: v1's price filter had a maximum only). */
export function RangeFilter({
  title,
  min,
  max,
  step = 1,
  unit,
  value,
  onChange,
}: {
  title: string;
  min: number;
  max: number;
  step?: number;
  unit: string;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const lang = useLang();
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const invalid = lo > hi;
  const errId = useId();
  const box = (which: 0 | 1) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
      {tr(lang, which === 0 ? UI.min : UI.max)}
      <span className="relative">
        <input
          type="number"
          inputMode="numeric"
          className="ui-field ui-num pr-7"
          value={which === 0 ? lo : hi}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errId : undefined}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(which === 0 ? [v, hi] : [lo, v]);
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-faint">{unit}</span>
      </span>
    </label>
  );
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-fg">{title}</legend>
      <div className="ui-range">
        <div className="ui-range__track" />
        <div className="ui-range__fill" style={{ left: `${pct(Math.min(lo, hi))}%`, right: `${100 - pct(Math.max(lo, hi))}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${title}: ${tr(lang, UI.min)}`}
          aria-valuetext={`${num(lang, lo)} ${unit}`}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${title}: ${tr(lang, UI.max)}`}
          aria-valuetext={`${num(lang, hi)} ${unit}`}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
        />
      </div>
      <div className="mt-2 flex gap-3">
        {box(0)}
        {box(1)}
      </div>
      {invalid && (
        <p id={errId} className="mt-1.5 text-sm text-danger-fg">
          {tr(lang, UI.rangeInvalid)}
        </p>
      )}
    </fieldset>
  );
}

/** On/off switch: the whole row (label + switch) is one role="switch" button, so the target is large. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
  force,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  force?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-force={force}
      onClick={() => onChange(!checked)}
      className="tap flex min-h-8 w-full items-center justify-between gap-3 rounded-md text-left disabled:cursor-not-allowed"
    >
      <span className="min-w-0">
        <span className={`block text-sm ${disabled ? 'text-faint' : 'text-fg'}`}>{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <span className="ui-switch" data-on={checked} data-disabled={disabled || undefined} aria-hidden="true" />
    </button>
  );
}

/**
 * How much of a category states a filter's spec: "Μήκος γνωστό για 77%" with a thin bar, and the switch
 * that also shows products without the value (plan: filters with coverage, UX-45).
 */
export function CoverageLine({
  field,
  pct,
  showMissing,
  onToggle,
}: {
  field: string;
  pct: number;
  showMissing: boolean;
  onToggle: (v: boolean) => void;
}) {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="ui-num">
          {field} {tr(lang, UI.knownFor)} {num(lang, pct)}%
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span className="block h-full rounded-full bg-muted" style={{ width: `${pct}%` }} />
        </span>
      </div>
      <Toggle label={tr(lang, UI.showMissing)} checked={showMissing} onChange={onToggle} />
    </div>
  );
}
