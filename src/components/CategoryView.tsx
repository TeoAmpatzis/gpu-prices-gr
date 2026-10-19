import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { DEFAULT_PER, PER_PAGE, activeFilterCount, applyFilters, clearedFilters, loadData, type CategoryData, type Filters } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import type { FacetCounts } from '../lib/facets';
import { facetsClient } from '../lib/facetsClient';
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
import { afterFirstPaint } from '../lib/paint';
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
  /** In the empty state, when "Only compatible" hid everything: how many, and a button to turn it off. */
  empty?: ReactNode;
  /**
   * While the check against a saved build runs (task 6b): placeholders shown instead of the filter sidebar and the
   * rows. The page skips its filtering and counts until then and paints the final rows once, so nothing shifts.
   */
  pending?: { filters: ReactNode; results: ReactNode };
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
// moment the page mounts (after the first paint), alongside its list.v2.json.
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

  const pending = pick?.pending;
  const waiting = pending !== undefined;
  const models = useMemo(
    () => (waiting ? [] : applyFilters(listings, filters, cfg, data.history, data.imported)),
    [waiting, listings, data, filters, cfg],
  );
  const options = useMemo(
    () => Object.fromEntries(cfg.extraFilters.map((x) => [x.key, x.options(data.latest.listings)])),
    [data, cfg],
  );
  // Facet counts (step 4 task 3): a dozen filter runs over every listing, so the facet worker does them after the
  // first paint (facetsClient.ts; the main thread in idle slices only without a worker). They depend on the filters
  // but not on the page, results per page or sort: those changes ask for nothing. Pick mode counts without the
  // hidden listings (their ids go to the worker). Until the counts for the current filters arrive (the first ones,
  // or newer ones after a change) the options show no numbers and nothing is greyed: older counts are never shown.
  // FilterBar's counts keep their width empty, so nothing moves when the numbers fill in.
  const countKey = JSON.stringify({ ...filters, page: 1, per: DEFAULT_PER, sort: 'model' });
  const countFilters = useMemo(() => JSON.parse(countKey) as Filters, [countKey]);
  const hidden = useMemo(() => {
    if (listings === data.latest.listings) return null;
    const shown = new Set(listings.map((l) => l.id));
    return data.latest.listings.filter((l) => !shown.has(l.id)).map((l) => l.id);
  }, [listings, data]);
  const [facets, setFacets] = useState<{ filters: Filters; hidden: string[] | null; data: CategoryData<L>; counts: FacetCounts } | null>(null);
  useEffect(() => {
    if (waiting) return;
    let live = true;
    const cancel = afterFirstPaint(() => {
      void facetsClient.request(cfg.id, countFilters, data.builtAt, hidden).then((counts) => {
        if (live && counts) setFacets({ filters: countFilters, hidden, data, counts });
      });
    });
    return () => {
      live = false;
      cancel();
    };
  }, [waiting, cfg.id, countFilters, data, hidden]);
  const counts = facets && facets.filters === countFilters && facets.hidden === hidden && facets.data === data ? facets.counts : undefined;

  const active = activeFilterCount(filters, cfg.groups);
  // A page number from an old link may be past the end now: show the last page instead.
  const pages = Math.max(1, Math.ceil(models.length / filters.per));
  const page = Math.min(filters.page, pages);
  const reset = () => setFilters(clearedFilters(filters, cfg.groups, true));
  // The sidebar's skip link: focus goes to the first product's name (else the results area itself).
  const skipToResults = () => {
    const box = top.current;
    const first = box?.querySelector<HTMLElement>('a[data-product-link]');
    if (first) first.focus();
    else if (box) {
      box.tabIndex = -1;
      box.focus();
    }
  };
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
        {pending ? pending.filters : <FilterBar cfg={cfg} filters={filters} onChange={setFilters} options={options} counts={counts} top={pick?.toggle} onSkip={skipToResults} />}
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
              {tr(lang, T.showResults)} <span className="tabular-nums">{pending ? '…' : models.length}</span> {tr(lang, T.results)}
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
            <span className="font-semibold text-fg">{pending ? '…' : models.length}</span> {tr(lang, T.models)}
          </span>
          {/* Every source with its own last update; older than 24 hours is marked (UX-04, backlog #9). */}
          <StatusLine sources={data.latest.sources as SourceTimes} />
        </div>
        <ActiveFilters cfg={cfg} filters={filters} onChange={setFilters} options={options} />
        {/* Filters, counts and sorting run on every model; only the rows of one page are rendered. */}
        {pending ? (
          pending.results
        ) : (
          <ModelTable
            cfg={cfg}
            models={models.slice((page - 1) * filters.per, page * filters.per)}
            history={data.history}
            photos={data.photos}
            onReset={reset}
            pick={pick?.row}
            emptyExtra={pick?.empty}
          />
        )}
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
