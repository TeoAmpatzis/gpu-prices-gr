import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { DEFAULT_PER, activeFilterCount, clearedFilters, loadData, type CategoryData, type Filters } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import type { FacetCounts } from '../lib/facets';
import { facetsClient } from '../lib/facetsClient';
import { T, tr, useLang } from '../lib/i18n';
import { useFilterState } from '../lib/useFilterState';
import ActiveFilters from './ActiveFilters';
import BottomSheet from './BottomSheet';
import FilterBar from './FilterBar';
import ProductList from './catalogue/ProductList';
import { filterCatalogue, sortCatalogue, numericValue } from '../lib/catalogueFilters';
import { encodeOfferChoice } from '../lib/productSelection';
import { UI } from '../ui/strings';
import type { RowPick } from './ModelRow';
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
  draftToggle?: (filters: Filters, onChange: (filters: Filters) => void) => ReactNode;
  hiddenKeys?: Set<string>;
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
  const props = {
    cfg,
    data,
    filters,
    setFilters,
  } as unknown as LayoutProps<BaseListing>;
  return (
    <Suspense fallback={loading}>
      <PickView {...props} />
    </Suspense>
  );
}

/** The page itself: filter sidebar (sheet below lg), status, active filters, table and pager. */
export function CategoryLayout<L extends BaseListing>({ cfg, data, filters, setFilters, listings = data.latest.listings, pick }: LayoutProps<L>) {
  const lang = useLang();
  const t = (text: { el: string; en: string }) => tr(lang, text);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [cards, setCards] = useState(false);
  const wide = useMedia('(min-width: 1024px)');
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const top = useRef<HTMLDivElement>(null);
  const waiting = pick?.pending !== undefined;
  const products = useMemo(
    () => (waiting ? [] : sortCatalogue(filterCatalogue(listings, filters, cfg, data.history, data.imported), filters, cfg)),
    [waiting, listings, filters, cfg, data],
  );
  const draftListings = useMemo(
    () => (pick?.hiddenKeys ? data.latest.listings.filter((l) => !draft.compat || !pick.hiddenKeys?.has(encodeOfferChoice(l))) : listings),
    [pick, data, draft.compat, listings],
  );
  const draftCount = useMemo(
    () => (!sheetOpen || waiting ? 0 : filterCatalogue(draftListings, draft, cfg, data.history, data.imported).length),
    [sheetOpen, waiting, draftListings, draft, cfg, data],
  );
  const options = useMemo(() => Object.fromEntries(cfg.extraFilters.map((x) => [x.key, x.options(data.latest.listings)])), [data, cfg]);
  const countKey = JSON.stringify({
    ...(sheetOpen ? draft : filters),
    page: 1,
    per: DEFAULT_PER,
    sort: 'model',
  });
  const countFilters = useMemo(() => JSON.parse(countKey) as Filters, [countKey]);
  const hidden = useMemo(() => {
    const counted = sheetOpen ? draftListings : listings;
    if (counted === data.latest.listings) return null;
    const shown = new Set(counted.map(encodeOfferChoice));
    return data.latest.listings.filter((l) => !shown.has(encodeOfferChoice(l))).map(encodeOfferChoice);
  }, [listings, data, sheetOpen, draftListings]);
  const [facets, setFacets] = useState<{
    filters: Filters;
    hidden: string[] | null;
    data: CategoryData<L>;
    counts: FacetCounts;
  } | null>(null);
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
  const pages = Math.max(1, Math.ceil(products.length / filters.per));
  const page = Math.min(filters.page, pages);
  const reset = () => setFilters(clearedFilters(filters, cfg.groups, true));
  const skipToResults = () => {
    const first = top.current?.querySelector<HTMLElement>('a[data-product-link]');
    if (first) first.focus();
    else if (top.current) {
      top.current.tabIndex = -1;
      top.current.focus();
    }
  };
  const coverage = data.latest.listings.length
    ? Math.round((100 * data.latest.listings.filter((l) => numericValue(l, cfg.id) != null).length) / data.latest.listings.length)
    : 0;
  const bounds = useMemo(() => {
    if (!data.latest.listings.length) return undefined;
    let minP = Infinity;
    let maxP = -Infinity;
    let minN = Infinity;
    let maxN = -Infinity;
    const prices: number[] = [];
    for (const l of data.latest.listings) {
      if (typeof l.price === 'number' && Number.isFinite(l.price) && l.price > 0) {
        prices.push(l.price);
        if (l.price < minP) minP = l.price;
        if (l.price > maxP) maxP = l.price;
      }
      const n = numericValue(l, cfg.id);
      if (n != null && n > 0) {
        if (n < minN) minN = n;
        if (n > maxN) maxN = n;
      }
    }
    prices.sort((a, b) => a - b);
    const p98 = prices.length ? prices[Math.floor(prices.length * 0.98)] : maxP;
    const effectiveMaxPrice = Math.max(300, Math.ceil((p98 || maxP) / 50) * 50);

    return {
      price: [0, effectiveMaxPrice] as [number, number],
      numeric: minN <= maxN ? [Math.floor(minN), Math.ceil(maxN)] as [number, number] : undefined,
    };
  }, [data.latest.listings, cfg.id]);
  const openSheet = () => {
    setDraft({
      ...filters,
      extra: { ...filters.extra },
      groups: [...filters.groups],
      sources: [...filters.sources],
    });
    setSheetOpen(true);
  };
  const sortOptions = [
    ['model', T.sortModel],
    ['price-asc', T.sortPriceAsc],
    ['price-desc', T.sortPriceDesc],
    ['offers', T.sortOffers],
    ['discount', T.sortDiscount],
    ...(cfg.capacityTb ? [['per-tb', T.sortPerTb]] : []),
  ] as const;
  const goPage = (next: number) => {
    setFilters({ ...filters, page: next });
    if ((top.current?.getBoundingClientRect().top ?? 0) < 0) top.current?.scrollIntoView({ block: 'start' });
  };
  return (
    <div className="catalogue-layout">
      <aside className="catalogue-sidebar">
        {pick?.pending ? (
          pick.pending.filters
        ) : (
          <FilterBar
            cfg={cfg}
            filters={filters}
            onChange={setFilters}
            options={options}
            counts={sheetOpen ? undefined : counts}
            top={pick?.toggle}
            onSkip={skipToResults}
            coverage={coverage}
            bounds={bounds}
          />
        )}
      </aside>
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={tr(lang, T.filters)}
        headerAction={
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setDraft(clearedFilters(draft, cfg.groups, true))}>
            {tr(lang, T.reset)}
          </button>
        }
        footer={
          <div className="flex flex-col gap-2">
            <button
              className="ui-btn ui-btn--primary w-full"
              type="button"
              onClick={() => {
                setFilters(draft);
                closeSheet();
              }}
            >
              {tr(lang, T.showResults)} {waiting ? '\u2026' : draftCount} {t(UI.catalogueProducts)}
            </button>
            <button type="button" className="ui-btn ui-btn--ghost w-full" onClick={closeSheet}>
              {t(UI.catalogueCancel)}
            </button>
          </div>
        }
      >
        <FilterBar
          bare
          cfg={cfg}
          filters={draft}
          onChange={setDraft}
          options={options}
          counts={counts}
          top={pick?.draftToggle?.(draft, setDraft)}
          coverage={coverage}
          bounds={bounds}
        />
      </BottomSheet>
      <div ref={top} className="catalogue-results" id="results">
        {pick?.bar}
        <div className="catalogue-toolbar">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm catalogue-filter-button"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={openSheet}
          >
            <SlidersHorizontal size={16} />
            {tr(lang, T.filters)}
            {active > 0 ? ` \u00b7 ${active}` : ''}
          </button>
          <strong className="catalogue-count-desktop" aria-live="polite">
            {waiting ? '\u2026' : products.length} {t(UI.catalogueProducts)}
          </strong>
          <select
            className="catalogue-sort"
            aria-label={tr(lang, T.sortLabel)}
            value={filters.sort}
            onChange={(e) =>
              setFilters({
                ...filters,
                sort: e.target.value as Filters['sort'],
              })
            }
          >
            {sortOptions.map(([value, label]) => (
              <option value={value as string} key={value as string}>
                {tr(lang, label as Parameters<typeof tr>[1])}
              </option>
            ))}
          </select>
          <div className="catalogue-view">
            <button
              type="button"
              className={`ui-btn ui-btn--sm ${!cards ? 'ui-btn--secondary' : 'ui-btn--ghost'}`}
              aria-pressed={!cards}
              onClick={() => setCards(false)}
            >
              {t(UI.catalogueTable)}
            </button>
            <button
              type="button"
              className={`ui-btn ui-btn--sm ${cards ? 'ui-btn--secondary' : 'ui-btn--ghost'}`}
              aria-pressed={cards}
              onClick={() => setCards(true)}
            >
              {t(UI.catalogueCards)}
            </button>
          </div>
        </div>
        <ActiveFilters cfg={cfg} filters={filters} onChange={setFilters} options={options} />
        <strong className="catalogue-count-mobile" aria-live="polite">{waiting ? '…' : products.length} {t(UI.catalogueProducts)}</strong>
        {pick?.pending ? (
          pick.pending.results
        ) : (
          <ProductList
            cfg={cfg}
            products={products.slice((page - 1) * filters.per, page * filters.per)}
            cards={!wide || cards}
            pick={pick?.row}
            onReset={reset}
            emptyExtra={pick?.empty}
            photos={data.photos}
          />
        )}
        <div className="catalogue-pagination">
          <span>
            {t(UI.catalogueShowing)} {products.length ? (page - 1) * filters.per + 1 : 0}
            {String.fromCharCode(8211)}
            {Math.min(page * filters.per, products.length)} / {products.length}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="catalogue-sort"
              aria-label={tr(lang, T.perPage)}
              value={filters.per}
              onChange={(e) => setFilters({ ...filters, per: Number(e.target.value) })}
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              {tr(lang, T.prevPage)}
            </button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={page >= pages} onClick={() => goPage(page + 1)}>
              {tr(lang, T.nextPage)}
            </button>
          </div>
        </div>
        <StatusLine sources={data.latest.sources as SourceTimes} />
      </div>
    </div>
  );
}
