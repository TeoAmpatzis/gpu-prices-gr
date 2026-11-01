// The builder's guided walk (step 5 task 11): one step at a time over the same list as the part list, a compact header
// "Βήμα 2/9 · Μητρική" with ‹ › and the step list on tap (C9), one line of guide text with "More" (C10), the step's
// picker (task 12 replaces it), fans as a section of the case step, the summary (Back / Next in its phone bar).

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Search } from 'lucide-react';
import type { AutoFile, BaseListing, CaseListing, Category, FanListing } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice, saleOf, type Model } from '../../lib/data';
import { candidates, type Slot } from '../../lib/builderData';
import { MAX_FAN_QTY } from '../../lib/buildStore';
import { ENGINE_TEXT, optionalSlot } from '../../lib/builderEngine';
import { fanPlan } from '../../lib/fanPlan';
import { ratingOf, stepReason, LABEL_TEXT, type Rating } from '../../lib/fitLabel';
import { builderParams, useStepVerdicts, writeBuilderParams, type AnyModel, type BuilderState } from '../../lib/builderState';
import { pickerOrder, loadAuto } from '../../lib/recommend';
import { toUseKey } from '../../lib/useMinimums';
import { afterLargestPaint } from '../../lib/paint';
import { GUIDE_INDEX, SORTS, STEPS, STEP_NAME, isDone, remaining, sorter, stepOf, type SortBy, type StepId } from '../../lib/wizard';
import { T, tr, useLang, type Lang, type Text } from '../../lib/i18n';
import { GUIDE_STEPS } from '../BuildGuide';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { CaseFansLine, FanAdviceBox } from './FanAdvice';
import Review from './Review';
import Summary from './SummaryBar';
import { FitBadge, ShipNote, partImage, specLine } from './parts';
import { plural } from '../../ui/strings';
import { ErrorState } from '../../ui/states';
import { BUILDER as B, fill } from '../../ui/builderStrings';

const PAGE = 24; // cards per "Show more"

/** "1 ασύμβατο κρυμμένο" / "3 ασύμβατα κρυμμένα" (UX-47). */
const HIDDEN = { el: ['ασύμβατο κρυμμένο', 'ασύμβατα κρυμμένα'] as [string, string], en: ['incompatible hidden', 'incompatible hidden'] as [string, string] };

const G = {
  back: { el: 'Πίσω', en: 'Back' },
  next: { el: 'Επόμενο', en: 'Next' },
  skip: { el: 'Παράλειψη', en: 'Skip' },
  optional: { el: 'προαιρετικό', en: 'optional' },
  choose: { el: 'Επιλογή', en: 'Choose' },
  chosen: { el: 'Επιλέχθηκε', en: 'Chosen' },
  remove: { el: 'Αφαίρεση', en: 'Remove' },
  sort: { el: 'Ταξινόμηση', en: 'Sort' },
  onlyCompatible: { el: 'Μόνο συμβατά', en: 'Only compatible' },
  verifiedOnly: { el: 'Μόνο επιβεβαιωμένα', en: 'Verified only' },
  withinBudget: { el: 'Εντός προϋπολογισμού', en: 'Within budget' },
  shown: { el: 'εμφανίζονται', en: 'shown' },
  airflowType: { el: 'Ροής αέρα', en: 'Airflow' },
  pressureType: { el: 'Στατικής πίεσης', en: 'Static pressure' },
  showMore: { el: 'Περισσότερα', en: 'Show more' },
  none: { el: 'Κανένα προϊόν με αυτά τα φίλτρα.', en: 'No parts match these filters.' },
} satisfies Record<string, Text>;

