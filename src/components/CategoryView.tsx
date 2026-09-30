import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, SlidersHorizontal } from 'lucide-react';
import type { BaseListing } from '../types';
import { activeFilterCount, applyFilters, defaultFilters, loadData, type CategoryData, type Filters } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { T, tr, useLang } from '../lib/i18n';
import FilterBar from './FilterBar';
import ModelTable from './ModelTable';
import Skeleton from './Skeleton';
import SourcesStatus from './SourcesStatus';

/** One category page (one tab): source status, filters and the model table. */
export default function CategoryView<L extends BaseListing>({ cfg }: { cfg: CategoryConfig<L> }) {
  const lang = useLang();
  const [data, setData] = useState<CategoryData<L> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(cfg.groups));
  // Phones and tablets (< lg): the filters are hidden behind a button.
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadData<L>(cfg.id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [cfg.id]);

  const models = useMemo(
    () => (data ? applyFilters(data.latest.listings, filters, cfg, data.history, data.imported) : []),
    [data, filters, cfg],
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
  return (
    // Filters in a left sidebar (sticky) on wide screens; below lg they open from a "Filters" button.
    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <button
        type="button"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((o) => !o)}
        className="tap card flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-hover lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-accent" />
        {tr(lang, T.filters)}
        {active > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-page">
            {active}
          </span>
        )}
      </button>
      <aside
        className={`${filtersOpen ? 'flex' : 'hidden'} flex-col gap-2 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`}
      >
        <FilterBar cfg={cfg} listings={data.latest.listings} filters={filters} onChange={setFilters} />
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="tap rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-page transition-opacity duration-150 hover:opacity-90 lg:hidden"
        >
          {tr(lang, T.showResults)} {models.length} {tr(lang, T.models)}
        </button>
      </aside>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
          <span>
            <span className="font-semibold text-fg">{models.length}</span> {tr(lang, T.models)}
          </span>
          <SourcesStatus latest={data.latest} />
        </div>
        <ModelTable
          cfg={cfg}
          models={models}
          history={data.history}
          onReset={() => setFilters(defaultFilters(cfg.groups))}
        />
      </div>
    </div>
  );
}
