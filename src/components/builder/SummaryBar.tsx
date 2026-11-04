// The builder's summary bar: total (fans × their quantity, the second drive; parts whose price hasn't loaded are named,
// never counted as 0), budget bar, recommended PSU, status (missing parts first, then errors and warnings), notes (and
// the chosen parts in guided mode). Wide screens: a sticky card beside the steps. Phones and tablets (< lg): a bar fixed
// to the bottom of the screen with the total (and Back / Next in guided mode); the details open from it.

import { useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronUp, Info } from 'lucide-react';
import { formatPrice } from '../../lib/data';
import { formatWhole } from '../../lib/format';
import { STEP_SHORT } from '../../lib/wizard';
import { SLOTS, type Slot } from '../../lib/builderData';
import { ENGINE_TEXT, MISSING, buildStatus, isAdvice, missingSlots, notCheckedYet, shownFindings } from '../../lib/builderEngine';
import type { AnyModel, BuilderState } from '../../lib/builderState';
import { T, plural, tr, useLang, type Forms, type Text } from '../../lib/i18n';
import { BUILDER as B, fill } from '../../ui/builderStrings';
import { lineNotice } from '../../lib/copyList';

const S = {
  total: { el: 'Σύνολο', en: 'Total' },
  psuNeeded: { el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' },
  clear: { el: 'Καθαρισμός', en: 'Clear build' },
  summary: { el: 'Η σύνθεσή σου', en: 'Your build' },
  details: { el: 'Λεπτομέρειες', en: 'Details' },
  priceNote: {
    el: 'Επιλεγμένη προσφορά ανά προϊόν· το σύνολο δεν περιλαμβάνει μεταφορικά. Τα γνωστά μεταφορικά εμφανίζονται ανά προϊόν.',
    en: 'Selected offer per product; total excludes shipping. Known shipping is shown per product.',
  },
  budget: { el: 'Προϋπολογισμός', en: 'Budget' },
  allFit: { el: 'Όλα ταιριάζουν', en: 'Everything fits' },
  missing: { el: 'Λείπουν', en: 'Missing' },
  shared: {
    el: 'Βλέπεις μια σύνθεση από σύνδεσμο. Η δική σου αποθηκευμένη σύνθεση μένει ως έχει μέχρι να αλλάξεις κάτι εδώ.',
    en: "You're viewing a build from a link. Your own saved build stays as it is until you change something here.",
  },
} satisfies Record<string, Text>;

/** Counts in the summary, with the right singular/plural form (UX-47: no more "1 ασύμβατα"). */
const N = {
  parts: { el: ['εξάρτημα', 'εξαρτήματα'], en: ['part', 'parts'] },
  fits: { el: ['χωράει', 'χωράνε'], en: ['fits', 'fit'] },
  likely: { el: ['πιθανότατα', 'πιθανότατα'], en: ['likely', 'likely'] },
  unverified: { el: ['χωρίς επιβεβαίωση', 'χωρίς επιβεβαίωση'], en: ['not verified', 'not verified'] },
  check: { el: ['προς έλεγχο', 'προς έλεγχο'], en: ['to check', 'to check'] },
  clash: { el: ['ασύμβατο', 'ασύμβατα'], en: ['incompatible', 'incompatible'] },
} satisfies Record<string, Forms>;

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
  const { build, prefs, shared } = state;

  const chosen = [...SLOTS.filter((s) => build[s]).map((s) => build[s] as AnyModel), ...(state.storage2 ? [state.storage2] : [])];
  const total = state.resolvedTotal;
  // Saved parts whose step file hasn't arrived or failed (Review Focus 3): named, not counted as 0.
  const waiting = [...state.pending.map((s) => t(STEP_SHORT[s])), ...(state.pendingStorage2 ? [t(B.storage2)] : [])];
  const notLoaded = waiting.length > 0 && fill(t(B.notLoaded), { parts: waiting.join(', ') });
  const checking = waiting.length > 0 || (state.findings === null && !state.engineFailed);
  // Fits, warnings and the recommended PSU come from the v2 engine (step 5 task 9); none while its chunk loads.
  const findings = state.findings ?? [];
  const watts = state.psuWatts;
  const tdp = build.cpu?.cheapest.tdp;
  // A saved part whose file is loading or failed is named as not loaded (below), not as missing.
  const missing = missingSlots(build, state.optFindings).filter((s) => !state.pending.includes(s));
  const status = buildStatus(state.findings, missing);
  const { counts } = status;
  const shownNotes = shownFindings(findings);
  const notChecked = notCheckedYet(findings);
  const errors = missing.length + findings.filter((f) => f.status === 'error' && !isAdvice(f)).length;
  const left = prefs.budget != null ? prefs.budget - total : null;
  const countLine = (
    [
      [counts.fits, N.fits],
      [counts.likely, N.likely],
      [counts.unverified, N.unverified],
      [counts.check, N.check],
      [counts.no, N.clash],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, forms]) => plural(lang, n, forms))
    .join(' · ');

  // C8: an unfinished build says what is missing (neutral), never "everything fits".
  const statusLine = (
    <div className="flex items-start gap-2 text-sm">
      {status.kind === 'error' || status.kind === 'warning' ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
      ) : status.kind === 'ok' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
      )}
      <span>
        {status.kind === 'missing' && (
          <>
            {t(S.missing)}: {missing.map((s) => t(STEP_SHORT[s])).join(', ')}
            {(countLine || state.findings === null) && ' · '}
          </>
        )}
        {/* No findings yet: checking, or the engine failed to load (never "everything fits"). */}
        {state.findings === null
          ? t(state.engineFailed ? ENGINE_TEXT.unavailable : ENGINE_TEXT.checking)
          : status.kind === 'ok' && counts.likely + counts.unverified + counts.check + counts.no === 0
            ? t(S.allFit)
            : countLine}
      </span>
    </div>
  );

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-2xl bg-panel px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgb(0_0_0/0.12)] ring-1 ring-edge lg:card lg:sticky lg:top-4 lg:inset-auto lg:z-auto lg:p-4">
      {/* Keep the desktop summary still while restored parts/checks arrive. Intermediate
          missing/fit findings are not a verdict on the whole saved build. Clear stays usable. */}
      {checking && (
        <div className="hidden lg:absolute lg:inset-x-4 lg:top-4 lg:flex lg:flex-col lg:gap-3" role="status" aria-label={t(T.loading)}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{t(S.summary)}</span>
            <button type="button" onClick={state.clear} className="tap text-sm text-muted hover:text-fg">{t(S.clear)}</button>
          </div>
          <div className="min-h-28 text-sm text-muted" data-not-loaded={notLoaded ? true : undefined}>{notLoaded || t(T.loading)}</div>
          <div className="ui-skeleton h-8 w-40" />
          <div className="ui-skeleton h-5 w-full" />
        </div>
      )}
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
              {t(S.total)} · {plural(lang, chosen.length, N.parts)}
            </span>
            <span className="text-xl font-semibold tabular-nums text-accent">
              {formatPrice(total, lang)}
              {notLoaded && ' + …'}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-sm text-muted">
              <span className={`flex min-w-9 items-center gap-1 text-fg ${errors > 0 ? '' : 'invisible'}`} aria-hidden={errors === 0}>
                <AlertTriangle className="h-4 w-4 text-warn" /> {errors}
              </span>
            <span className={next ? 'sr-only' : undefined}>{t(S.details)}</span>
            <ChevronUp className={`h-4 w-4 transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
          </span>
        </button>
        {next}
      </div>
      <div
        className={`${open ? 'flex' : 'hidden'} ${checking ? 'lg:invisible' : ''} max-h-[60vh] flex-col gap-3 overflow-y-auto border-t border-line pt-3 lg:flex lg:max-h-none lg:overflow-visible lg:border-0 lg:pt-0`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t(S.summary)}</span>
          {(chosen.length > 0 || waiting.length > 0) && (
            <button type="button" onClick={state.clear} className="tap text-sm text-muted hover:text-fg">
              {t(S.clear)}
            </button>
          )}
        </div>
        {shared && <div className="notice-warn p-2.5 text-xs">{t(S.shared)}</div>}
        <div>
          <div className="hidden text-xs text-muted lg:block">
            {t(S.total)} · {plural(lang, chosen.length, N.parts)}
          </div>
          <div className="hidden text-3xl font-semibold tabular-nums text-accent lg:block">
            {formatPrice(total, lang)}
            {notLoaded && ' + …'}
          </div>
          {notLoaded && (
            <div className="mt-1 text-sm font-medium text-warn" data-not-loaded>
              {notLoaded}
            </div>
          )}
          <div className="mt-1 text-xs text-faint">{t(S.priceNote)}</div>
        </div>
        {left != null && prefs.budget != null && (
          <div className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">
                {t(S.budget)} {formatWhole(prefs.budget, lang)}
              </span>
              <span className={left < 0 ? 'font-semibold text-up' : 'text-muted'}>
                {fill(t(left < 0 ? B.over : B.left), { x: formatPrice(Math.abs(left), lang) })}
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
              const resolved = state.resolvedLines.find((r) => r.line === s);
              const notice = resolved && lineNotice(resolved);
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSlot(s)}
                    className="tap flex w-full items-baseline gap-2 rounded py-1 text-left hover:text-fg"
                  >
                    <span className="w-24 shrink-0 truncate text-xs text-muted">{t(STEP_SHORT[s])}</span>
                    <span className={`line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere] ${m ? 'font-medium' : 'text-faint'}`}>
                      {resolved?.displayModel?.chip ?? (m ? m.chip : '—')}
                    </span>
                    {resolved?.displayModel && <span className="shrink-0 tabular-nums text-muted">{formatPrice(resolved.total, lang)}</span>}
                  </button>
                  {notice && <p className="text-xs text-muted" data-offer-notice={resolved?.status}>{t(notice)}</p>}
                </li>
              );
            })}
          </ul>
        )}
        <ul className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
          {/* A saved or shared part the data no longer has: named, never dropped silently (finding #22). */}
          {state.gone.map((g) => (
            <li key={`gone-${g.line}`} className="flex gap-2 text-fg" data-gone-part={g.line}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <span>{fill(t(B.gone), { name: g.name ?? g.key, step: t(g.line === 'storage2' ? B.storage2 : STEP_SHORT[g.line]) })}</span>
            </li>
          ))}
          {missing.map((s) => (
            <li key={s} className="flex gap-2 text-fg">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              <span>{t(MISSING[s])}</span>
            </li>
          ))}
          {shownNotes.map((f, i) => {
            // Rules 26–30 are advice: information whatever their level.
            const serious = (f.status === 'error' || f.status === 'warning') && !isAdvice(f);
            return (
              <li key={i} className={`flex gap-2 ${serious ? 'text-fg' : 'text-muted'}`}>
                {serious ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />}
                <span>
                  {t(f.message)}
                  {f.fix && <> {t(f.fix)}</>}
                </span>
              </li>
            );
          })}
          {notChecked && (
            <li className="flex gap-2 text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              <span>{t(notChecked)}</span>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
