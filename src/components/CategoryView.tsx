import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { PER_PAGE, activeFilterCount, applyFilters, defaultFilters, loadData, type CategoryData } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { facetCounts } from '../lib/facets';
import { T, tr, useLang } from '../lib/i18n';
import { useFilterState } from '../lib/useFilterState';
import ActiveFilters from './ActiveFilters';
import BottomSheet from './BottomSheet';
import FilterBar from './FilterBar';
import ModelTable from './ModelTable';
import Pagination from './Pagination';
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
  const top = useRef<HTMLDivElement>(null); // the results column (pager scrolls back to it)

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
  // A page number from an old link may be past the end now: show the last page instead.
  const pages = Math.max(1, Math.ceil(models.length / filters.per));
  const page = Math.min(filters.page, pages);
  const reset = () => setFilters({ ...defaultFilters(cfg.groups), sort: filters.sort, per: filters.per });
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
      <div ref={top} className="flex min-w-0 scroll-mt-4 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
          <span>
            <span className="font-semibold text-fg">{models.length}</span> {tr(lang, T.models)}
          </span>
          <SourcesStatus latest={data.latest} />
        </div>
        <ActiveFilters cfg={cfg} filters={filters} onChange={setFilters} options={options} />
        {/* Filters, counts and sorting run on every model; only the rows of one page are rendered. */}
        <ModelTable cfg={cfg} models={models.slice((page - 1) * filters.per, page * filters.per)} history={data.history} img={data.img} onReset={reset} />
        {models.length > PER_PAGE[0] && (
          <Pagination
            page={page}
            pages={pages}
            per={filters.per}
            total={models.length}
            onPage={(p) => {
              setFilters({ ...filters, page: p });
              // Start the new page from its first row, like turning a page.
              if ((top.current?.getBoundingClientRect().top ?? 0) < 0) top.current?.scrollIntoView({ block: 'start' });
            }}
            onPer={(per) => setFilters({ ...filters, per })}
          />
        )}
      </div>
    </div>
  );
}
