import { lazy, Suspense } from 'react';
import { ChevronDown, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import type { HistoryPoint } from '../types';
import { formatPrice, type Model } from '../lib/data';
import SourceBadge from './SourceBadge';

// Recharts is heavy and only needed once a row is expanded.
const PriceChart = lazy(() => import('./PriceChart'));

const BRAND_DOT: Record<Model['brand'], string> = {
  NVIDIA: 'bg-green-500',
  AMD: 'bg-red-500',
  Intel: 'bg-sky-500',
};

/** Change vs. the most recent history point at least 7 days old. */
function weekChange(points: HistoryPoint[] | undefined, current: number): number | null {
  if (!points?.length) return null;
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const past = [...points].reverse().find((p) => p.d <= cutoff);
  return past ? current - past.min : null;
}

interface Props {
  model: Model;
  history: HistoryPoint[] | undefined;
  open: boolean;
  onToggle: () => void;
}

export default function ModelRow({ model: m, history, open, onToggle }: Props) {
  const delta = weekChange(history, m.cheapest.price);
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/70">
        <td className="py-2.5 pl-3 pr-2">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180' : ''}`} />
            <span className={`h-2 w-2 shrink-0 rounded-full ${BRAND_DOT[m.brand]}`} title={m.brand} />
            <span className="font-medium">{m.chip}</span>
          </div>
        </td>
        <td className="px-2 text-zinc-300">{m.vram}GB</td>
        <td className="px-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums text-emerald-400">{formatPrice(m.cheapest.price)}</span>
            <SourceBadge source={m.cheapest.source} />
            {delta != null && Math.abs(delta) >= 1 && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs ${delta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                title="Μεταβολή 7 ημερών"
              >
                {delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {formatPrice(Math.abs(delta))}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-zinc-500 sm:hidden">{m.cheapest.partner}</div>
        </td>
        <td className="hidden px-2 text-sm text-zinc-400 sm:table-cell">{m.cheapest.partner}</td>
        <td className="hidden px-2 text-sm tabular-nums text-zinc-400 md:table-cell">
          {m.listings.length > 1 ? `έως ${formatPrice(m.maxPrice)}` : '—'}
        </td>
        <td className="pr-3 text-right text-sm tabular-nums text-zinc-400">{m.listings.length}</td>
      </tr>
      {open && (
        <tr className="bg-zinc-900/40">
          <td colSpan={6} className="px-3 pb-4 pt-2">
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <ul className="max-h-80 divide-y divide-zinc-800 overflow-y-auto rounded-lg ring-1 ring-zinc-800">
                {m.listings.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-800/60"
                    >
                      <span className="w-24 shrink-0 font-medium tabular-nums">{formatPrice(l.price)}</span>
                      <SourceBadge source={l.source} />
                      <span className="min-w-0 flex-1 truncate text-zinc-300" title={l.title}>
                        {l.title}
                      </span>
                      {l.shopCount != null && (
                        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">{l.shopCount} καταστ.</span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    </a>
                  </li>
                ))}
              </ul>
              <div>
                <div className="mb-1.5 text-xs text-zinc-500">Χαμηλότερη τιμή ανά ημέρα</div>
                <Suspense fallback={<div className="h-48 rounded-lg bg-zinc-950/60 ring-1 ring-zinc-800" />}>
                  <PriceChart points={history} />
                </Suspense>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
