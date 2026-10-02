// The builder's summary: total, budget, power, compatibility status, notes (and the chosen parts in
// guided mode). Wide screens: a sticky card beside the steps. Phones and tablets (< lg): a bar fixed
// to the bottom of the screen with the total (and Back / Next in guided mode); the details open from it.

import { useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronUp, Info } from 'lucide-react';
import { formatPrice } from '../../lib/data';
import { STEP_SHORT } from '../../lib/wizard';
import { SLOTS, buildNotes, buildStatus, requiredWatts, type Slot } from '../../lib/builder';
import type { AnyModel, BuilderState } from '../../lib/builderState';
import { tr, useLang, type Text } from '../../lib/i18n';

const S = {
  total: { el: 'Σύνολο', en: 'Total' },
  parts: { el: 'εξαρτήματα', en: 'parts' },
  psuNeeded: { el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' },
  clear: { el: 'Καθαρισμός', en: 'Clear build' },
  summary: { el: 'Η σύνθεσή σας', en: 'Your build' },
  details: { el: 'Λεπτομέρειες', en: 'Details' },
  priceNote: {
    el: 'Χαμηλότερη τιμή ανά προϊόν, χωρίς μεταφορικά· κάθε εξάρτημα μπορεί να είναι από διαφορετικό κατάστημα.',
    en: 'Lowest price per product, before shipping; each part may come from a different shop.',
  },
  budget: { el: 'Προϋπολογισμός', en: 'Budget' },
  left: { el: 'απομένουν', en: 'left' },
  over: { el: 'υπέρβαση', en: 'over' },
  allFit: { el: 'Όλα ταιριάζουν', en: 'Everything fits' },
  fits: { el: 'χωράνε', en: 'fit' },
  likely: { el: 'πιθανότατα', en: 'likely' },
  unverified: { el: 'χωρίς επιβεβαίωση', en: 'not verified' },
  clash: { el: 'ασύμβατα', en: 'incompatible' },
  shared: {
    el: 'Βλέπετε μια σύνθεση από σύνδεσμο. Η δική σας αποθηκευμένη σύνθεση μένει ως έχει μέχρι να αλλάξετε κάτι εδώ.',
    en: "You're viewing a build from a link. Your own saved build stays as it is until you change something here.",
  },
} satisfies Record<string, Text>;

interface Props {
  state: BuilderState;
  /** Guided mode: the chosen parts, each a button to its step. */
  onSlot?: (slot: Slot) => void;
  /** Guided mode on phones: Back / Next beside the total in the bottom bar. */
  back?: ReactNode;
  next?: ReactNode;
}

export default function Summary({ state, onSlot, back, next }: Props) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const [open, setOpen] = useState(false);
  const { build, ctx, prefs, update, shared } = state;

  const chosen = SLOTS.filter((s) => build[s]).map((s) => build[s] as AnyModel);
  const total = chosen.reduce((sum, m) => sum + m.cheapest.price, 0);
  const watts = requiredWatts(build);
  const tdp = build.cpu?.cheapest.tdp;
  const notes = buildNotes(build, ctx);
  const errors = notes.filter((n) => n.level === 'error').length;
  const status = buildStatus(build, ctx);
  const checked = status.fits + status.likely + status.unverified + status.no;
  const left = prefs.budget != null ? prefs.budget - total : null;

  const statusLine =
    checked === 0 ? null : (
      <div className="flex items-start gap-2 text-sm">
        {status.no || status.unverified ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
        )}
        <span>
          {status.likely + status.unverified + status.no === 0
            ? t(S.allFit)
            : (
                [
                  [status.fits, S.fits],
                  [status.likely, S.likely],
                  [status.unverified, S.unverified],
                  [status.no, S.clash],
                ] as const
              )
                .filter(([n]) => n > 0)
                .map(([n, label]) => `${n} ${t(label)}`)
                .join(' · ')}
        </span>
      </div>
    );

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-2xl bg-panel px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgb(0_0_0/0.12)] ring-1 ring-edge lg:card lg:sticky lg:top-4 lg:inset-auto lg:z-auto lg:p-4">
      <div className="flex items-center gap-2 lg:hidden">
        {back}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="tap flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted">
              {t(S.total)} · {chosen.length} {t(S.parts)}
            </span>
            <span className="text-xl font-semibold tabular-nums text-accent">{formatPrice(total, lang)}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-sm text-muted">
            {errors > 0 && (
              <span className="flex items-center gap-1 text-fg">
                <AlertTriangle className="h-4 w-4 text-warn" /> {errors}
              </span>
            )}
            <span className={next ? 'sr-only' : undefined}>{t(S.details)}</span>
            <ChevronUp className={`h-4 w-4 transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
          </span>
        </button>
        {next}
      </div>
      <div
        className={`${open ? 'flex' : 'hidden'} max-h-[60vh] flex-col gap-3 overflow-y-auto border-t border-line pt-3 lg:flex lg:max-h-none lg:overflow-visible lg:border-0 lg:pt-0`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t(S.summary)}</span>
          {chosen.length > 0 && (
            <button type="button" onClick={() => update({})} className="tap text-sm text-muted hover:text-fg">
              {t(S.clear)}
            </button>
          )}
        </div>
        {shared && <div className="notice-warn p-2.5 text-xs">{t(S.shared)}</div>}
        <div>
          <div className="hidden text-xs text-muted lg:block">
            {t(S.total)} · {chosen.length} {t(S.parts)}
          </div>
          <div className="hidden text-3xl font-semibold tabular-nums text-accent lg:block">{formatPrice(total, lang)}</div>
          <div className="mt-1 text-xs text-faint">{t(S.priceNote)}</div>
        </div>
        {left != null && prefs.budget != null && (
          <div className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">
                {t(S.budget)} {formatPrice(prefs.budget, lang)}
              </span>
              <span className={left < 0 ? 'font-semibold text-up' : 'text-muted'}>
                {t(left < 0 ? S.over : S.left)} {formatPrice(Math.abs(left), lang)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-line" aria-hidden="true">
              <div
                className={`h-full rounded-full ${left < 0 ? 'bg-up' : 'bg-accent'}`}
                style={{ width: `${Math.min(100, (100 * total) / prefs.budget)}%` }}
              />
            </div>
          </div>
        )}
        {(watts != null || tdp) && (
          <div className="text-sm">
            {watts != null && (
              <>
                <span className="text-muted">{t(S.psuNeeded)}: </span>
                <span className="font-semibold">≥ {watts} W</span>
              </>
            )}
            {tdp ? <span className="text-muted">{watts != null ? ' · ' : ''}CPU TDP {tdp} W</span> : null}
          </div>
        )}
        {statusLine}
        {onSlot && (
          <ul className="flex flex-col border-t border-line pt-2 text-sm">
            {SLOTS.map((s) => {
              const m = build[s] as AnyModel | undefined;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSlot(s)}
                    className="tap flex w-full items-baseline gap-2 rounded py-1 text-left hover:text-fg"
                  >
                    <span className="w-24 shrink-0 truncate text-xs text-muted">{t(STEP_SHORT[s])}</span>
                    <span className={`line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere] ${m ? 'font-medium' : 'text-faint'}`}>
                      {m ? m.chip : '—'}
                    </span>
                    {m && <span className="shrink-0 tabular-nums text-muted">{formatPrice(m.cheapest.price, lang)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
          {notes.map((n, i) => (
            <li key={i} className={`flex gap-2 ${n.level === 'error' ? 'text-fg' : 'text-muted'}`}>
              {n.level === 'error' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              )}
              <span>{t(n.text)}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
