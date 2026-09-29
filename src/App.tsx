import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cpu, Loader2 } from 'lucide-react';
import type { History, Latest } from './types';
import { applyFilters, DEFAULT_FILTERS, loadData, timeAgo, type Filters } from './lib/data';
import { SOURCES, SOURCE_NAMES } from './lib/sources';
import FilterBar from './components/FilterBar';
import ModelTable from './components/ModelTable';

export default function App() {
  const [data, setData] = useState<{ latest: Latest; history: History } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const models = useMemo(() => (data ? applyFilters(data.latest.listings, filters) : []), [data, filters]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Cpu className="h-6 w-6 text-emerald-400" /> Τιμές Καρτών Γραφικών
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Οι χαμηλότερες τιμές GPU στην Ελλάδα από Skroutz και BestPrice.</p>
        </div>
        {data && (
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {SOURCE_NAMES.map((s) => {
              const meta = data.latest.sources[s];
              return (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5"
                  title={meta?.ok ? undefined : 'Η τελευταία ενημέρωση απέτυχε — εμφανίζονται παλαιότερα δεδομένα'}
                >
                  <span className={`h-2 w-2 rounded-full ${meta?.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {SOURCES[s].label}: {meta?.count ?? 0} · {timeAgo(meta?.updatedAt)}
                </span>
              );
            })}
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-950/50 p-4 text-rose-300 ring-1 ring-rose-900">
          <AlertTriangle className="h-5 w-5" /> Αποτυχία φόρτωσης δεδομένων: {error}
        </div>
      )}
      {!data && !error && (
        <div className="flex items-center justify-center gap-2 py-24 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Φόρτωση…
        </div>
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <p className="text-sm text-zinc-500">{models.length} μοντέλα</p>
          <ModelTable models={models} history={data.history} />
          <footer className="pt-4 text-center text-xs text-zinc-600">
            Οι τιμές ενημερώνονται αυτόματα κάθε 6 ώρες και ενδέχεται να διαφέρουν από τις τρέχουσες στα καταστήματα.
          </footer>
        </div>
      )}
    </div>
  );
}
