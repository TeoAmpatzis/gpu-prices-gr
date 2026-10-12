import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { PER_PAGE, activeFilterCount, applyFilters, defaultFilters, loadData, type CategoryData, type Filters } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { facetCounts } from '../lib/facets';
import { T, tr, useLang } from '../lib/i18n';
import { useFilterState } from '../lib/useFilterState';
import ActiveFilters from './ActiveFilters';
import BottomSheet from './BottomSheet';
import FilterBar from './FilterBar';
import ModelTable from './ModelTable';
import type { RowPick } from './ModelRow';
import Pagination from './Pagination';
import Skeleton from './Skeleton';
import { useMedia } from '../lib/useMedia';
import { StatusLine, type SourceTimes } from '../ui/nav';
import { ErrorState, SkeletonCards } from '../ui/states';

/** What pick mode (`?pick=1`, src/components/PickView.tsx) adds to the page; absent on a normal page. */
export interface PickSlots<L extends BaseListing> {
  /** "Επιλέγεις: Κουτί · ← Πίσω στο build", above the results. */
  bar: ReactNode;
  /** "Μόνο συμβατά (N κρυμμένα)", at the top of the filters. */
  toggle: ReactNode;
  /** Per model: greyed or not, its findings and "Add" button, and per card for graphics cards. */
  row: RowPick<L>;
}

export interface LayoutProps<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  data: CategoryData<L>;
  filters: Filters;
  setFilters: (f: Filters) => void;
  /** The listings to filter and count (pick mode: without the hidden ones); default all of them. */
  listings?: L[];
  pick?: PickSlots<L>;
}

// The pick code (engine, builder rules, compat chunks) is its own chunk, requested only when `pick=1`: from the
// moment the page mounts (after the first paint), alongside its list.json.
const loadPick = () => import('./PickView');
const PickView = lazy(loadPick) as unknown as ComponentType<LayoutProps<BaseListing>>;

/** One category page (one tab): source status, filters and the model table. */
export default function CategoryView<L extends BaseListing>({ cfg }: { cfg: CategoryConfig<L> }) {
  const lang = useLang();
  const [data, setData] = useState<CategoryData<L> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useFilterState(cfg);

  // "Δοκιμή ξανά" after a failed load: a new attempt re-runs the load (data.ts forgets failed requests).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    loadData<L>(cfg.id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [cfg.id, attempt]);
  useEffect(() => {
    if (filters.pick) void loadPick().catch(() => {}); // a failure shows when PickView renders (error boundary)
  }, [filters.pick]);
  const wide = useMedia('(min-width: 1024px)');

  // A failed load: the translated message and a retry, the technical detail folded (UX-19).
  if (error) {
    return (
      <div className="card">
        <ErrorState
          detail={error}
          onRetry={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        />
      </div>
    );
  }
  // Loading: the desktop layout's shape on wide screens, card shapes on phones and tablets (UX-21).
  const loading = wide ? (
    <>
      <span className="sr-only">{tr(lang, T.loading)}</span>
      <Skeleton />
    </>
  ) : (
    <SkeletonCards cards={4} />
  );
  if (!data) return loading;
  if (!filters.pick) return <CategoryLayout cfg={cfg} data={data} filters={filters} setFilters={setFilters} />;
  // Pick mode: its code was requested with the data, so the placeholder rarely shows (and the page's
  // filtering doesn't run twice).
  const props = { cfg, data, filters, setFilters } as unknown as LayoutProps<BaseListing>;
  return (
    <Suspense fallback={loading}>
      <PickView {...props} />
    </Suspense>
  );
}

/** The page itself: filter sidebar (sheet below lg), status, active filters, table and pager. */
export function CategoryLayout<L extends BaseListing>({ cfg, data, filters, setFilters, listings = data.latest.listings, pick }: LayoutProps<L>) {
  const lang = useLang();
  // Phones and tablets (< lg): the filters open in a bottom sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const top = useRef<HTMLDivElement>(null); // the results column (pager scrolls back to it)

  const models = useMemo(
    () => applyFilters(listings, filters, cfg, data.history, data.imported),
    [listings, data, filters, cfg],
  );
  const options = useMemo(
    () => Object.fromEntries(cfg.extraFilters.map((x) => [x.key, x.options(data.latest.listings)])),
    [data, cfg],
  );
  // Counts are a few extra filter runs; deferred so typing in the search box stays smooth.
  const deferred = useDeferredValue(filters);
  const counts = useMemo(
    () => facetCounts(listings, deferred, cfg, data.history, data.imported, options),
    [listings, data, deferred, cfg, options],
  );

  const active = activeFilterCount(filters, cfg.groups);
  // A page number from an old link may be past the end now: show the last page instead.
  const pages = Math.max(1, Math.ceil(models.length / filters.per));
  const page = Math.min(filters.page, pages);
  const reset = () => setFilters({ ...defaultFilters(cfg.groups, filters.pick), sort: filters.sort, per: filters.per });
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
        <FilterBar cfg={cfg} filters={filters} onChange={setFilters} options={options} counts={counts} top={pick?.toggle} />
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
        <FilterBar bare cfg={cfg} filters={filters} onChange={setFilters} options={options} counts={counts} top={pick?.toggle} />
      </BottomSheet>
      <div ref={top} className="flex min-w-0 scroll-mt-4 flex-col gap-3">
        {pick?.bar}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
          <span>
            <span className="font-semibold text-fg">{models.length}</span> {tr(lang, T.models)}
          </span>
          {/* Every source with its own last update; older than 24 hours is marked (UX-04, backlog #9). */}
          <StatusLine sources={data.latest.sources as SourceTimes} />
        </div>
        <ActiveFilters cfg={cfg} filters={filters} onChange={setFilters} options={options} />
        {/* Filters, counts and sorting run on every model; only the rows of one page are rendered. */}
        <ModelTable
          cfg={cfg}
          models={models.slice((page - 1) * filters.per, page * filters.per)}
          history={data.history}
          img={data.img}
          onReset={reset}
          pick={pick?.row}
        />
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
