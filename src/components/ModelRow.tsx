import { lazy, Suspense } from 'react';
import { ChevronDown, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import type { BaseListing, HistoryPoint } from '../types';
import { formatPrice, type Model } from '../lib/data';
import { groupName, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Lang } from '../lib/i18n';
import { SOURCES } from '../lib/sources';
import SourceBadge from './SourceBadge';

// Recharts is heavy and only needed once a row is expanded.
const PriceChart = lazy(() => import('./PriceChart'));

/** Change vs. the most recent history point at least 7 days old. */
function weekChange(points: HistoryPoint[] | undefined, current: number): number | null {
  if (!points?.length) return null;
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const past = [...points].reverse().find((p) => p.d <= cutoff);
  return past ? current - past.min : null;
}

/** "Shop: €48.99 + €2.50 shipping" for the best-total tooltip. */
function totalHint(l: BaseListing, lang: Lang): string {
  const fee = l.shipping ?? 0;
  const parts =
    fee > 0
      ? `${formatPrice(l.total! - fee, lang)} + ${formatPrice(fee, lang)} ${tr(lang, T.shipping)}`
      : `${formatPrice(l.total!, lang)}, ${tr(lang, T.freeShipping)}`;
  return l.merchant ? `${l.merchant}: ${parts}` : parts;
}

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  model: Model<L>;
  history: HistoryPoint[] | undefined;
  open: boolean;
  onToggle: () => void;
}

export default function ModelRow<L extends BaseListing>({ cfg, model: m, history, open, onToggle }: Props<L>) {
  const lang = useLang();
  const price = (n: number) => formatPrice(n, lang);
  const delta = weekChange(history, m.cheapest.price);
  const colSpan = 4 + cfg.before.length + cfg.after.length;
  const td = (c: CategoryConfig<L>['before'][number]) => (
    <td
      key={tr('en', c.header)}
      className={`whitespace-nowrap px-2 text-sm text-fg-soft ${c.numeric ? 'text-right' : ''} ${c.className ?? ''}`}
    >
      {c.cell(m, lang)}
    </td>
  );
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-t border-line transition-colors duration-150 first:border-t-0 hover:bg-hover/60 ${open ? 'bg-hover/60' : ''}`}
      >
        <td className="py-3 pl-4 pr-2">
          {/* A real button so the row opens from the keyboard too (Tab, Enter); the click reaches the row. */}
          <button type="button" aria-expanded={open} className="flex items-center gap-2 rounded-md text-left">
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${cfg.groupDot[m.group] ?? 'bg-zinc-400'}`}
              title={groupName(m.group, lang)}
            />
            <span className="font-semibold tracking-tight">{m.chip}</span>
          </button>
        </td>
        {cfg.before.map(td)}
        <td className="px-2 text-right">
          {/* Prices line up on the right edge of the column: badges sit to their left on wide screens
              and underneath on phones (column-reverse puts the price, the last child, on top). */}
          <div className="flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-1.5">
            <div className="flex flex-wrap justify-end gap-1">
              {m.low && (
                <span
                  className="badge bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400"
                  title={`${tr(lang, T.allTimeLowHint)} ${new Date(m.low.since).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB')}`}
                >
                  {tr(lang, T.allTimeLow)}
                </span>
              )}
              {m.sale && (
                <span
                  className="badge bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400"
                  title={`${tr(lang, T.saleBy)} ${SOURCES[m.sale.source].label}`}
                >
                  −{m.sale.pct}%
                </span>
              )}
              <SourceBadge source={m.cheapest.source} />
            </div>
            <span className="whitespace-nowrap text-[15px] font-semibold text-accent sm:ml-0.5">
              {price(m.cheapest.price)}
            </span>
          </div>
          {(m.bestTotal || (delta != null && Math.abs(delta) >= 1)) && (
            <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-2 text-xs text-muted">
              {delta != null && Math.abs(delta) >= 1 && (
                <span
                  className={`inline-flex items-center gap-0.5 ${delta < 0 ? 'text-accent' : 'text-up'}`}
                  title={tr(lang, T.weekChange)}
                >
                  {delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  {price(Math.abs(delta))}
                </span>
              )}
              {m.bestTotal && (
                <span title={totalHint(m.bestTotal, lang)}>
                  {price(m.bestTotal.total!)} {tr(lang, T.withShipping)}
                </span>
              )}
            </div>
          )}
        </td>
        {cfg.after.map(td)}
        <td className="hidden whitespace-nowrap px-2 text-right text-sm text-muted md:table-cell">
          {m.listings.length > 1 ? `${tr(lang, T.upTo)} ${price(m.maxPrice)}` : '—'}
        </td>
        <td className="hidden pl-2 pr-4 text-right text-sm text-muted sm:table-cell">{m.listings.length}</td>
      </tr>
      {open && (
        <tr className="bg-sunken">
          <td colSpan={colSpan} className="border-t border-line px-4 pb-5 pt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl bg-panel ring-1 ring-line">
                {m.listings.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 text-sm tabular-nums transition-colors duration-150 hover:bg-hover"
                    >
                      <span className="w-24 shrink-0 text-right font-medium">{price(l.price)}</span>
                      {l.drop != null && l.drop >= 5 && (
                        <span className="badge bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400">
                          −{l.drop}%
                        </span>
                      )}
                      <SourceBadge source={l.source} />
                      <span className="min-w-0 flex-1 truncate text-fg-soft" title={l.title}>
                        {l.title}
                      </span>
                      {l.total != null && (
                        <span
                          className="hidden shrink-0 text-xs tabular-nums text-muted sm:inline"
                          title={totalHint(l, lang)}
                        >
                          {price(l.total)} {tr(lang, T.withShipping)}
                        </span>
                      )}
                      {l.shopCount != null && (
                        <span className="hidden shrink-0 text-xs text-faint sm:inline">
                          {l.shopCount} {tr(lang, T.shops)}
                        </span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
                    </a>
                  </li>
                ))}
              </ul>
              <div>
                <div className="mb-1.5 text-xs text-faint">{tr(lang, T.dailyLow)}</div>
                <Suspense fallback={<div className="h-48 rounded-lg bg-panel ring-1 ring-line" />}>
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