/** Chip toggle, the same look as the category filters' chips. */
function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`tap inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset transition ${
        on
          ? 'bg-accent/10 text-accent ring-accent dark:ring-accent/30'
          : 'text-muted ring-line-strong hover:bg-hover hover:text-fg hover:ring-muted dark:hover:ring-line-strong'
      }`}
    >
      {on && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function initialStep(): StepId {
  const p = builderParams();
  // A shared build opens on its review.
  return stepOf(p.get('step')) ?? (STEPS.some((s) => s !== 'review' && p.has(s)) ? 'review' : 'cpu');
}

/** The automatic build's file once a budget is set (the Recommended order's step targets); null meanwhile or on failure. */
function useAuto(builtAt: string | null, budget: number | null): AutoFile | null {
  const [auto, setAuto] = useState<AutoFile | null>(null);
  useEffect(() => {
    if (!builtAt || budget == null) return;
    let live = true;
    loadAuto(builtAt).then(
      (a) => {
        if (live) setAuto(a);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [builtAt, budget]);
  return auto;
}

export default function GuidedWalk({ state, header }: { state: BuilderState; header: ReactNode }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const { build } = state;
  const [step, setStep] = useState<StepId>(initialStep);
  const [list, setList] = useState(false);
  const [more, setMore] = useState(false);
  const auto = useAuto(state.builtAt, state.prefs.budget);
  const index = STEPS.indexOf(step);
  const opt: { optional: boolean; why?: Text } = step === 'review' ? { optional: false } : optionalSlot(step, state.optFindings);

  const go = (s: StepId) => {
    setStep(s);
    setList(false);
    setMore(false);
    writeBuilderParams((p) => p.set('step', s));
    // Back to the top of the step when it starts above the screen.
    const el = document.getElementById('builder-step-top');
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  };
  const back = index > 0 ? () => go(STEPS[index - 1]) : undefined;
  const next = index < STEPS.length - 1 ? () => go(STEPS[index + 1]) : undefined;
  const isSlot = step !== 'review';
  const canSkip = isSlot && opt.optional && !build[step as Slot];
  const guide = GUIDE_INDEX[step] != null ? GUIDE_STEPS[GUIDE_INDEX[step]!].body : null;

  const navButton = (dir: 'back' | 'next', phone: boolean) => {
    const fn = dir === 'back' ? back : next;
    if (!fn) return phone ? <span className="w-11 shrink-0" /> : null;
    const Icon = dir === 'back' ? ChevronLeft : ChevronRight;
    const label = t(dir === 'back' ? G.back : canSkip ? G.skip : G.next);
    return phone ? (
      <button
        type="button"
        onClick={fn}
        aria-label={label}
        className={`tap-square grid shrink-0 place-items-center rounded-lg ${dir === 'next' ? 'bg-accent text-panel' : 'text-muted edge hover:bg-hover hover:text-fg dark:ring-0'}`}
      >
        <Icon className="h-5 w-5" />
      </button>
    ) : null;
  };
  const arrow = (dir: 'back' | 'next') => {
    const fn = dir === 'back' ? back : next;
    const Icon = dir === 'back' ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={fn}
        disabled={!fn}
        aria-label={t(dir === 'back' ? B.prevStep : B.nextStep)}
        className="tap-square grid shrink-0 place-items-center rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg disabled:invisible"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  };

  return (
    <>
      <div id="builder-step-top" className="flex min-w-0 scroll-mt-4 flex-col gap-3">
        {header}
        <section className="card flex flex-col gap-3 p-3 sm:p-4" aria-labelledby="step-title">
          <div>
            {/* "Βήμα 2/9 · Μητρική" with ‹ ›; a tap on the name opens the step list (C9). */}
            <div className="flex items-center gap-1">
              {arrow('back')}
              <h2 id="step-title" className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-expanded={list}
                  aria-controls="step-list"
                  onClick={() => setList((v) => !v)}
                  className="tap flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-base font-semibold tracking-tight hover:bg-hover sm:text-lg"
                >
                  <span className="truncate">
                    {fill(t(B.stepOf), { n: index + 1, total: STEPS.length })} · {t(STEP_NAME[step])}
                    {opt.optional && <span className="text-sm font-normal text-faint"> · {t(G.optional)}</span>}
                  </span>
                  <ChevronDown className={`hidden h-4 w-4 shrink-0 text-muted sm:block transition-transform duration-150 ${list ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </h2>
              {arrow('next')}
            </div>
            {list && (
              <ol id="step-list" aria-label={t(B.steps)} className="mt-2 grid gap-1 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => go(s)}
                      aria-current={s === step ? 'step' : undefined}
                      className={`tap flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${s === step ? 'bg-accent/10 font-semibold' : 'text-muted hover:bg-hover hover:text-fg'}`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          isDone(s, build) ? 'bg-accent text-panel' : 'bg-sunken text-muted ring-1 ring-inset ring-line-strong'
                        }`}
                      >
                        {isDone(s, build) ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                      </span>
                      {t(STEP_NAME[s])}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {/* One line of the buying guide, the rest behind "More" (C10). */}
            {guide && (
              <div className="mt-1 flex items-start gap-2 text-sm text-muted">
                <p className={`min-w-0 flex-1 ${more ? '' : 'truncate'}`}>{t(guide)}</p>
                <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="tap shrink-0 font-medium text-accent hover:underline">
                  {t(more ? B.less : B.more)}
                </button>
              </div>
            )}
            {opt.why && <p className="mt-1 text-sm font-medium">{t(opt.why)}</p>}
          </div>

          {step === 'review' ? (
            <Review state={state} lang={lang} onGo={(s) => go(stepOf(s) ?? 'cpu')} />
          ) : (
            <PartStep key={step} slot={step} state={state} auto={auto} lang={lang} />
          )}
          {step === 'case' && state.slotReady('case') && <FansSection state={state} auto={auto} lang={lang} />}

          <div className="flex items-center gap-2 border-t border-line pt-3">
            {back && (
              <button type="button" onClick={back} className="tap inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted edge hover:bg-hover hover:text-fg dark:ring-0">
                <ChevronLeft className="h-4 w-4" /> {t(G.back)}
              </button>
            )}
            {next && (
              <button
                type="button"
                onClick={next}
                className="tap ml-auto inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-panel hover:bg-accent/90"
              >
                {t(canSkip ? G.skip : G.next)} <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </div>
      <Summary state={state} onSlot={(s) => go(stepOf(s) ?? 'cpu')} back={navButton('back', true)} next={navButton('next', true)} />
    </>
  );
}

/** "Ανεμιστήρες κουτιού (προαιρετικό)": the fan plan, the fans' picker and their quantity, inside the case step. */
function FansSection({ state, auto, lang }: { state: BuilderState; auto: AutoFile | null; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  // The fans' file after the case cards are painted (the step's largest paint; review I1). The case step's tall loading
  // area keeps this section below the screen until then.
  const [ready, setReady] = useState(false);
  useEffect(() => afterLargestPaint(() => setReady(true), 3000), []);
  return (
    <section aria-labelledby="fans-title" className="flex flex-col gap-3 border-t border-line pt-3">
      <h3 id="fans-title" className="text-base font-semibold">
        {t(B.fansSection)}
      </h3>
      <FanAdviceBox build={state.build} watts={state.psuWatts} step="fan" lang={lang} />
      {state.build.fan && <FanQty state={state} lang={lang} />}
      {ready && <PartStep slot="fan" state={state} auto={auto} lang={lang} />}
    </section>
  );
}

/** The chosen fan product's quantity in packs (1–12). */
export function FanQty({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const { fanQty, setFanQty } = state;
  const btn = 'tap-square grid place-items-center rounded-lg p-1.5 text-muted edge hover:bg-hover hover:text-fg disabled:opacity-40 dark:ring-0';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t(B.quantity)}</span>
      <button type="button" aria-label={t(B.fewer)} disabled={fanQty <= 1} onClick={() => setFanQty(fanQty - 1)} className={btn}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
        {fanQty}
      </span>
      <button type="button" aria-label={t(B.morePacks)} disabled={fanQty >= MAX_FAN_QTY} onClick={() => setFanQty(fanQty + 1)} className={btn}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** A part of the step with the engine's label, and whether "Only compatible" hides it (pickHide: a real "no"). */
type Rated = { m: Model<BaseListing>; rating: Rating; hide: boolean };
const NO_RATING: Rating = { fit: null, reasons: [] };

function PartStep({ slot, state, auto, lang }: { slot: Slot; state: BuilderState; auto: AutoFile | null; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const { models, build, update, prefs, extraVersion, wantSlot } = state;
  // Each step's parts are their own file (/data/builder/<slot>.json), fetched when the step opens; then the pick worker
  // checks them against the build (the first answer is waited for, later ones replace the labels when they arrive).
  const { verdicts } = useStepVerdicts(state, slot);
  const failed = state.slotFailed(slot);
  const loading = state.loading || !state.slotReady(slot) || verdicts === null;
  useEffect(() => {
    if (!state.loading) wantSlot(slot);
  }, [slot, state.loading]);
  const cfg = CATEGORIES[slot as Category];
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortBy>('recommended');
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withinBudget, setWithinBudget] = useState(false);
  // Fans step: sizes the chosen case needs (from the fan plan), and the type named in the product.
  const planSizes = useMemo(
    () => (slot === 'fan' && build.case ? [...new Set(fanPlan(build, state.psuWatts).add.map((a) => a.size))] : []),
    [slot, build, state.psuWatts],
  );
  // The plan's sizes until the user picks; a saved build's case arrives after the first render, so a new plan resets.
  const [picked, setPicked] = useState<{ plan: string; sizes: number[] } | null>(null);
  // A saved build arrives with its steps' files, after the first render: follow the plan when it changes.
  const planKey = planSizes.join();
  const sizes = picked?.plan === planKey ? picked.sizes : planSizes;
  const setSizes = (f: (v: number[]) => number[]) => setPicked({ plan: planKey, sizes: f(sizes) });
  const [fanType, setFanType] = useState<'airflow' | 'pressure' | null>(null);

  const rated: Rated[] = useMemo(() => {
    if (!models || !verdicts) return [];
    // A part without a verdict (the check failed) is shown unlabelled, never hidden.
    return (candidates(slot, models[slot] as never) as AnyModel[]).map((m) => {
      const v = verdicts.get(m.key);
      return { m, rating: v ? ratingOf(v.findings, m.key, state.parts) : NO_RATING, hide: v?.hide ?? false };
    });
  }, [models, slot, verdicts, state.parts]);
  // The one "not verified" reason of the step (#14), said above the cards instead of on each.
  const reason = useMemo(() => (verdicts ? stepReason(verdicts) : null), [verdicts]);
  // Recommended: by the use and the budget left (recommend.ts, task 10); Price and Value as before.
  const useKey = toUseKey(prefs.use, prefs.res);
  const order = useMemo(
    () =>
      sort === 'recommended'
        ? pickerOrder(slot, rated, { auto, use: useKey, budget: prefs.budget, build, psuWatts: state.psuWatts })
        : sorter(slot, rated.map((r) => r.m), sort),
    [slot, rated, sort, auto, useKey, prefs.budget, build, state.psuWatts],
  );
  const left = remaining(build, prefs, slot);

  const { shown, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const search = cfg as unknown as { searchText: (l: BaseListing) => string };
    let list = rated.filter((r) => !q || r.m.listings.some((l) => search.searchText(l).toLowerCase().includes(q)));
    const clashes = list.filter((r) => r.hide).length;
    if (onlyCompatible) list = list.filter((r) => !r.hide);
    if (verifiedOnly) list = list.filter((r) => r.rating.fit !== 'unverified');
    if (withinBudget && left != null) list = list.filter((r) => r.m.cheapest.price <= left);
    if (slot === 'fan' && sizes.length) list = list.filter((r) => sizes.includes((r.m as Model<FanListing>).cheapest.size));
    if (slot === 'fan' && fanType) list = list.filter((r) => (r.m as Model<FanListing>).cheapest.fanType === fanType);
    // "Fit not verified" after the verified parts (owner answers 1–4); clashes (shown when "Only compatible" is off)
    // go last, greyed out.
    const rank = (r: Rated) => (r.hide ? 2 : r.rating.fit === 'unverified' ? 1 : 0);
    return { shown: [...list].sort((a, b) => rank(a) - rank(b) || order(a, b)), hidden: clashes };
    // extraVersion: search titles arrive later (/data/builder/<slot>-extra.json).
  }, [rated, order, query, onlyCompatible, verifiedOnly, withinBudget, left, cfg, extraVersion, slot, sizes, fanType]);
  // Back to one page when the filters change.
  const filterKey = JSON.stringify([query, sort, onlyCompatible, verifiedOnly, withinBudget, sizes, fanType]);
  const [paged, setPaged] = useState({ key: filterKey, n: PAGE });
  const limit = paged.key === filterKey ? paged.n : PAGE;

  const chosen = build[slot] as AnyModel | undefined;

  return (
    <div className="flex flex-col gap-3">
      {state.checkerFailed && <p className="notice-warn p-2.5 text-sm">{t(ENGINE_TEXT.checkerFailed)}</p>}
      <div className="flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(cfg.searchPlaceholder)}
            aria-label={t(T.search)}
            className="field w-full text-ellipsis py-2 pl-9 pr-3"
          />
        </label>
        <label className="flex w-36 shrink-0 items-center gap-2 text-sm sm:w-auto">
          <span className="sr-only shrink-0 text-muted sm:not-sr-only">{t(G.sort)}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortBy)} className="field w-full min-w-0 py-2 pl-3 pr-8 sm:w-auto">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto sm:flex-wrap">
        <Chip on={onlyCompatible} onClick={() => setOnlyCompatible((v) => !v)}>
          {t(G.onlyCompatible)}
        </Chip>
        <Chip on={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>
          {t(G.verifiedOnly)}
        </Chip>
        {prefs.budget != null && (
          <Chip on={withinBudget} onClick={() => setWithinBudget((v) => !v)}>
            {t(G.withinBudget)}
          </Chip>
        )}
        {slot === 'fan' &&
          [120, 140].map((s) => (
            <Chip key={s} on={sizes.includes(s)} onClick={() => setSizes((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))}>
              {s} mm
            </Chip>
          ))}
        {slot === 'fan' &&
          (['airflow', 'pressure'] as const).map((k) => (
            <Chip key={k} on={fanType === k} onClick={() => setFanType((v) => (v === k ? null : k))}>
              {t(k === 'airflow' ? G.airflowType : G.pressureType)}
            </Chip>
          ))}
        <span className={`shrink-0 whitespace-nowrap text-sm text-muted ${loading ? 'invisible' : ''}`}>
          {shown.length} {t(G.shown)}
          {onlyCompatible && hidden > 0 && (
            <>
              {' '}
              · {plural(lang, hidden, HIDDEN)}
            </>
          )}
        </span>
      </div>

      {/* Below the toolbar: it arrives with the cards and pushes nothing that is already on screen. */}
      {reason && !loading && (
        <p className="notice-warn p-2.5 text-sm">
          {t(LABEL_TEXT.unverified)}: {t(reason)}
        </p>
      )}
      {failed ? (
        // The step's file failed (Review Focus 3): a retry here; the other steps and the summary keep working.
        <div className="rounded-xl ring-1 ring-inset ring-edge">
          <p className="px-3 pt-3 text-center text-sm font-medium">{t(B.stepFailed)}</p>
          <ErrorState onRetry={() => wantSlot(slot)} />
        </div>
      ) : loading ? (
        // At least a screen tall while the step loads: the cards that replace it never push the Back / Next row
        // below up into view (CLS 0 on /builder?step=…, review I1).
        <div className="flex min-h-screen items-start justify-center gap-2 pt-10 text-sm text-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> {t(T.loading)}
        </div>
      ) : shown.length === 0 ? (
        <div className="p-3 text-sm text-muted">{t(G.none)}</div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.slice(0, limit).map((r) => (
              <PartCard
                key={r.m.key}
                slot={slot}
                m={r.m as AnyModel}
                rating={r.rating}
                hide={r.hide}
                reason={reason}
                chosen={chosen?.key === r.m.key}
                onChoose={() => update({ ...build, [slot]: r.m })}
                onRemove={() => update({ ...build, [slot]: undefined })}
                lang={lang}
              >
                {slot === 'case' && <CaseFansLine c={r.m as Model<CaseListing>} build={build} watts={state.psuWatts} lang={lang} />}
              </PartCard>
            ))}
          </ul>
          {shown.length > limit && (
            <button
              type="button"
              onClick={() => setPaged({ key: filterKey, n: limit + PAGE })}
              className="tap mx-auto rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
            >
              {t(G.showMore)} ({shown.length - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PartCard({
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
}) {
  const t = (x: Text) => tr(lang, x);
  const clash = hide;
  const reasons = rating.reasons.filter((r) => !reason || tr('en', r) !== tr('en', reason));
  const sale = saleOf(m.listings, m.cheapest);
  const Icon = CATEGORIES[slot as Category].icon;
  return (
    <li
      className={`card flex flex-col gap-2 p-3 ${clash ? 'opacity-60' : ''} ${chosen ? 'ring-2 ring-accent dark:ring-accent' : ''}`}
      aria-disabled={clash || undefined}
    >
      <div className="flex gap-3">
        <ProductPhoto image={partImage(m)} size="md" icon={Icon} alt="" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-medium [overflow-wrap:anywhere]">{m.chip}</div>
          <div className="mt-0.5 text-xs text-muted">{specLine(slot, m, lang)}</div>
        </div>
      </div>
      {children}
      {(rating.fit || sale) && (
        <div className="flex flex-wrap items-center gap-2">
          <FitBadge rating={rating} lang={lang} />
          {sale && <span className="badge badge-sale">−{sale.pct}%</span>}
        </div>
      )}
      {rating.fit && rating.fit !== 'fits' && reasons[0] && <p className="line-clamp-3 text-xs text-muted">{reasons.map((r) => t(r)).join(' ')}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <span className="font-semibold tabular-nums">{formatPrice(m.cheapest.price, lang)}</span>
        <SourceBadge source={m.cheapest.source} />
        <ShipNote m={m} lang={lang} />
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
    </li>
  );
}
