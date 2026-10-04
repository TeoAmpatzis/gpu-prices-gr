import { Clock, PackageCheck, TrendingDown, TrendingUp, TriangleAlert, Truck } from 'lucide-react';
import { tr, useLang, type Lang, type Text } from '../lib/i18n';
import { formatPrice, timeAgo } from '../lib/data';
import { SOURCES } from '../lib/sources';
import type { SourceName } from '../types';
import { UI, num } from './strings';

/** Everything the price cell can say about one offer; a missing field is unknown and not invented. */
export interface PriceInfo {
  price: number;
  source: SourceName;
  /** The shop that sells it (e.g. "Plaisio"); null/undefined = not known, only the source is shown. */
  shop?: string | null;
  /** Delivery cost of the same offer: 0 = free, null/undefined = unknown. */
  shipping?: number | null;
  /** Shown only when known (collected from Phase 2). */
  availability?: Text | null;
  /** When the source last read this price (ISO). */
  checkedAt?: string | null;
  /** Change in € against 7 days ago; null = no history that old. */
  week?: number | null;
  /** Far below the group's usual price (plan, price rule 4). */
  unusual?: boolean;
}

export const STALE_HOURS = 24;
export const isStale = (iso: string | null | undefined, now = Date.now()) =>
  !!iso && now - new Date(iso).getTime() > STALE_HOURS * 3_600_000;

/** "Plaisio, μέσω Skroutz" / "μέσω Skroutz" / "e-shop.gr" (a shop itself). */
export function sellerLine(lang: Lang, source: SourceName, shop?: string | null): string {
  const src = SOURCES[source].label;
  if (source === 'eshop') return src;
  return shop ? `${shop}, ${tr(lang, UI.via)} ${src}` : `${tr(lang, UI.via)} ${src}`;
}

/**
 * The same price cell everywhere (lists, cards, builder, product page): price, shop and source, shipping,
 * availability, 7-day change and when it was checked — all visible text, nothing only on hover (UX-23),
 * the change always labelled (UX-24). `compact` (builder part list): price, seller, shipping, and the
 * check time only when it is stale.
 */
export function PriceCell({ info, align = 'start', compact = false }: { info: PriceInfo; align?: 'start' | 'end' | 'responsive'; compact?: boolean }) {
  const lang = useLang();
  const p = (n: number) => formatPrice(n, lang);
  const stale = isStale(info.checkedAt);
  const row = `flex items-center gap-1.5 ${align === 'end' ? 'justify-end text-right' : align === 'responsive' ? 'sm:justify-end sm:text-right' : ''}`;
  const pct = info.week != null && info.price - info.week > 0 ? (info.week / (info.price - info.week)) * 100 : null;

  return (
    <div className={`flex flex-col gap-0.5 ${align === 'end' ? 'items-end' : align === 'responsive' ? 'items-start sm:items-end' : 'items-start'}`}>
      <span className="ui-num text-lg font-semibold leading-6 text-fg">{p(info.price)}</span>
      <span className={`${row} text-sm text-fg-soft`}>{sellerLine(lang, info.source, info.shop)}</span>

      <span className={`${row} text-sm ${info.shipping == null ? 'text-faint' : 'text-muted'}`}>
        <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {info.shipping == null
          ? tr(lang, UI.noShipping)
          : info.shipping === 0
            ? tr(lang, UI.freeShipping)
            : `+ ${p(info.shipping)} ${tr(lang, UI.shippingPlus)} · ${tr(lang, UI.total)} ${p(info.price + info.shipping)}`}
      </span>

      {!compact && info.availability && (
        <span className={`${row} text-sm text-muted`}>
          <PackageCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {tr(lang, info.availability)}
        </span>
      )}

      {!compact &&
        info.week != null &&
        (Math.abs(info.week) < 1 ? (
          <span className={`${row} text-sm text-faint`}>{tr(lang, UI.steady7days)}</span>
        ) : (
          <span className={`${row} ui-num flex-wrap text-sm font-medium ${info.week < 0 ? 'text-success-fg' : 'text-danger-fg'}`}>
            {info.week < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {info.week < 0 ? '−' : '+'}
            {p(Math.abs(info.week))}
            {pct != null && <span className="whitespace-nowrap">{` (${info.week < 0 ? '−' : '+'}${num(lang, Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0)}%)`}</span>}{' '}
            <span className="whitespace-nowrap">{tr(lang, UI.in7days)}</span>
          </span>
        ))}

      {info.checkedAt && (!compact || stale) && (
        <span className={`${row} text-xs ${stale ? 'font-medium text-warning-fg' : 'text-faint'}`}>
          {stale ? (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {tr(lang, UI.checked)} <span className="whitespace-nowrap">{timeAgo(info.checkedAt, lang)}</span>
          {stale && `, ${tr(lang, UI.stale)}`}
        </span>
      )}

      {info.unusual && (
        <span className="ui-badge ui-badge--warning mt-1 whitespace-normal py-0.5 text-left">
          <TriangleAlert aria-hidden="true" />
          {tr(lang, UI.unusualLow)}
        </span>
      )}
    </div>
  );
}
