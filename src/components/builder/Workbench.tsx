// The builder's workbench (step 5 task 11): the shared state (src/lib/builderState.ts), a header with the mode toggle
// (step by step / part list) and the way back to the start screen, the measurement notice on one line (C9), then the
// guided walk or the part list with the summary. Its own chunk, after the start screen (rule 11).

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Info, ListChecks, ListOrdered } from 'lucide-react';
import type { View } from '../../lib/builderView';
import { onBuildChange, readBuild, writeBuild, type Line, type StoredBuild } from '../../lib/buildStore';
import { decodeShare, isShareParam } from '../../lib/share';
import { builderParams, writeBuilderParams } from '../../lib/builderView';
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
import CopyList from './CopyList';
import StatusCards from './StatusCards';
import PurchaseSummary from './PurchaseSummary';
import PowerBreakdown from './PowerBreakdown';
import { Dialog } from '../../ui/overlays';
import { Button } from '../../ui/Button';
import { UI } from '../../ui/strings';
import './builder.css';

export default function Workbench({ view, onView }: { view: Exclude<View, 'start'>; onView: (v: View) => void }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const state = useBuilderState();
  const { coverage, error, wantExtra } = state;
  const [openLine, setOpenLine] = useState<Line | null>(null);
  const [clearing, setClearing] = useState(false);
  const [undo, setUndo] = useState<StoredBuild | null>(null);
  const last = useRef(readBuild());
  const undoing = useRef(false);
  useEffect(() => onBuildChange((source) => {
    const next = readBuild();
    if (source === 'tab' && !undoing.current && JSON.stringify(next) !== JSON.stringify(last.current)) setUndo(last.current);
    last.current = next;
  }), []);
  const restoreUndo = () => {
    if (!undo) return;
    undoing.current = true;
    writeBuild(undo);
    undoing.current = false;
    setUndo(null);
  };
  const params = builderParams();
  const invalidLink = [...params.keys()].some(isShareParam) && !decodeShare(params);
  const [recovered, setRecovered] = useState(false);
  const recover = () => {
    writeBuilderParams((p) => [...p.keys()].filter(isShareParam).forEach((k) => p.delete(k)));
    setRecovered(true);
    onView('quick');
  };

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
      <div className="builder-toolbar">
        <button type="button" className="builder-action tap" disabled={!undo || state.shared} onClick={restoreUndo}>{t(UI.undo)}</button>
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
        {view === 'quick' && <CopyList state={state} lang={lang} date={state.builtAt ? new Date(state.builtAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB') : null} toolbar />}
        <button type="button" className="builder-action tap" onClick={() => setClearing(true)}>{t({ el: 'Νέα λίστα', en: 'New list' })}</button>
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
    <div className="builder-workbench" onPointerDownCapture={wantExtra} onFocusCapture={wantExtra}>
      {invalidLink && !recovered ? <section data-shared-recovery className="builder-recovery">
        <h2 className="text-2xl font-semibold">{t({ el: 'Ο σύνδεσμος είναι ελλιπής ή μη έγκυρος', en: 'This build link is incomplete or invalid' })}</h2>
        <p className="text-muted">{t({ el: 'Δεν περιέχει αναγνωρίσιμα εξαρτήματα. Ζήτησε ξανά ολόκληρο τον σύνδεσμο από τον αποστολέα.', en: 'It contains no recognizable parts. Ask the sender for the complete link.' })}</p>
        <div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={recover}>{t({ el: 'Η τρέχουσα λίστα μου', en: 'Use my current list' })}</Button><SavedBuildsMenu state={state} lang={lang} /></div>
      </section> : <>
      <div className="builder-heading"><div><h1>PC Builder</h1><p>{t({ el: 'Η σύνθεσή σου · αποθήκευση σε αυτόν τον browser', en: 'Your build · saved in this browser' })}</p></div><div className="builder-header-controls">{header}</div></div>
      {state.shared && <div className="notice-warn p-3 text-sm builder-shared-banner">{t({ el: 'Κοινόχρηστη σύνθεση. Οι τιμές είναι οι τρέχουσες. Η προσωπική σου λίστα διατηρείται μέχρι την πρώτη αλλαγή.', en: 'Shared build. Prices use current data. Your own list stays unchanged until you edit this build.' })}</div>}
      {view === 'quick' && <StatusCards state={state} lang={lang} />}
      <div className="builder-columns">
      {view === 'guided' ? (
        <GuidedWalk state={state} header={null} />
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <PartList state={state} openLine={openLine} setOpen={setOpenLine} />
            {/* One Review for both modes (task 13): a missing line opens its picker here. */}
            <section aria-labelledby="review-title" className="builder-review flex flex-col gap-3">
              <h2 id="review-title" className="text-lg font-semibold">
                {t(STEP_NAME.review)}
              </h2>
              <Review state={state} lang={lang} onGo={setOpenLine} compact />
            </section>
          </div>
          <div className="builder-sidebar"><Summary state={state} /><PurchaseSummary state={state} lang={lang} />{state.power && state.parts.length > 0 && <div className="card p-4"><PowerBreakdown power={state.power} watts={state.psuWatts} lang={lang} /></div>}</div>
        </>
      )}
      </div>
      </>}
      <Dialog open={clearing} title={t({ el: 'Νέα λίστα;', en: 'Start a new list?' })} onClose={() => setClearing(false)} actions={<><Button onClick={() => setClearing(false)}>{t(UI.cancel)}</Button><Button variant="danger" onClick={() => { state.clear(); setClearing(false); }}>{t({ el: 'Νέα λίστα', en: 'New list' })}</Button></>}>
        {t({ el: 'Θα αφαιρεθούν τα εξαρτήματα της τρέχουσας λίστας. Μπορείς να αναιρέσεις αμέσως μετά.', en: 'This removes the current list’s parts. You can undo this immediately afterwards.' })}
      </Dialog>
    </div>
  );
}
