// The builder's workbench (step 5 task 11): the shared state (src/lib/builderState.ts), a header with the mode toggle
// (step by step / part list) and the way back to the start screen, the measurement notice on one line (C9), then the
// guided walk or the part list with the summary. Its own chunk, after the start screen (rule 11).

import { useState } from 'react';
import { ArrowLeft, Info, ListChecks, ListOrdered } from 'lucide-react';
import type { View } from '../../lib/builderView';
import type { Line } from '../../lib/buildStore';
import { STEP_NAME } from '../../lib/wizard';
import Review from './Review';
import SavedBuildsMenu from './SavedBuildsMenu';
import { useBuilderState } from '../../lib/builderState';
import { tr, useLang, type Text } from '../../lib/i18n';
import { ErrorState } from '../../ui/states';
import { BUILDER as B } from '../../ui/builderStrings';
import GuidedWalk from './GuidedWalk';
import PartList from './PartList';
import Summary from './SummaryBar';

export default function Workbench({ view, onView }: { view: Exclude<View, 'start'>; onView: (v: View) => void }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const state = useBuilderState();
  const { coverage, error, wantExtra } = state;
  const [openLine, setOpenLine] = useState<Line | null>(null);

  // A failed index load: the translated message, the detail folded, and a retry (UX-19). The loaders keep their
  // result for the session, so the retry reloads the page.
  if (error) {
    return (
      <div className="card">
        <ErrorState detail={error} onRetry={() => location.reload()} />
      </div>
    );
  }
  const collecting = !coverage || Object.values(coverage).some((v) => v < 90);

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={t(B.mode)} className="inline-flex rounded-lg bg-sunken p-1 ring-1 ring-inset ring-edge">
          {(['guided', 'quick'] as const).map((m) => {
            const Icon = m === 'guided' ? ListOrdered : ListChecks;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={view === m}
                onClick={() => view !== m && onView(m)}
                className={`tap inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === m ? 'bg-panel text-fg shadow-sm ring-1 ring-accent dark:ring-line' : 'text-muted hover:text-fg'
                }`}
              >
                <Icon className={`h-4 w-4 ${view === m ? 'text-accent' : ''}`} aria-hidden="true" /> {t(m === 'guided' ? B.stepByStep : B.partList)}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => onView('start')} aria-label={t(B.useBudget)} title={t(B.useBudget)} className="tap-square inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-hover hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">{t(B.useBudget)}</span>
        </button>
        <SavedBuildsMenu state={state} lang={lang} />
      </div>
      {collecting && (
        <details className="notice-warn px-3 text-sm">
          <summary className="tap flex cursor-pointer items-center gap-2 py-2">
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t(B.noticeShort)}</span>
            <span className="shrink-0 font-medium underline">{t(B.more)}</span>
          </summary>
          <p className="pb-3">
            {t(B.notice)}
            {coverage && (
              <>
                {' '}
                {t(B.known)} {t(B.knownGpu)} {coverage.gpu}%, {t(B.knownCase)} {coverage.case}%, {t(B.knownCooler)} {coverage.cooler}%.
              </>
            )}
          </p>
        </details>
      )}
    </>
  );

  return (
    // Any click, tap or keyboard focus fetches the loaded steps' shop links and search titles (their extra files).
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" onPointerDownCapture={wantExtra} onFocusCapture={wantExtra}>
      {view === 'guided' ? (
        <GuidedWalk state={state} header={header} />
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            {header}
            <PartList state={state} openLine={openLine} setOpen={setOpenLine} />
            {/* One Review for both modes (task 13): a missing line opens its picker here. */}
            <section aria-labelledby="review-title" className="card flex flex-col gap-3 p-3 sm:p-4">
              <h2 id="review-title" className="text-lg font-semibold">
                {t(STEP_NAME.review)}
              </h2>
              <Review state={state} lang={lang} onGo={setOpenLine} />
            </section>
          </div>
          <Summary state={state} />
        </>
      )}
    </div>
  );
}
