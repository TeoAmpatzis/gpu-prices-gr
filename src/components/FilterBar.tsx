import type { ReactNode } from 'react';
import type { BaseListing } from '../types';
import { clearedFilters, type Filters } from '../lib/data';
import type { FacetCounts } from '../lib/facets';
import { groupName, segmentOptions, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Text } from '../lib/i18n';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';
import { RANGE_FIELDS, RANGE_UNITS } from '../lib/catalogueFilters';
import { RangeSlider } from './catalogue/RangeSlider';
import { UI } from '../ui/strings';

const DEFAULT_BOUNDS: Record<string, { price: [number, number]; numeric?: [number, number]; step?: number }> = {
  gpu: { price: [0, 3000], numeric: [120, 380], step: 5 },
  cpu: { price: [0, 1500], numeric: [35, 350], step: 5 },
  mobo: { price: [0, 800] },
  ram: { price: [0, 1000], numeric: [1600, 8400], step: 100 },
  storage: { price: [0, 1500], numeric: [128, 8000], step: 128 },
  case: { price: [0, 500], numeric: [150, 500], step: 5 },
  psu: { price: [0, 600], numeric: [300, 1600], step: 50 },
  cooler: { price: [0, 400], numeric: [30, 190], step: 2 },
  'case-fan': { price: [0, 150] },
};

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  filters: Filters;
  onChange: (f: Filters) => void;
  options: Record<string, { value: string; label: Text }[]>;
  counts?: FacetCounts;
  bare?: boolean;
  top?: ReactNode;
  onSkip?: () => void;
  coverage?: number;
  bounds?: {
    price?: [number, number];
    numeric?: [number, number];
  };
}
/** A source-product filter sidebar; sheet edits use the parent's isolated draft. */
export default function FilterBar<L extends BaseListing>({ cfg, filters: f, onChange, options, counts, bare, top, onSkip, coverage, bounds }: Props<L>) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...f, [key]: value });
  const toggle = <V,>(values: V[], value: V) => (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  const range = RANGE_FIELDS[cfg.id as keyof typeof RANGE_FIELDS];
  const fallback = DEFAULT_BOUNDS[cfg.id];
  const check = (label: string, checked: boolean, change: () => void, count?: number, withCount = true) => (
    <label className="catalogue-filter-option" key={label}>
      <input type="checkbox" checked={checked} onChange={change} disabled={count === 0 && !checked} />
      <span>{label}</span>
      {withCount && <span className="catalogue-filter-count">{count ?? ''}</span>}
    </label>
  );
  const section = (label: string, children: ReactNode) => (
    <details className="catalogue-filter-section" open key={label}>
      <summary onClick={bare ? (e) => e.preventDefault() : undefined}>{label}</summary>
      <div className="catalogue-filter-options">{children}</div>
    </details>
  );

  return (
    <div className={`catalogue-filters ${bare ? 'catalogue-sheet-filters' : ''}`}>
      {!bare && (
        <div className="catalogue-filters-heading">
          <strong>{t(T.filters)}</strong>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onChange(clearedFilters(f, cfg.groups, false))}>
            {t(T.reset)}
          </button>
        </div>
      )}
      {onSkip && (
        <button className="sr-only focus:not-sr-only ui-btn ui-btn--secondary" onClick={onSkip}>
          {t(T.skipToResults)}
        </button>
      )}
      {top}
      <div className="catalogue-filter-card">
        <div className="catalogue-filter-search">
          <input type="search" aria-label={t(T.search)} placeholder={t(cfg.searchPlaceholder)} value={f.query} onChange={(e) => set('query', e.target.value)} />
        </div>
        {section(
          t(cfg.groupLabel),
          cfg.groups.map((g) => check(groupName(g, lang), f.groups.includes(g), () => set('groups', toggle(f.groups, g)), counts?.groups[g])),
        )}
        {cfg.extraFilters.map((x) =>
          section(
            t(x.label),
            (options[x.key] ?? []).map((o) =>
              check(
                t(o.label),
                f.extra[x.key] === o.value,
                () =>
                  set('extra', {
                    ...f.extra,
                    [x.key]: f.extra[x.key] === o.value ? '' : o.value,
                  }),
                counts?.extra[x.key]?.[o.value],
              ),
            ),
          ),
        )}
        {section(
          t(T.source),
          SOURCE_NAMES.map((source) =>
            check(SOURCES[source].label, f.sources.includes(source), () => set('sources', toggle(f.sources, source)), counts?.sources[source]),
          ),
        )}
        {cfg.segments &&
          section(
            t(T.segment),
            segmentOptions(cfg).map((s) => check(t(s.label), f.segment === s.value, () => set('segment', s.value), counts?.segment[s.value])),
          )}
        {section(
          t(UI.cataloguePrice),
          <RangeSlider
            minBound={bounds?.price?.[0] ?? fallback?.price[0] ?? 0}
            maxBound={bounds?.price?.[1] ?? fallback?.price[1] ?? 2000}
            step={5}
            unit="€"
            minValue={f.minPrice}
            maxValue={f.maxPrice}
            onChange={(min, max) => onChange({ ...f, minPrice: min, maxPrice: max })}
            minAriaLabel={`${t(UI.cataloguePrice)} ${t(UI.catalogueFrom)}`}
            maxAriaLabel={t(T.maxPriceLabel)}
            fromPlaceholder={t(UI.catalogueFrom)}
            toPlaceholder={t(UI.catalogueTo)}
          />,
        )}
        {range &&
          section(
            t(range.label),
            <>
              <RangeSlider
                minBound={bounds?.numeric?.[0] ?? fallback?.numeric?.[0] ?? 0}
                maxBound={bounds?.numeric?.[1] ?? fallback?.numeric?.[1] ?? 1000}
                step={fallback?.step ?? 5}
                unit={RANGE_UNITS[cfg.id] ?? ''}
                minValue={f.numericMin}
                maxValue={f.numericMax}
                onChange={(min, max) => onChange({ ...f, numericMin: min, numericMax: max })}
                minAriaLabel={`${t(range.label)} ${t(UI.catalogueFrom)}`}
                maxAriaLabel={`${t(range.label)} ${t(UI.catalogueTo)}`}
                fromPlaceholder={t(UI.catalogueFrom)}
                toPlaceholder={t(UI.catalogueTo)}
              />
              {coverage != null && (
                <p className="catalogue-coverage">
                  {t(UI.catalogueCoverage)} {coverage}%
                </p>
              )}
              {check(t(UI.catalogueUnknown), f.includeUnknown !== false, () => set('includeUnknown', f.includeUnknown === false), undefined, false)}
            </>,
          )}
        {section(
          t(T.sales),
          <>
            {check(t(T.saleOnly), f.saleOnly, () => set('saleOnly', !f.saleOnly), counts?.sale)}
            {check(t(UI.catalogueFamilyLow), f.lowOnly, () => set('lowOnly', !f.lowOnly), counts?.low)}
          </>,
        )}
      </div>
    </div>
  );
}
