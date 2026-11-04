// One Review for both modes (step 5 task 13): every line with photo, the product name and the variant used (the
// chosen listing's title), price, shop (a 44 px link, #25) and label naming the other part (#19); a chosen shop offer
// that is loading or gone says so and the line shows the price used (Review Focus 5); missing lines open their step;
// the total = the sum of the shown prices, with the prices' date; parts no longer sold are named (finding #22); the
// engine's messages in three groups with their fix and the "not checked yet" line (M1); the BIOS note (rule 13);
// the power estimate per part and the recommended PSU; then Copy list and the share link.

import type { ReactNode } from 'react';
import { AlertTriangle, ExternalLink, Info, XCircle } from 'lucide-react';
import type { Category } from '../../types';
import type { Finding } from '../../engine';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice } from '../../lib/format';
import { SLOTS, type Slot } from '../../lib/builderData';
import type { Line } from '../../lib/buildStore';
import { isAdvice, notCheckedYet, optionalSlot, shownFindings } from '../../lib/builderEngine';
import { ratingOf } from '../../lib/fitLabel';
import { lineNotice, lineTitle, ownTitle, shopName } from '../../lib/copyList';
import type { BuilderState } from '../../lib/builderState';
import { STEP_NAME } from '../../lib/wizard';
import { tr, type Lang, type Text } from '../../lib/i18n';
import { UI } from '../../ui/strings';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { FitBadge, partImage } from './parts';
import PowerBreakdown from './PowerBreakdown';
import CopyList from './CopyList';
import { BUILDER as B, fill } from '../../ui/builderStrings';

const LINES: Line[] = SLOTS.flatMap((s): Line[] => (s === 'storage' ? ['storage', 'storage2'] : [s]));
const slotOf = (l: Line): Slot => (l === 'storage2' ? 'storage' : l);

