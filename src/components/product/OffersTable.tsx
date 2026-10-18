// A product page's shops table (step 4, task 6; docs/redesign-v2.md "Σελίδα προϊόντος" part 2): every offer, lowest
// total first (lib/offers.sortOffers), with its price, shipping, total (price + shipping), availability (only once a
// source states it) and when its source was last read (⚠ after 24 h, as the price cell). The first 20 offers, then
// "Show all N". Phones and tablets (< 1024 px): one card per offer, same order.
import { ChevronDown, Clock, ExternalLink, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Category, Latest, BaseListing } from '../../types';
import { formatPrice } from '../../lib/data';
import { tr, useLang, type Lang } from '../../lib/i18n';
import { availabilityOf, checkedAt, FIRST_OFFERS, hasAvailability, offerTotal } from '../../lib/offers';
import { shortTitles, titleOptions } from '../../lib/titles';
import { useMedia } from '../../lib/useMedia';
import { Button, LinkButton } from '../../ui/Button';
import { isStale, sellerLine } from '../../ui/PriceCell';
import { ago, num, plural, UI } from '../../ui/strings';
import SourceBadge from '../SourceBadge';
import { SHOP_REL } from './ProductHeader';

/** "—" for an unknown amount, with "Shipping: unknown" (glossary) for the pointer (title) and for screen readers. */
function Unknown({ lang }: { lang: Lang }) {
  const text = tr(lang, UI.noShipping);
  return (
    <span title={text} className="text-faint">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** When the offer's source was last read; older than 24 h: warning colour, ⚠ and "may have changed" (as PriceCell). */
function Checked({ iso, lang, label = false }: { iso: string | null; lang: Lang; label?: boolean }) {
  const stale = isStale(iso);
  const Icon = stale ? TriangleAlert : Clock;
  return (
    <span data-checked={stale ? 'stale' : 'fresh'} className={`inline-flex items-start gap-1 ${stale ? 'font-medium text-warning-fg' : ''}`}>
      {(stale || label) && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>
        {label && `${tr(lang, UI.offerChecked)} `}
        <span className="whitespace-nowrap">{ago(lang, iso)}</span>
        {stale && `, ${tr(lang, UI.stale)}`}
      </span>
    </span>
  );
}

/** Source badge, the site's own discount, the shop when known, and the shop's title shortened to what differs. */
function Seller({ l, short, clamp }: { l: BaseListing; short: string; clamp: string }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={l.source} />
        {l.drop != null && l.drop >= 5 && <span className="badge badge-sale">−{l.drop}%</span>}
        {l.merchant && <span className="font-medium text-fg [overflow-wrap:anywhere]">{l.merchant}</span>}
      </div>
      <div className={`mt-0.5 text-xs text-muted [overflow-wrap:anywhere] ${clamp}`} title={l.title}>
        {short}
      </div>
    </div>
  );
}

/** The offer's link to its shop (new tab); the visible words are the same on every row, the rest is for screen readers. */
function ShopLink({ l, lang, className = '' }: { l: BaseListing; lang: Lang; className?: string }) {
  return (
    <LinkButton variant="secondary" size="sm" icon={ExternalLink} href={l.url} target="_blank" rel={SHOP_REL} className={`tap ${className}`}>
      {tr(lang, UI.toShop)}
      <span className="sr-only">{` (${sellerLine(lang, l.source, l.merchant)}, ${tr(lang, UI.newTab)})`}</span>
    </LinkButton>
  );
}

export function OffersTable({
  cat,
  chip,
  offers,
  sources,
}: {
  cat: Category;
  chip: string;
  /** Already in the table's order (lib/offers.sortOffers). */
  offers: BaseListing[];
  sources: Latest['sources'];
}) {
  const lang = useLang();
  const wide = useMedia('(min-width: 1024px)');
  const [all, setAll] = useState(false);
  // After "Show all", focus moves to the first offer that was hidden, so keyboard and screen-reader users go on from there.
  const firstNew = useRef<HTMLElement | null>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (all && opened.current) {
      opened.current = false;
      firstNew.current?.focus();
    }
  }, [all]);

  const price = (n: number) => formatPrice(n, lang);
  const avail = hasAvailability(offers);
  const shorts = shortTitles(
    offers.map((l) => l.title),
    chip,
    titleOptions(cat),
  );
  const shown = all ? offers : offers.slice(0, FIRST_OFFERS);
  const more = offers.length - shown.length;
  // The first offer "Show all" reveals: focusable from script only (tabIndex −1), not a tab stop.
  const keep = (el: HTMLElement | null) => {
    firstNew.current = el;
  };
  const reveal = (i: number) => (i === FIRST_OFFERS ? { ref: keep, tabIndex: -1 } : {});
  const shipping = (l: BaseListing): ReactNode => (offerTotal(l) == null || l.shipping == null ? <Unknown lang={lang} /> : price(l.shipping));
  const total = (l: BaseListing): ReactNode => {
    const t = offerTotal(l);
    return t == null ? <Unknown lang={lang} /> : price(t);
  };
  const iso = (l: BaseListing) => checkedAt(sources, l.source);

  return (
    <section aria-labelledby="offers-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="offers-title" className="text-lg font-semibold tracking-tight">
          {tr(lang, UI.shopsTitle)}
        </h2>
        <span className="ui-num text-sm text-muted">{plural(lang, offers.length, UI.offerForms)}</span>
      </div>

      {wide ? (
        <div className="ui-card overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-sunken text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 text-left">
                  {tr(lang, UI.offerShop)}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {tr(lang, UI.price)}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {tr(lang, UI.offerShipping)}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {tr(lang, UI.offerTotal)}
                </th>
                {avail && (
                  <th scope="col" className="px-3 py-2 text-left">
                    {tr(lang, UI.offerAvailability)}
                  </th>
                )}
                <th scope="col" className="px-3 py-2 text-left">
                  {tr(lang, UI.offerChecked)}
                </th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">{tr(lang, UI.openShop)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l, i) => (
                <tr key={l.id} data-offer {...reveal(i)} className="border-t border-line align-middle hover:bg-hover">
                  <td className="px-4 py-2.5">
                    <Seller l={l} short={shorts[i]} clamp="line-clamp-1" />
                  </td>
                  <td data-cell="price" className="whitespace-nowrap px-3 py-2.5 text-right text-fg">{price(l.price)}</td>
                  <td data-cell="shipping" className="whitespace-nowrap px-3 py-2.5 text-right text-muted">{shipping(l)}</td>
                  <td data-cell="total" className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-fg">{total(l)}</td>
                  {avail && <td className="px-3 py-2.5 text-muted">{availabilityOf(l) ?? '—'}</td>}
                  <td className="px-3 py-2.5 text-muted">
                    <Checked iso={iso(l)} lang={lang} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <ShopLink l={l} lang={lang} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((l, i) => {
            const cells: [string, string, ReactNode, string][] = [
              ['price', tr(lang, UI.price), price(l.price), 'text-fg'],
              ['shipping', tr(lang, UI.offerShipping), shipping(l), 'text-muted'],
              ['total', tr(lang, UI.offerTotal), total(l), 'font-semibold text-fg'],
            ];
            const a = availabilityOf(l);
            return (
              <li key={l.id} data-offer {...reveal(i)} className="ui-card flex flex-col gap-3 p-3">
                <Seller l={l} short={shorts[i]} clamp="line-clamp-2" />
                <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
                  {cells.map(([cell, label, value, cls]) => (
                    <div key={cell} className="min-w-0">
                      <dt className="text-xs text-faint">{label}</dt>
                      <dd data-cell={cell} className={`whitespace-nowrap ${cls}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {avail && (
                  <p className="text-sm text-muted">
                    {tr(lang, UI.offerAvailability)}: {a ?? '—'}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-faint">
                    <Checked iso={iso(l)} lang={lang} label />
                  </span>
                  <ShopLink l={l} lang={lang} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {more > 0 && (
        <Button
          variant="secondary"
          icon={ChevronDown}
          data-show-all
          className="tap self-start"
          onClick={() => {
            opened.current = true;
            setAll(true);
          }}
        >
          {UI.showAllOffers[lang].replace('{n}', num(lang, offers.length))}
        </Button>
      )}
    </section>
  );
}
