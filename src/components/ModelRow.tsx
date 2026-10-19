import { Fragment, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { BaseListing, Category, DailyLow, HistoryPoint } from '../types';
import { formatPrice, loadDetails, type CategoryDetails, type Model } from '../lib/data';
import { chartHistory, loadModel } from '../lib/modelData';
import { modelSlug } from '../lib/slug';
import { href } from '../shell/nav';
import { groupName, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Lang } from '../lib/i18n';
import { SOURCES } from '../lib/sources';
import SourceBadge from './SourceBadge';
import { isExamplePhoto } from '../lib/examplePhoto';
import ProductPhoto from './ProductPhoto';
import { shortTitles, titleOptions } from '../lib/titles';
import type { ProductImage } from '../lib/images';

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

/** Pick mode (`?pick=1`, src/components/PickView.tsx): what a model's row adds. */
export interface RowExtra<L extends BaseListing> {
  /** Greyed: "Only compatible" is off and the model would be hidden (its reason is in `extra`). */
  dim: boolean;
  /** Findings and the "Add to build" button, under the name. */
  extra: ReactNode;
  /** Per offer in the open row (graphics cards: each card is added on its own): greyed or not, and what it adds. */
  listing?: (l: L) => { dim: boolean; extra: ReactNode };
}
export type RowPick<L extends BaseListing> = (m: Model<L>) => RowExtra<L>;

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  model: Model<L>;
  history: DailyLow[] | undefined;
  /** Its photo (src/lib/images.ts productImage), or null for the category icon. */
  image: ProductImage | null;
  open: boolean;
  onToggle: () => void;
  pick?: RowExtra<L>;
}

