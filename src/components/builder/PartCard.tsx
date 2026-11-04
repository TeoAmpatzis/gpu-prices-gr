import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { Category, StorageListing } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice, saleOf } from '../../lib/data';
import type { Slot } from '../../lib/builderData';
import type { Line } from '../../lib/buildStore';
import type { Rating } from '../../lib/fitLabel';
import type { AnyModel, BuilderState } from '../../lib/builderState';
import { tr, type Lang, type Text } from '../../lib/i18n';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { FitBadge, ShipNote, partImage, specLine } from './parts';
import PsuCard from './PsuCard';
import ShopChoice from './ShopChoice';
import { BUILDER as B } from '../../ui/builderStrings';
import { lineNotice, lineTitle } from '../../lib/copyList';
const G = { chosen: { el: 'Επιλέχθηκε', en: 'Chosen' }, choose: { el: 'Επιλογή', en: 'Choose' }, remove: { el: 'Αφαίρεση', en: 'Remove' } };
export default function PartCard({
  slot,
  m,
  rating,
  hide,
  reason,
  chosen,
  onChoose,
  onRemove,
  lang,
  children,
  state,
  line,
}: {
  slot: Slot;
  m: AnyModel;
  rating: Rating;
  hide: boolean;
  /** The step's one "not verified" reason: not repeated on the card. */
  reason: Text | null;
  chosen: boolean;
  onChoose: () => void;
  onRemove: () => void;
  lang: Lang;
  children?: ReactNode;
  state: BuilderState;
  line: Line;
}) {
  const t = (x: Text) => tr(lang, x);
  const clash = hide;
  const reasons = rating.reasons.filter((r) => !reason || tr('en', r) !== tr('en', reason));
  const resolved = chosen ? state.resolvedLines.find((r) => r.line === line) : undefined;
  const display = resolved ? resolved.displayModel : m;
  const notice = resolved && lineNotice(resolved);
  const sale = display && saleOf(display.listings, display.cheapest);
  const Icon = CATEGORIES[slot as Category].icon;
  return (
    <li
      className={`card flex flex-col gap-2 p-3 ${clash ? 'opacity-60' : ''} ${chosen ? 'ring-2 ring-accent dark:ring-accent' : ''}`}
      aria-disabled={clash || undefined}
    >
      <div className="flex gap-3">
        <ProductPhoto image={partImage(m)} size="md" icon={Icon} alt="" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-medium [overflow-wrap:anywhere]">{resolved ? lineTitle(resolved, lang) : m.chip}</div>
          <div className="mt-0.5 text-xs text-muted [overflow-wrap:anywhere]">{notice ? <span data-offer-notice={resolved?.status}>{t(notice)}</span> : display && (slot === 'psu' ? <PsuCard m={display} lang={lang} /> : specLine(slot, display, lang))}</div>
        </div>
      </div>
      {children}
      {slot === 'storage' && line === 'storage' && (display?.cheapest as StorageListing | undefined)?.media === 'HDD' && <p className="notice-warn p-2 text-xs">{t(B.hddSystem)}</p>}
      {(rating.fit || sale) && (
        <div className="flex flex-wrap items-center gap-2">
          <FitBadge rating={rating} lang={lang} />
          {sale && <span className="badge badge-sale">−{sale.pct}%</span>}
        </div>
      )}
      {rating.fit && rating.fit !== 'fits' && reasons[0] && <p className="line-clamp-3 text-xs text-muted">{reasons.map((r) => t(r)).join(' ')}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {display && <><span className="font-semibold tabular-nums">{formatPrice(display.cheapest.price, lang)}</span>
        <SourceBadge source={display.cheapest.source} />
        <ShipNote m={display} lang={lang} /></>}
        {chosen ? (
          <span className="ml-auto flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
              <Check className="h-4 w-4" /> {t(G.chosen)}
            </span>
            <button type="button" onClick={onRemove} className="tap rounded-lg px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg">
              {t(G.remove)}
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={clash}
            onClick={onChoose}
            className="tap ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-muted disabled:ring-line-strong disabled:hover:bg-transparent"
          >
            {t(G.choose)}
          </button>
        )}
      </div>
      {chosen && <ShopChoice state={state} line={line} model={m} lang={lang} />}
    </li>
  );
}
