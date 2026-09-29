import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { BaseListing, History, Latest } from '../types';
import { applyFilters, defaultFilters, loadData, timeAgo, type Filters } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { T, tr, useLang } from '../lib/i18n';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';
import FilterBar from './FilterBar';
import ModelTable from './ModelTable';

/** One category page (one tab): source status, filters and the model table. */
export default function CategoryView<L extends BaseListing>({ cfg }: { cfg: CategoryConfig<L> }) {
  const lang = useLang();
  const [data, setData] = useState<{ latest: Latest<L>; history: History } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(cfg.groups));

  useEffect(() => {
    loadData<L>(cfg.id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [cfg.id]);

  const models = useMemo(() => (data ? applyFilters(data.latest.listings, filters, cfg) : []), [data, filters, cfg]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900">
        <AlertTriangle className="h-5 w-5" /> {tr(lang, T.loadError)}: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-faint">
        <Loader2 className="h-5 w-5 animate-spin" /> {tr(lang, T.loading)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <FilterBar cfg={cfg} listings={data.latest.listings} filters={filters} onChange={setFilters} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
        <span>
          <span className="font-semibold text-fg">{models.length}</span> {tr(lang, T.models)}
        </span>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {SOURCE_NAMES.map((s) => {
            const meta = data.latest.sources[s];
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 ring-1 ring-inset ring-line"
                title={meta?.ok ? undefined : tr(lang, T.staleSource)}
              >
                <span className={`h-2 w-2 rounded-full ${meta?.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {SOURCES[s].label}: {meta?.count ?? 0} · {timeAgo(meta?.updatedAt, lang)}
              </span>
            );
          })}
        </div>
      </div>
      <ModelTable cfg={cfg} models={models} history={data.history} />
    </div>
  );
}
