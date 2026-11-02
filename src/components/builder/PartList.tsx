// The builder's part list (step 5 task 11, the Quick list base): one line per part in the order of SLOTS, the second
// drive after the first, the fans with their quantity last; each line with photo, name, specs, price, shop and label,
// and the step picker shared with the guided walk (task 12) in a sheet. A saved part whose step file failed shows a retry.

import { ExternalLink, RotateCw, X } from 'lucide-react';
import type { Category, StorageListing } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice } from '../../lib/data';
import { SLOTS, type Slot } from '../../lib/builderData';
import { optionalSlot } from '../../lib/builderEngine';
import { type AnyModel, type BuilderState } from '../../lib/builderState';
import { ratingOf } from '../../lib/fitLabel';
import { T, tr, useLang, type Text } from '../../lib/i18n';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { FitBadge, ShipNote, partImage, specLine } from './parts';
import FanPlanPanel, { FanQty } from './FanPlanPanel';
import Picker from './Picker';
import ShopChoice from './ShopChoice';
import { BottomSheet } from '../../ui/overlays';
import { UI } from '../../ui/strings';
import { BUILDER as B } from '../../ui/builderStrings';

/** A line of the list: a slot, or the second drive (chosen from the storage step's parts). */
type Line = Slot | 'storage2';
const LINES: Line[] = SLOTS.flatMap((s): Line[] => (s === 'storage' ? ['storage', 'storage2'] : [s]));
const slotOf = (l: Line): Slot => (l === 'storage2' ? 'storage' : l);

const S = {
  choose: { el: 'Επιλογή', en: 'Choose' },
  change: { el: 'Αλλαγή', en: 'Change' },
  remove: { el: 'Αφαίρεση', en: 'Remove' },
  optional: { el: 'προαιρετικό', en: 'optional' },
} satisfies Record<string, Text>;

/** `openLine`: the line whose picker is open, held by the workbench so Review's missing lines can open it. */
export default function PartList({ state, openLine, setOpen }: { state: BuilderState; openLine: Line | null; setOpen: (l: Line | null) => void }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const { build, update } = state;
  const findings = state.findings ?? [];
  const pick = (line: Line, m: AnyModel | undefined) => (line === 'storage2' ? state.setStorage2(m ?? null) : update({ ...build, [line]: m }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="card divide-y divide-line">
        {LINES.map((line) => {
          const slot = slotOf(line);
          const cfg = CATEGORIES[slot as Category];
          const Icon = cfg.icon;
          const m = (line === 'storage2' ? state.storage2 : build[slot]) as AnyModel | undefined;
          const resolved = state.resolvedLines.find((r) => r.line === line);
          const display = m && resolved ? { ...m, cheapest: resolved.offer } : m;
          const isOpen = openLine === line;
          const waiting = line === 'storage2' ? state.pendingStorage2 : state.pending.includes(slot);
          const qty = slot === 'fan' ? state.fanQty : 1;
          return (
            <div key={line} className="p-3 sm:p-4" data-line={line}>
              <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
                {m ? (
                  // The chosen part's photo (the shop's own), the category icon if none.
                  <ProductPhoto image={partImage(m)} size="md" icon={Icon} alt={m.chip} />
                ) : (
                  <span className={`grid w-14 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent ${waiting ? 'h-14' : 'h-9'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-xs text-muted">
                    {line === 'storage2' ? t(B.storage2) : t(cfg.tab)}
                    {(line === 'storage2' || slot === 'fan' || optionalSlot(slot, state.optFindings).optional) && <span className="text-faint"> · {t(S.optional)}</span>}
                  </div>
                  {m ? (
                    <>
                      <div className="min-h-12 font-semibold [overflow-wrap:anywhere] sm:min-h-6">{slot === 'gpu' && resolved?.offer.title ? resolved.offer.title : m.chip}</div>
                      <div className="min-h-10 text-xs text-muted [overflow-wrap:anywhere] sm:min-h-5">{specLine(slot, m, lang)}</div>
                      <div className="mt-1 min-h-12 sm:min-h-8">
                        <FitBadge rating={ratingOf(findings, line === 'storage2' ? `${m.key}#2` : m.key, state.parts)} lang={lang} />
                      </div>
                    </>
                  ) : waiting && state.slotFailed(slot) ? (
                    // Its step file failed (Review Focus 3): not counted in the total; a retry here.
                    <button type="button" onClick={() => state.wantSlot(slot)} className="tap inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                      <RotateCw className="h-4 w-4" aria-hidden="true" /> {t(UI.retry)}
                    </button>
                  ) : waiting ? (
                    <div role="status" aria-label={t(T.loading)}>
                      <div className="ui-skeleton min-h-12 w-full sm:min-h-6" />
                      <div className="min-h-10 sm:min-h-5" />
                      <div className="mt-1 min-h-12 sm:min-h-8" />
                    </div>
                  ) : (
                    <div className="text-sm text-faint">—</div>
                  )}
                </div>
                <div className={`col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:max-w-72 ${m || waiting ? 'min-h-14' : ''}`}>
                {m ? (
                  <a
                    href={display?.cheapest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap flex min-w-32 flex-1 flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <span className="font-semibold tabular-nums text-accent">
                      {qty > 1 && <span className="font-normal text-muted">{qty} × </span>}
                      {formatPrice(display!.cheapest.price, lang)}
                    </span>
                    <SourceBadge source={display!.cheapest.source} />
                    <ShipNote m={display!} lang={lang} />
                    <ExternalLink className="h-3.5 w-3.5 text-faint" />
                  </a>
                ) : waiting ? <div className="ui-skeleton h-11 min-w-32 flex-1" /> : null}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(isOpen ? null : line);
                    }}
                    className="tap rounded-lg px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
                  >
                    {t(m || waiting ? S.change : S.choose)}
                  </button>
                  {(m || waiting) && (
                    <button
                      type="button"
                      onClick={() => pick(line, undefined)}
                      title={t(S.remove)}
                      className="tap-square grid place-items-center rounded-lg p-1.5 text-muted edge hover:bg-hover hover:text-fg dark:ring-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                </div>
              </div>

              {m ? <ShopChoice key={m.key} state={state} line={line} model={m} lang={lang} /> : waiting ? <div className="h-11" /> : null}
              {line === 'storage' && m && (m.cheapest as StorageListing).media === 'HDD' && <p className="notice-warn p-2 text-sm">{t(B.hddSystem)}</p>}
              {slot === 'fan' && m && !isOpen && (
                <div className="mt-2">
                  <FanQty state={state} lang={lang} />
                </div>
              )}
              {isOpen && <BottomSheet open title={line === 'storage2' ? t(B.storage2) : t(cfg.tab)} onClose={() => setOpen(null)}>
                {slot === 'fan' && <FanPlanPanel state={state} lang={lang} />}
                <Picker state={state} slot={slot} line={line} lang={lang} onPicked={() => setOpen(null)} />
              </BottomSheet>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