const DIM = 'opacity-50';

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
function PriceExtras<L extends BaseListing>({ m, delta, lang, short }: { m: Model<L>; delta: number | null; lang: Lang; short?: boolean }) {
  const price = (n: number) => formatPrice(n, lang);
  const moved = delta != null && Math.abs(delta) >= 1;
  if (!m.bestTotal && !moved) return null;
  const sign = delta != null && delta < 0 ? '−' : '+';
  const full = moved ? `${sign}${price(Math.abs(delta!))} ${tr(lang, T.in7days)}` : '';
  return (
    <>
      {moved && (
        <span
          className={`inline-flex items-center gap-0.5 ${delta! < 0 ? 'text-success-fg' : 'text-up'}`}
          title={`${full}. ${tr(lang, T.weekChange)}`}
        >
          {delta! < 0 ? <TrendingDown className="h-3 w-3 shrink-0" aria-hidden="true" /> : <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />}
          <span className="whitespace-nowrap" aria-hidden={short ? true : undefined}>
            {sign}
            {price(Math.abs(delta!))}{short ? `/${tr(lang, T.in7daysShort)}` : ` ${tr(lang, T.in7days)}`}
          </span>
          {short && <span className="sr-only">{full}</span>}
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

/** Shop links of a category, loaded the first time one of its products opens. */
function useDetails(cat: Category): CategoryDetails | null {
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  useEffect(() => {
    let live = true;
    loadDetails(cat)
      .then((d) => live && setDetails(d))
      .catch(() => live && setDetails({ urls: {} }));
    return () => {
      live = false;
    };
  }, [cat]);
  return details;
}

/**
 * The model's price history for the chart (its model chunk); null while loading, undefined when there is none. The
 * model may be shown through some of its listings (a source filter), so its slug may be another shop's spelling: the
 * chunk lookup (slug.slugLookup) finds it all the same.
 */
function useChartHistory(cat: Category, m: { key: string; chip: string; cheapest: object; listings: readonly object[] }): HistoryPoint[] | undefined | null {
  const slug = modelSlug(cat, m);
  const [state, setState] = useState<{ slug: string; points: HistoryPoint[] | undefined } | null>(null);
  useEffect(() => {
    let live = true;
    loadModel(cat, slug)
      .then((e) => live && setState({ slug, points: chartHistory(e) }))
      .catch(() => live && setState({ slug, points: undefined }));
    return () => {
      live = false;
    };
  }, [cat, slug]);
  return state?.slug === slug ? state.points : null;
}

/** Every offer of the model (links to the shops) and its price history chart. */
function ModelDetails<L extends BaseListing>({
  cat,
  m,
  image,
  example,
  icon,
  lang,
  listingExtra,
}: {
  cat: Category;
  m: Model<L>;
  image: ProductImage | null;
  example: boolean;
  icon: LucideIcon;
  lang: Lang;
  listingExtra?: RowExtra<L>['listing'];
}) {
  const price = (n: number) => formatPrice(n, lang);
  const details = useDetails(cat);
  const history = useChartHistory(cat, m);
  const shorts = shortTitles(m.listings.map((l) => l.title), m.chip, titleOptions(cat));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl bg-panel ring-1 ring-edge">
        {m.listings.map((l, i) => {
          const x = listingExtra?.(l);
          return (
          <li key={l.id}>
            <a
              href={details?.urls[l.id]}
              target="_blank"
              rel="noopener noreferrer"
              className={`tap flex items-center gap-3 px-3 py-2 text-sm tabular-nums transition-colors duration-150 hover:bg-hover ${x?.dim ? DIM : ''}`}
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
                  {shorts[i]}
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
            {x?.extra}
          </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3">
        <div>
          <ProductPhoto image={image} size="lg" icon={icon} alt={m.chip} hint={image && example ? tr(lang, T.examplePhoto) : undefined} />
          {example && <p className="mt-1 max-w-40 text-xs text-faint">{tr(lang, T.examplePhoto)}</p>}
        </div>
        <div>
          <div className="mb-1.5 text-xs text-faint">{tr(lang, T.dailyLow)}</div>
          {history !== null ? (
            <Suspense fallback={<div className="h-48 rounded-xl bg-panel ring-1 ring-edge" />}>
              <PriceChart points={history} />
            </Suspense>
          ) : (
            <div className="skeleton h-48 rounded-xl" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Table row (tablet and desktop); the details open in a full-width row under it. */
export default function ModelRow<L extends BaseListing>({ cfg, model: m, history, image, open, onToggle, pick }: Props<L>) {
  const lang = useLang();
  const price = (n: number) => formatPrice(n, lang);
  const delta = weekChange(history, m.cheapest.price);
  const example = !!image && isExamplePhoto(cfg, m);
  const colSpan = 4 + cfg.before.length + cfg.after.length;
  // Greyed (pick mode, "Only compatible" off): everything but the reason, which stays readable.
  const dim = pick?.dim ? DIM : '';
  const td = (c: CategoryConfig<L>['before'][number]) => (
    <td
      key={tr('en', c.header)}
      className={`whitespace-nowrap px-2 text-sm text-fg-soft ${c.numeric ? 'text-right' : ''} ${c.className ?? ''} ${dim}`}
    >
      {c.cell(m, lang)}
    </td>
  );
  return (
    <>
      <tr
        onClick={(e) => {
          // The row opens from a click anywhere on it; the name's link and the details button act on their own.
          if (!(e.target as Element).closest('a, button')) onToggle();
        }}
        className={`cursor-pointer border-t border-line transition-colors duration-150 first:border-t-0 hover:bg-hover/60 ${open ? 'bg-hover/60' : ''}`}
      >
        <td className="py-3 pl-2 pr-2">
          <div className="flex items-center gap-1">
            {/* The details button opens the quick view under the row (Tab, Enter / Space); the name is the link. */}
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${tr(lang, T.showOffers)}: ${m.chip}`}
              onClick={onToggle}
              className={`tap tap-square grid h-8 w-8 shrink-0 place-items-center rounded-md ${dim}`}
            >
              <ChevronDown
                className={`h-4 w-4 text-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {/* The product page: a real link (new tab, copy address); the router opens it without a reload. */}
            <a
              href={href.model(cfg.id, modelSlug(cfg.id, m))}
              data-product-link=""
              className={`tap flex min-w-0 items-center gap-2 rounded-md text-left hover:underline ${dim}`}
            >
              <ProductPhoto image={image} size="sm" icon={cfg.icon} alt="" hint={example ? tr(lang, T.examplePhoto) : undefined} />
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${cfg.groupDot[m.group] ?? 'bg-idle'}`}
                title={groupName(m.group, lang)}
              />
              <span className="font-semibold tracking-tight">{m.chip}</span>
            </a>
          </div>
          <div className="pl-9">{pick?.extra}</div>
        </td>
        {cfg.before.map(td)}
        <td className={`px-2 text-right ${dim}`}>
          {/* Badges first and the price last, so prices line up on the right edge of the column. */}
          {/* Badges may wrap above the price when the column is tight (photos widen the name column). */}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <PriceBadges m={m} lang={lang} />
            <span className="ml-0.5 whitespace-nowrap text-[15px] font-semibold text-fg">{price(m.cheapest.price)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1 text-xs text-muted">
            <PriceExtras m={m} delta={delta} lang={lang} short />
          </div>
        </td>
        {cfg.after.map(td)}
        <td className={`hidden whitespace-nowrap px-2 text-right text-sm text-muted xl:table-cell ${dim}`}>
          {m.listings.length > 1 ? `${tr(lang, T.upTo)} ${price(m.maxPrice)}` : '—'}
        </td>
        <td className={`pl-2 pr-4 text-right text-sm text-muted ${dim}`}>{m.listings.length}</td>
      </tr>
      {open && (
        <tr className="bg-sunken">
          <td colSpan={colSpan} className="border-t border-line px-4 pb-5 pt-4">
            <ModelDetails cat={cfg.id} m={m} image={image} example={example} icon={cfg.icon} lang={lang} listingExtra={pick?.listing} />
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
export function ModelCard<L extends BaseListing>({ cfg, model: m, history, image, open, onToggle, pick }: Props<L>) {
  const lang = useLang();
  const delta = weekChange(history, m.cheapest.price);
  const example = !!image && isExamplePhoto(cfg, m);
  // The same values as the table columns, without headers; empty ones ("—") are skipped.
  const specs: ReactNode[] = [...cfg.before, ...cfg.after]
    .map((c) => ({ v: c.cell(m, lang), label: c.cardLabel }))
    .filter(({ v }) => v != null && v !== '' && v !== '—')
    .map(({ v, label }) => (label ? <>{tr(lang, label)} {v}</> : v));
  return (
    <li className="card overflow-hidden">
      {/* A tap anywhere on the card opens the offers; the name (link) and the offers button act on their own. */}
      <div
        onClick={(e) => {
          if (!(e.target as Element).closest('a, button')) onToggle();
        }}
        className={`flex items-start gap-3 p-4 ${pick?.dim ? DIM : ''}`}
      >
        <ProductPhoto image={image} size="md" icon={cfg.icon} alt="" hint={example ? tr(lang, T.examplePhoto) : undefined} caption={example ? tr(lang, T.examplePhotoShort) : undefined} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex w-full items-start gap-3">
          <span
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${cfg.groupDot[m.group] ?? 'bg-idle'}`}
            title={groupName(m.group, lang)}
          />
          <a
            href={href.model(cfg.id, modelSlug(cfg.id, m))}
            data-product-link=""
            className="tap flex min-w-0 flex-1 items-center rounded-md font-semibold leading-snug tracking-tight hover:underline"
          >
            {m.chip}
          </a>
          <span className="whitespace-nowrap text-lg font-semibold tabular-nums text-fg">
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
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${m.listings.length} ${tr(lang, T.listingsShort)}: ${m.chip}`}
            onClick={onToggle}
            className="tap ml-auto flex items-center gap-1 rounded-md pl-2 text-sm text-muted"
          >
            {m.listings.length} {tr(lang, T.listingsShort)}
            <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 pl-5 text-sm tabular-nums text-muted empty:hidden">
          <PriceExtras m={m} delta={delta} lang={lang} />
        </div>
        </div>
      </div>
      {pick?.extra && <div className="-mt-1 px-4 pb-4">{pick.extra}</div>}
      {open && (
        <div className="border-t border-line bg-sunken p-3">
          <ModelDetails cat={cfg.id} m={m} image={image} example={example} icon={cfg.icon} lang={lang} listingExtra={pick?.listing} />
        </div>
      )}
    </li>
  );
}
