// The builder's Guided mode: one step at a time (src/lib/wizard.ts), product cards per step, a
// numbered progress bar and the summary (Back / Next in its phone bar).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  HelpCircle,
  Loader2,
  Palette,
  Search,
} from 'lucide-react';
import type { BaseListing, CaseListing, Category, FanListing } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice, saleOf, type Model } from '../../lib/data';
import { SLOTS, rateAll, type Build, type Rating, type Slot } from '../../lib/builder';
import { fanPlan } from '../../lib/fans';
import { USES, builderParams, writeBuilderParams, type AnyModel, type BuilderState, type Prefs, type Use } from '../../lib/builderState';
import {
  GUIDE_INDEX,
  SORTS,
  STEPS,
  STEP_NAME,
  STEP_SHORT,
  isDone,
  optional,
  remaining,
  shareOf,
  sorter,
  type SortBy,
  type StepId,
} from '../../lib/wizard';
import { T, tr, useLang, type Lang, type Text } from '../../lib/i18n';
import { GUIDE_STEPS } from '../BuildGuide';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { CaseFansLine, FanAdviceBox } from './FanAdvice';
import Review from './Review';
import Summary from './Summary';
import { FitBadge, partImage, specLine } from './parts';
import { plural } from '../../ui/strings';

const PAGE = 24; // cards per "Show more"

/** "1 ασύμβατο κρυμμένο" / "3 ασύμβατα κρυμμένα" (UX-47). */
const HIDDEN = { el: ['ασύμβατο κρυμμένο', 'ασύμβατα κρυμμένα'] as [string, string], en: ['incompatible hidden', 'incompatible hidden'] as [string, string] };

const G = {
  step: { el: 'Βήμα', en: 'Step' },
  of: { el: 'από', en: 'of' },
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
  suggested: { el: 'Πρόταση για αυτό το εξάρτημα', en: 'Suggested for this part' },
  ofBudget: { el: 'του προϋπολογισμού', en: 'of the budget' },
  // Use and budget
  useQ: { el: 'Για τι θα χρησιμοποιηθεί ο υπολογιστής;', en: 'What is the PC for?' },
  budgetQ: { el: 'Προϋπολογισμός (προαιρετικός)', en: 'Budget (optional)' },
  budgetHint: {
    el: 'Δεν κρύβει εξαρτήματα· δείχνει πόσα μένουν και προτεινόμενο ποσό ανά εξάρτημα.',
    en: "It never hides parts; it shows what's left and a suggested amount per part.",
  },
  split: { el: 'Συνήθης κατανομή', en: 'Usual split' },
} satisfies Record<string, Text>;

const USE_INFO: Record<Use, { label: Text; desc: Text; icon: typeof Gamepad2 }> = {
  gaming: {
    label: { el: 'Gaming', en: 'Gaming' },
    desc: { el: 'Η κάρτα γραφικών παίρνει το μεγαλύτερο μέρος.', en: 'The graphics card takes the biggest share.' },
    icon: Gamepad2,
  },
  everyday: {
    label: { el: 'Καθημερινή χρήση', en: 'Everyday' },
    desc: { el: 'Γραφείο, σπουδές, internet· αρκούν ενσωματωμένα γραφικά.', en: 'Office, study, web; integrated graphics are enough.' },
    icon: Briefcase,
  },
  creating: {
    label: { el: 'Δημιουργία', en: 'Creating' },
    desc: { el: 'Μοντάζ, 3D, φωτογραφία· επεξεργαστής και μνήμη μετράνε.', en: 'Video, 3D, photos; CPU and memory matter.' },
    icon: Palette,
  },
  unsure: {
    label: { el: 'Δεν ξέρω ακόμα', en: 'Not sure' },
    desc: { el: 'Μια ισορροπημένη σύνθεση.', en: 'A balanced build.' },
    icon: HelpCircle,
  },
};
const BUDGETS = [700, 1000, 1500, 2000];

