import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BaseListing } from '../types';
import { applyFilters, defaultFilters, loadData, type CategoryData, type Filters } from '../lib/data';
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
  return (
    // Filters in a left sidebar (sticky on wide screens), stacked above the table on narrow ones.
    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <FilterBar cfg={cfg} listings={data.latest.listings} filters={filters} onChange={setFilters} />
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
