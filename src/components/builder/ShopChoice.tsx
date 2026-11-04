import { useState } from 'react';
import type { BaseListing } from '../../types';
import type { AnyModel, BuilderState } from '../../lib/builderState';
import type { Line } from '../../lib/buildStore';
import { formatPrice } from '../../lib/data';
import { tr, type Lang } from '../../lib/i18n';
import { BUILDER as B } from '../../ui/builderStrings';
import { T } from '../../lib/i18n';
import SourceBadge from '../SourceBadge';
import { ShipNote } from './parts';
import { resolveLine } from '../../lib/builderOffers';
import { encodeOfferChoice, resolveOfferChoice } from '../../lib/productSelection';

export default function ShopChoice({ state, line, model, lang }: { state: BuilderState; line: Line; model: AnyModel; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const key = `${line === 'storage2' ? 'storage' : line}:${model.key}`;
  const [localRows, setLocalRows] = useState<BaseListing[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rows = state.offerRows[key] ?? localRows;
  const load = () => {
    setOpen(true);
    setFailed(false);
    state.wantExtra();
    void state.loadOffers(line, model).then(
      (r) => {
        setLocalRows(r);
      },
      () => {
        setFailed(true);
      },
    );
  };
  return <div className="flex min-h-11 min-w-0 flex-col text-sm" data-shop-choice={line}>
    <button type="button" className="tap self-start px-2 text-accent hover:underline" aria-expanded={open} onClick={() => open ? setOpen(false) : load()}>{tr(lang, B.otherShop)}</button>
    {open && <div className="flex flex-col gap-1">
      {failed ? <button type="button" className="tap text-accent" onClick={load}>{tr(lang, B.offersRetry)}</button> : rows === null ? <p role="status">{tr(lang, T.loading)}</p> : rows.length === 0 ? <p>{tr(lang, B.noOffers)}</p> : rows.map((row) => {
        const choice = encodeOfferChoice(row);
        const resolved = resolveLine(line, model, line === 'fan' ? state.fanQty : 1, choice, rows);
        return <div key={choice} className="flex min-w-0 flex-wrap items-center gap-2 border-t border-line py-1">
          <button type="button" aria-pressed={resolveOfferChoice(rows, state.offers[line] ?? '') === row} className="tap flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg px-2 text-left hover:bg-hover" onClick={() => state.chooseOffer(line, model, choice)}>
            <span className="font-semibold tabular-nums">{formatPrice(row.price, lang)}</span><SourceBadge source={row.source} /><span className="break-words text-xs text-muted">{resolved.offer.merchant}</span><ShipNote m={{ ...model, cheapest: resolved.offer }} lang={lang} />
          </button>
          <a className="tap px-2 text-accent hover:underline" href={row.url} target="_blank" rel="noopener noreferrer">{tr(lang, B.shopLink)}</a>
        </div>;
      })}
    </div>}
  </div>;
}
