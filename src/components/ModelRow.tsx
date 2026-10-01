import { Fragment, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import type { BaseListing, Category, DailyLow } from '../types';
import { formatPrice, loadDetails, type CategoryDetails, type Model } from '../lib/data';
import { groupName, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Lang } from '../lib/i18n';
import { SOURCES } from '../lib/sources';
import SourceBadge from './SourceBadge';

// The chart is only needed once a row is expanded.
const PriceChart = lazy(() => import('./PriceChart'));

/** Change vs. the most recent history point at least 7 days old. */
function weekChange(points: DailyLow[] | undefined, current: number): number | null {
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
  history: DailyLow[] | undefined;
  open: boolean;
  onToggle: () => void;
}

/** All-time low, sale and source badges of a model's cheapest offer. */
function PriceBadges<L extends BaseListing>({ m, lang }: { m: Model<L>; lang: Lang }) {
  return (
    <>
      {m.low && (
        <span
          className="badge badge-low"
          title={`${tr(lang, T.allTimeLowHint)} ${new Date(m.low.since).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB')}`}
        >
          {tr(lang, T.allTimeLow)}
        </span>
      )}
      {m.sale && (
        <span className="badge badge-sale" title={`${tr(lang, T.saleBy)} ${SOURCES[m.sale.source].label}`}>
          −{m.sale.pct}%
        </span>
      )}
      <SourceBadge source={m.cheapest.source} />
    </>
  );
}

/** "↓ €5  ·  €212 incl. shipping" under the price, when either is known. */
function PriceExtras<L extends BaseListing>({ m, delta, lang }: { m: Model<L>; delta: number | null; lang: Lang }) {
  const price = (n: number) => formatPrice(n, lang);
  const moved = delta != null && Math.abs(delta) >= 1;
  if (!m.bestTotal && !moved) return null;
  return (
    <>
      {moved && (
        <span
          className={`inline-flex items-center gap-0.5 ${delta! < 0 ? 'text-accent' : 'text-up'}`}
          title={tr(lang, T.weekChange)}
        >
          {delta! < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {price(Math.abs(delta!))}
        </span>
      )}
      {m.bestTotal && (
        <span title={totalHint(m.bestTotal, lang)}>
          {price(m.bestTotal.total!)} {tr(lang, T.withShipping)}
        </span>
      )}
    </>
  );
}

/** Shop links and full price history of a category, loaded the first time one of its products opens. */
function useDetails(cat: Category): CategoryDetails | null {
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  useEffect(() => {
    let live = true;
    loadDetails(cat)
      .then((d) => live && setDetails(d))
      .catch(() => live && setDetails({ urls: {}, history: {} }));
    return () => {
      live = false;
    };
  }, [cat]);
  return details;
}

/** Every offer of the model (links to the shops) and its price history chart. */
function ModelDetails<L extends BaseListing>({ cat, m, lang }: { cat: Category; m: Model<L>; lang: Lang }) {
  const price = (n: number) => formatPrice(n, lang);
  const details = useDetails(cat);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl bg-panel ring-1 ring-edge">
        {m.listings.map((l) => (
          <li key={l.id}>
            <a
              href={details?.urls[l.id]}
              target="_blank"
              rel="noopener noreferrer"
              className="tap flex items-center gap-3 px-3 py-2 text-sm tabular-nums transition-colors duration-150 hover:bg-hover"
            >
              <span className="w-20 shrink-0 text-right font-medium sm:w-24">{price(l.price)}</span>
              {/* Narrow boxes (cards, the list beside the chart): badges, then the title across the
                  full width, then shipping and shop count, each on its own line. From xl all on one
                  line. Either way a row never gets wider than its box. */}
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 xl:flex-row xl:items-center xl:gap-3">
                <span className="flex shrink-0 items-center gap-1.5">
                  {l.drop != null && l.drop >= 5 && <span className="badge badge-sale">−{l.drop}%</span>}
                  <SourceBadge source={l.source} />
                </span>
                <span className="line-clamp-2 min-w-0 text-fg-soft [overflow-wrap:anywhere] xl:line-clamp-1 xl:flex-1" title={l.title}>
                  {l.title}
                </span>
                {(l.total != null || l.shopCount != null) && (
                  <span className="flex flex-wrap gap-x-3 text-xs xl:shrink-0">
                    {l.total != null && (
                      <span className="text-muted" title={totalHint(l, lang)}>
                        {price(l.total)} {tr(lang, T.withShipping)}
                      </span>
                    )}
                    {l.shopCount != null && (
                      <span className="text-faint">
                        {l.shopCount} {tr(lang, T.shops)}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
            </a>
          </li>
        ))}
      </ul>
      <div>
        <div className="mb-1.5 text-xs text-faint">{tr(lang, T.dailyLow)}</div>
        {details ? (
          <Suspense fallback={<div className="h-48 rounded-xl bg-panel ring-1 ring-edge" />}>
            <PriceChart points={details.history[m.key]} />
          </Suspense>
        ) : (
          <div className="skeleton h-48 rounded-xl" />
        )}
      </div>
    </div>
  );
}

/** Table row (tablet and desktop); the details open in a full-width row under it. */
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
          <button type="button" aria-expanded={open} className="tap flex items-center gap-2 rounded-md text-left">
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${cfg.groupDot[m.group] ?? 'bg-idle'}`}
              title={groupName(m.group, lang)}
            />
            <span className="font-semibold tracking-tight">{m.chip}</span>
          </button>
        </td>
        {cfg.before.map(td)}
        <td className="px-2 text-right">
          {/* Badges first and the price last, so prices line up on the right edge of the column. */}
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <PriceBadges m={m} lang={lang} />
            <span className="ml-0.5 text-[15px] font-semibold text-accent">{price(m.cheapest.price)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-2 text-xs text-muted">
            <PriceExtras m={m} delta={delta} lang={lang} />
          </div>
        </td>
        {cfg.after.map(td)}
        <td className="hidden whitespace-nowrap px-2 text-right text-sm text-muted xl:table-cell">
          {m.listings.length > 1 ? `${tr(lang, T.upTo)} ${price(m.maxPrice)}` : '—'}
        </td>
        <td className="pl-2 pr-4 text-right text-sm text-muted">{m.listings.length}</td>
      </tr>
      {open && (
        <tr className="bg-sunken">
          <td colSpan={colSpan} className="border-t border-line px-4 pb-5 pt-4">
            <ModelDetails cat={cfg.id} m={m} lang={lang} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Phone and tablet layout (< 1024px): one card per model instead of a table row — name and price on top, the
 * category's spec columns as one line, badges and listing count below. Tapping opens the details.
 */
export function ModelCard<L extends BaseListing>({ cfg, model: m, history, open, onToggle }: Props<L>) {
  const lang = useLang();
  const delta = weekChange(history, m.cheapest.price);
  // The same values as the table columns, without headers; empty ones ("—") are skipped.
  const specs: ReactNode[] = [...cfg.before, ...cfg.after]
    .map((c) => c.cell(m, lang))
    .filter((v) => v != null && v !== '' && v !== '—');
  return (
    <li className="card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full flex-col gap-2 p-4 text-left transition-colors duration-150 active:bg-hover"
      >
        <div className="flex w-full items-start gap-3">
          <span
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${cfg.groupDot[m.group] ?? 'bg-idle'}`}
            title={groupName(m.group, lang)}
          />
          <span className="min-w-0 flex-1 font-semibold leading-snug tracking-tight">{m.chip}</span>
          <span className="whitespace-nowrap text-lg font-semibold tabular-nums text-accent">
            {formatPrice(m.cheapest.price, lang)}
          </span>
        </div>
        {specs.length > 0 && (
          <div className="pl-5 text-sm text-muted">
            {specs.map((s, i) => (
              <Fragment key={i}>
                {i > 0 && ' · '}
                {s}
              </Fragment>
            ))}
          </div>
        )}
        <div className="flex w-full flex-wrap items-center gap-1.5 pl-5">
          <PriceBadges m={m} lang={lang} />
          <span className="ml-auto flex items-center gap-1 text-sm text-muted">
            {m.listings.length} {tr(lang, T.listingsShort)}
            <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 pl-5 text-sm tabular-nums text-muted empty:hidden">
          <PriceExtras m={m} delta={delta} lang={lang} />
        </div>
      </button>
      {open && (
        <div className="border-t border-line bg-sunken p-3">
          <ModelDetails cat={cfg.id} m={m} lang={lang} />
        </div>
      )}
    </li>
  );
}