/** Chip toggle, the same look as the category filters' chips. */
function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`tap inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset transition ${
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
  const s = p.get('step') as StepId | null;
  if (s && STEPS.includes(s)) return s;
  // A shared build opens on its review.
  return SLOTS.some((slot) => p.has(slot)) ? 'review' : 'use';
}

export default function Guided({ state, header }: { state: BuilderState; header: ReactNode }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const { build, prefs } = state;
  const [step, setStep] = useState<StepId>(initialStep);
  const top = useRef<HTMLDivElement>(null);
  const index = STEPS.indexOf(step);
  const opt = optional(step, build);

  const go = (s: StepId) => {
    setStep(s);
    writeBuilderParams((p) => (s === 'use' ? p.delete('step') : p.set('step', s)));
    // Back to the top of the step when it starts above the screen.
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  };
  const back = index > 0 ? () => go(STEPS[index - 1]) : undefined;
  const next = index < STEPS.length - 1 ? () => go(STEPS[index + 1]) : undefined;
  const isSlot = step !== 'use' && step !== 'review';
  const canSkip = isSlot && opt.optional && !build[step as Slot];

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

  return (
    <>
      <div ref={top} className="flex min-w-0 scroll-mt-4 flex-col gap-4">
        {header}
        <Progress step={step} build={build} prefs={prefs} onGo={go} lang={lang} />
        <section className="card flex flex-col gap-4 p-4 sm:p-5" aria-labelledby="step-title">
          <div>
            <div className="text-xs font-medium text-muted">
              {t(G.step)} {index + 1} {t(G.of)} {STEPS.length}
              {opt.optional && <span className="text-faint"> · {t(G.optional)}</span>}
            </div>
            <h2 id="step-title" className="text-xl font-semibold tracking-tight">
              {t(STEP_NAME[step])}
            </h2>
            {GUIDE_INDEX[step] != null && <p className="mt-1 text-sm text-muted">{t(GUIDE_STEPS[GUIDE_INDEX[step]!].body)}</p>}
            {opt.why && <p className="mt-1 text-sm font-medium">{t(opt.why)}</p>}
            {isSlot && <Suggested slot={step as Slot} build={build} prefs={prefs} lang={lang} />}
          </div>

          {step === 'use' ? (
            <UseStep state={state} lang={lang} />
          ) : step === 'review' ? (
            <Review state={state} lang={lang} onGo={go} />
          ) : (
            <PartStep key={step} slot={step} state={state} lang={lang} />
          )}

          <div className="flex items-center gap-2 border-t border-line pt-4">
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
      <Summary
        state={state}
        onSlot={(s) => go(s)}
        back={navButton('back', true)}
        next={navButton('next', true)}
      />
    </>
  );
}

/** Numbered steps with checkmarks; any step can be opened. Wraps onto a second line when narrow
 * (phones show only the current step's name). */
function Progress({ step, build, prefs, onGo, lang }: { step: StepId; build: Build; prefs: Prefs; onGo: (s: StepId) => void; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  return (
    <nav aria-label={t(G.step)} className="card px-2 py-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {STEPS.map((s, i) => {
          const current = s === step;
          const done = isDone(s, build, prefs);
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onGo(s)}
                aria-current={current ? 'step' : undefined}
                className={`tap flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-sm transition ${
                  current ? 'bg-accent/10 font-semibold text-fg ring-1 ring-inset ring-accent dark:ring-accent/30' : 'text-muted hover:bg-hover hover:text-fg'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    done ? 'bg-accent text-panel' : current ? 'bg-accent/15 text-accent' : 'bg-sunken text-muted ring-1 ring-inset ring-line-strong'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={current ? undefined : 'hidden md:inline'}>{t(STEP_SHORT[s])}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** "Suggested for this part: 150–200 € (15–20% of the budget)" when a budget is set. */
function Suggested({ slot, build, prefs, lang }: { slot: Slot; build: Build; prefs: Prefs; lang: Lang }) {
  const share = shareOf(prefs.use, slot);
  if (!prefs.budget || !share) return null;
  const [lo, hi] = share.map((p) => Math.round((prefs.budget! * p) / 100 / 5) * 5);
  const left = remaining(build, prefs, slot);
  return (
    <p className="mt-1 text-sm text-muted">
      {tr(lang, G.suggested)}: <span className="font-medium text-fg">{lo}–{hi} €</span> ({share[0]}–{share[1]}% {tr(lang, G.ofBudget)})
      {left != null && left < hi && <> · {formatPrice(Math.max(0, left), lang)} {tr(lang, { el: 'απομένουν', en: 'left' })}</>}
    </p>
  );
}

function UseStep({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const { prefs, setPrefs } = state;
  const [text, setText] = useState(prefs.budget ? String(prefs.budget) : '');
  useEffect(() => setText(prefs.budget ? String(prefs.budget) : ''), [prefs.budget]);
  const setBudget = (v: string) => {
    setText(v);
    const n = Math.round(Number(v.replace(/[^\d]/g, '')));
    setPrefs({ ...prefs, budget: n > 0 ? n : null });
  };
  const use = prefs.use ?? 'unsure';
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t(G.useQ)}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {USES.map((u) => {
            const info = USE_INFO[u];
            const Icon = info.icon;
            const on = prefs.use === u;
            return (
              <button
                key={u}
                type="button"
                aria-pressed={on}
                onClick={() => setPrefs({ ...prefs, use: on ? null : u })}
                className={`tap flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition ${
                  on ? 'bg-accent/10 ring-accent dark:ring-accent/40' : 'ring-line-strong hover:bg-hover'
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? 'text-accent' : 'text-muted'}`} />
                <span>
                  <span className="block font-semibold">{t(info.label)}</span>
                  <span className="block text-sm text-muted">{t(info.desc)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor="budget" className="mb-1 block text-sm font-semibold">
          {t(G.budgetQ)}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              id="budget"
              inputMode="numeric"
              value={text}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000"
              className="field w-32 py-2 pl-3 pr-8 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
          </div>
          {BUDGETS.map((b) => (
            <Chip key={b} on={prefs.budget === b} onClick={() => setBudget(prefs.budget === b ? '' : String(b))}>
              {b} €
            </Chip>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">{t(G.budgetHint)}</p>
      </div>
      <div>
        <div className="mb-1 text-sm font-semibold">
          {t(G.split)} · {t(USE_INFO[use].label)}
        </div>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {SLOTS.map((s) => {
            const share = shareOf(use, s);
            if (!share) return null;
            return (
              <li key={s} className="flex justify-between gap-2 border-b border-line py-1">
                <span className="text-muted">{t(STEP_NAME[s])}</span>
                <span className="tabular-nums">
                  {share[0]}–{share[1]}%
                  {prefs.budget ? (
                    <span className="text-muted">
                      {' '}
                      · {Math.round((prefs.budget * share[0]) / 100)}–{Math.round((prefs.budget * share[1]) / 100)} €
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type Rated = { m: Model<BaseListing>; rating: Rating };

function PartStep({ slot, state, lang }: { slot: Slot; state: BuilderState; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const { models, build, update, ctx, prefs, extraVersion, wantSlot } = state;
  // Storage has its own file (builder.LAZY_SLOTS), fetched when its step opens.
  const loading = state.loading || !state.slotReady(slot);
  useEffect(() => {
    if (!state.loading) wantSlot(slot);
  }, [slot, state.loading]);
  const cfg = CATEGORIES[slot as Category];
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortBy>('recommended');
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withinBudget, setWithinBudget] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // Fans step: sizes the chosen case needs (from the fan plan), and the type named in the product.
  const planSizes = useMemo(() => (slot === 'fan' && build.case ? [...new Set(fanPlan(build).add.map((a) => a.size))] : []), [slot, build]);
  const [sizes, setSizes] = useState<number[]>(planSizes);
  // A saved build arrives with builder.json, after the first render: follow the plan when it changes.
  const planKey = planSizes.join();
  useEffect(() => setSizes(planSizes), [planKey]);
  const [fanType, setFanType] = useState<'airflow' | 'pressure' | null>(null);

  const rated: Rated[] = useMemo(() => (models ? (rateAll(slot, models[slot] as never, build, ctx) as Rated[]) : []), [models, slot, build, ctx]);
  const order = useMemo(() => sorter(slot, rated.map((r) => r.m), sort), [slot, rated, sort]);
  const left = remaining(build, prefs, slot);

  const { shown, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const search = cfg as unknown as { searchText: (l: BaseListing) => string };
    let list = rated.filter((r) => !q || r.m.listings.some((l) => search.searchText(l).toLowerCase().includes(q)));
    const clashes = list.filter((r) => r.rating.fit === 'no').length;
    if (onlyCompatible) list = list.filter((r) => r.rating.fit !== 'no');
    if (verifiedOnly) list = list.filter((r) => r.rating.fit !== 'unverified');
    if (withinBudget && left != null) list = list.filter((r) => r.m.cheapest.price <= left);
    if (slot === 'fan' && sizes.length) list = list.filter((r) => sizes.includes((r.m as Model<FanListing>).cheapest.size));
    if (slot === 'fan' && fanType) list = list.filter((r) => (r.m as Model<FanListing>).cheapest.fanType === fanType);
    // Clashes (shown when "Only compatible" is off) go last, greyed out.
    return { shown: [...list].sort((a, b) => Number(a.rating.fit === 'no') - Number(b.rating.fit === 'no') || order(a, b)), hidden: clashes };
    // extraVersion: search titles arrive later (builder-extra.json).
  }, [rated, order, query, onlyCompatible, verifiedOnly, withinBudget, left, cfg, extraVersion, slot, sizes, fanType]);
  useEffect(() => setLimit(PAGE), [query, sort, onlyCompatible, verifiedOnly, withinBudget, sizes, fanType]);

  const chosen = build[slot] as AnyModel | undefined;

  return (
    <div className="flex flex-col gap-3">
      {(slot === 'case' || slot === 'fan') && <FanAdviceBox build={build} step={slot} lang={lang} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(cfg.searchPlaceholder)}
            aria-label={t(T.search)}
            className="field w-full text-ellipsis py-2 pl-9 pr-3"
          />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0 text-muted">{t(G.sort)}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortBy)} className="field min-w-0 flex-1 py-2 pl-3 pr-8 sm:flex-none">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
        <span className={`text-sm text-muted ${loading ? 'invisible' : ''}`}>
          {shown.length} {t(G.shown)}
          {onlyCompatible && hidden > 0 && (
            <>
              {' '}
              · {plural(lang, hidden, HIDDEN)}
            </>
          )}
        </span>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-faint">
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
                chosen={chosen?.key === r.m.key}
                onChoose={() => update({ ...build, [slot]: r.m })}
                onRemove={() => update({ ...build, [slot]: undefined })}
                lang={lang}
              >
                {slot === 'case' && <CaseFansLine c={r.m as Model<CaseListing>} build={build} lang={lang} />}
              </PartCard>
            ))}
          </ul>
          {shown.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
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
  chosen,
  onChoose,
  onRemove,
  lang,
  children,
}: {
  slot: Slot;
  m: AnyModel;
  rating: Rating;
  chosen: boolean;
  onChoose: () => void;
  onRemove: () => void;
  lang: Lang;
  children?: ReactNode;
}) {
  const t = (x: Text) => tr(lang, x);
  const clash = rating.fit === 'no';
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
      {rating.fit && rating.fit !== 'fits' && rating.reasons[0] && (
        <p className="line-clamp-3 text-xs text-muted">{rating.reasons.map((r) => t(r)).join(' ')}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <span className="font-semibold tabular-nums">{formatPrice(m.cheapest.price, lang)}</span>
        <SourceBadge source={m.cheapest.source} />
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
