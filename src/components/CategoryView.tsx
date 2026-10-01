import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { activeFilterCount, applyFilters, defaultFilters, loadData, type CategoryData } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { facetCounts } from '../lib/facets';
import { T, tr, useLang } from '../lib/i18n';
import { useFilterState } from '../lib/useFilterState';
import ActiveFilters from './ActiveFilters';
import BottomSheet from './BottomSheet';
import FilterBar from './FilterBar';
import ModelTable from './ModelTable';
import Skeleton from './Skeleton';
import SourcesStatus from './SourcesStatus';

/** One category page (one tab): source status, filters and the model table. */
export default function CategoryView<L extends BaseListing>({ cfg }: { cfg: CategoryConfig<L> }) {
  const lang = useLang();
  const [data, setData] = useState<CategoryData<L> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useFilterState(cfg);
  // Phones and tablets (< lg): the filters open in a bottom sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    loadData<L>(cfg.id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [cfg.id]);

  const models = useMemo(
    () => (data ? applyFilters(data.latest.listings, filters, cfg, data.history, data.imported) : []),
    [data, filters, cfg],
  );
  const options = useMemo(
    () => Object.fromEntries(cfg.extraFilters.map((x) => [x.key, data ? x.options(data.latest.listings) : []])),
    [data, cfg],
  );
  // Counts are a few extra filter runs; deferred so typing in the search box stays smooth.
  const deferred = useDeferredValue(filters);
  const counts = useMemo(
    () => (data ? facetCounts(data.latest.listings, deferred, cfg, data.history, data.imported, options) : undefined),
    [data, deferred, cfg, options],
  );

  if (error) {
    return (
      <div className="notice-danger flex items-center gap-2 p-4">
        <AlertTriangle className="h-5 w-5" /> {tr(lang, T.loadError)}: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <>
        <span className="sr-only">{tr(lang, T.loading)}</span>
        <Skeleton />
      </>
    );
  }
  const active = activeFilterCount(filters, cfg.groups);
  const reset = () => setFilters({ ...defaultFilters(cfg.groups), sort: filters.sort });
  return (
    // Filters in a left sidebar (sticky) on wide screens; below lg they open in a bottom sheet.
    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        className="tap card flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-hover hover:ring-edge-hover lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-accent" />
        {tr(lang, T.filters)}
        {active > 0 && <span className="tabular-nums">({active})</span>}
      </button>
      <aside className="hidden flex-col gap-2 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scrollbar-none">
        <FilterBar cfg={cfg} filters={filters} onChange={setFilters} options={options} counts={counts} />
      </aside>
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={`${tr(lang, T.filters)}${active > 0 ? ` (${active})` : ''}`}
        footer={
          <div className="flex gap-2">
            {active > 0 && (
              <button
                type="button"
                onClick={reset}
                className="tap rounded-xl px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-inset ring-line-strong transition-colors duration-150 hover:bg-hover hover:text-fg hover:ring-muted dark:hover:ring-line-strong"
              >
                {tr(lang, T.clearAll)}
              </button>
            )}
            <button
              type="button"
              onClick={closeSheet}
              className="tap flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-page transition-opacity duration-150 hover:opacity-90"
            >
              {tr(lang, T.showResults)} <span className="tabular-nums">{models.length}</span> {tr(lang, T.results)}
            </button>
          </div>
        }
      >
        <FilterBar bare cfg={cfg} filters={filters} onChange={setFilters} options={options} counts={counts} />
      </BottomSheet>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
          <span>
            <span className="font-semibold text-fg">{models.length}</span> {tr(lang, T.models)}
          </span>
          <SourcesStatus latest={data.latest} />
        </div>
        <ActiveFilters cfg={cfg} filters={filters} onChange={setFilters} options={options} />
        <ModelTable cfg={cfg} models={models} history={data.history} onReset={reset} />
      </div>
    </div>
  );
}