export default function Review({ state, lang, onGo, compact = false }: { state: BuilderState; lang: Lang; onGo: (s: Slot) => void; compact?: boolean }) {
  const t = (x: Text) => tr(lang, x);
  const { builtAt } = state;
  const findings = state.findings ?? [];
  // Extra shop data follows the first screen, or a user's interaction (owned by useBuilderState).
  const date = builtAt ? new Date(builtAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB') : null;
  const name = (l: Line) => t(l === 'storage2' ? B.storage2 : STEP_NAME[l]);

  // Messages: rule 13 has its own BIOS line; advice (rules 26–30) is a note whatever its level.
  const shown = shownFindings(findings).filter((f) => f.rule !== 13);
  const groups: { title: Text; items: Finding[]; icon: ReactNode; kind: string }[] = [
    { kind: 'errors', title: B.errors, items: shown.filter((f) => f.status === 'error' && !isAdvice(f)), icon: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-up" aria-hidden="true" /> },
    { kind: 'warnings', title: B.warnings, items: shown.filter((f) => f.status === 'warning' && !isAdvice(f)), icon: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" /> },
    { kind: 'notes', title: B.notes, items: shown.filter((f) => (f.status !== 'error' && f.status !== 'warning') || isAdvice(f)), icon: <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden="true" /> },
  ];
  const notChecked = notCheckedYet(findings);
  const bios = findings.find((f) => f.rule === 13);

  return (
    <div className="flex flex-col gap-4">
      {state.gone.length > 0 && (
        <ul className="notice-warn flex flex-col gap-1 p-3 text-sm" data-gone>
          {state.gone.map((g) => (
            <li key={g.line}>{fill(t(B.gone), { name: g.name ?? g.key, step: name(g.line) })}</li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-line rounded-xl ring-1 ring-edge">
        {LINES.map((line) => {
          const slot = slotOf(line);
          const r = state.resolvedLines.find((x) => x.line === line);
          // The second drive is listed only when there is one.
          if (line === 'storage2' && !r) return null;
          const Icon = CATEGORIES[slot as Category].icon;
          const opt = optionalSlot(slot, state.optFindings);
          const variant = r && (!r.requestedOffer || r.status === 'chosen') && ownTitle(r.offer.title);
          const notice = r && lineNotice(r);
          return (
            <li key={line} className="flex flex-wrap items-center gap-3 p-3" data-review-line={line}>
              {r ? (
                <ProductPhoto image={partImage(r.model)} size="md" icon={Icon} alt="" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-[9rem] flex-1">
                <div className="text-xs text-muted">{name(line)}</div>
                {r ? (
                  <>
                    <div className="font-medium [overflow-wrap:anywhere]">
                      {r.quantity > 1 && <span className="font-normal text-muted">{r.quantity} × </span>}
                      {/* A PSU: maker + model and the picker card's specs, as in the part list and Copy list. */}
                      {r.line === 'psu' ? lineTitle(r, lang) : r.model.chip}
                    </div>
                    {variant && variant.toLowerCase() !== r.model.chip.toLowerCase() && (
                      <div className="text-xs text-muted [overflow-wrap:anywhere]" data-variant>
                        {variant}
                      </div>
                    )}
                    <div className="mt-1 min-h-6">
                      <FitBadge rating={ratingOf(findings, line === 'storage2' ? `${r.model.key}#2` : r.model.key, state.parts)} lang={lang} />
                    </div>
                    {notice && (
                      <p className="mt-1 text-xs font-medium text-warn" data-offer-notice={r.status}>
                        {t(notice)}
                        {r.status === 'failed' && (
                          <button type="button" onClick={() => void state.loadOffers(line, r.model).catch(() => {})} className="tap ml-2 font-medium text-accent hover:underline">
                            {t(UI.retry)}
                          </button>
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <button type="button" onClick={() => onGo(slot)} className="tap text-sm font-medium text-accent hover:underline">
                    {opt.optional ? '—' : t(B.missing)} · {t(B.choose)}
                  </button>
                )}
              </div>
              {r && (!r.requestedOffer || r.status === 'chosen') ? (
                <a
                  href={r.offer.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${formatPrice(r.total, lang)} · ${shopName(r)}`}
                  className="tap flex items-center gap-2 whitespace-nowrap"
                  data-price={r.total}
                >
                  <span className="font-semibold tabular-nums text-accent">{formatPrice(r.total, lang)}</span>
                  <SourceBadge source={r.offer.source} />
                  <ExternalLink className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
                </a>
              ) : r ? (
                <span data-price="0" className="sr-only">0</span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">
          {t(B.total)}
          <span className="text-faint"> · {date ? `${t(B.pricesOf)} ${date} · ` : ''}{t(B.noShipping)}</span>
        </span>
        <span className="text-2xl font-semibold tabular-nums text-accent" data-review-total={state.resolvedTotal}>
          {formatPrice(state.resolvedTotal, lang)}
        </span>
      </div>

      {state.findings && state.resolvedLines.length > 0 && (
        <div className="flex flex-col gap-3" data-messages>
          {groups.every((g) => !g.items.length) && !notChecked && <p className="text-sm text-muted">{t(B.allFit)}</p>}
          {groups.map(
            (g) =>
              (g.items.length > 0 || (g.kind === 'notes' && notChecked)) && (
                <section key={g.kind} aria-label={t(g.title)} data-group={g.kind}>
                  <h3 className="mb-1 text-sm font-semibold">{t(g.title)}</h3>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {g.items.map((f, i) => (
                      <li key={i} className="flex gap-2" data-rule={f.rule} data-status={f.status}>
                        {g.icon}
                        <span>
                          {t(f.message)}
                          {f.fix && <span className="text-muted"> {t(f.fix)}</span>}
                        </span>
                      </li>
                    ))}
                    {g.kind === 'notes' && notChecked && (
                      <li className="flex gap-2 text-muted" data-not-checked>
                        {g.icon}
                        <span>{t(notChecked)}</span>
                      </li>
                    )}
                  </ul>
                </section>
              ),
          )}
          {bios && (
            <section aria-label={t(B.bios)} data-bios>
              <h3 className="mb-1 text-sm font-semibold">{t(B.bios)}</h3>
              <p className="text-sm">
                {t(bios.message)}
                {bios.fix && <span className="text-muted"> {t(bios.fix)}</span>}
              </p>
            </section>
          )}
        </div>
      )}
      {!compact && state.power && state.parts.length > 0 && <PowerBreakdown power={state.power} watts={state.psuWatts} lang={lang} />}
      {!compact && <CopyList state={state} lang={lang} date={date} />}
    </div>
  );
}
