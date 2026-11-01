// The builder's guided walk (step 5 task 11): one step at a time over the same list as the part list, a compact header
// "Βήμα 2/9 · Μητρική" with ‹ › and the step list on tap (C9), one line of guide text with "More" (C10), the step's
// picker (task 12, shared with the part list), fans as a section of the case step, the summary (Back / Next in its phone bar).

import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AutoFile } from '../../types';
import type { Slot } from '../../lib/builderData';
import { optionalSlot } from '../../lib/builderEngine';
import { builderParams, writeBuilderParams, type BuilderState } from '../../lib/builderState';
import { loadAuto } from '../../lib/recommend';
import { afterLargestPaint } from '../../lib/paint';
import { GUIDE_INDEX, STEPS, STEP_NAME, isDone, stepOf, type StepId } from '../../lib/wizard';
import { tr, useLang, type Lang, type Text } from '../../lib/i18n';
import { GUIDE_STEPS } from '../BuildGuide';
import Review from './Review';
import Summary from './SummaryBar';
import Picker from './Picker';
import FanPlanPanel from './FanPlanPanel';
import { BUILDER as B, fill } from '../../ui/builderStrings';

const G = {
  back: { el: 'Πίσω', en: 'Back' },
  next: { el: 'Επόμενο', en: 'Next' },
  skip: { el: 'Παράλειψη', en: 'Skip' },
  optional: { el: 'προαιρετικό', en: 'optional' },
} satisfies Record<string, Text>;

/** The second drive's picker, mounted only while open: closed, it would check every drive a second time. */
function SecondDrive({ state, auto, lang }: { state: BuilderState; auto: AutoFile | null; lang: Lang }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="card p-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="tap cursor-pointer font-semibold">{tr(lang, B.storage2)}</summary>
      {open && <Picker slot="storage" line="storage2" state={state} auto={auto} lang={lang} />}
    </details>
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
            <Picker key={step} slot={step} state={state} auto={auto} lang={lang} />
          )}
          {step === 'storage' && <SecondDrive state={state} auto={auto} lang={lang} />}
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
      <FanPlanPanel state={state} lang={lang} />
      {ready && <Picker slot="fan" state={state} auto={auto} lang={lang} />}
    </section>
  );
}

