// The PC builder page: shared state (src/lib/builderState.ts), the mode toggle (Guided, the default,
// or Quick list: #builder?mode=quick), the measurement notice and the summary.

import { useState } from 'react';
import { Info, ListChecks, ListOrdered } from 'lucide-react';
import { builderParams, useBuilderState, writeBuilderParams } from '../lib/builderState';
import { tr, useLang, type Text } from '../lib/i18n';
import { ErrorState } from '../ui/states';
import Guided from './builder/Guided';
import QuickList from './builder/QuickList';
import Summary from './builder/Summary';

type Mode = 'guided' | 'quick';

const M = {
  guided: { el: 'Βήμα-βήμα', en: 'Guided' },
  quick: { el: 'Γρήγορη λίστα', en: 'Quick list' },
  mode: { el: 'Τρόπος συναρμολόγησης', en: 'Builder mode' },
} satisfies Record<string, Text>;

/** The measurement notice: the text, then a line with today's percentages (from builder.json). */
const C = {
  text: {
    el: 'Οι διαστάσεις για τον έλεγχο συμβατότητας συλλέγονται σταδιακά. Όσα δεν έχουν ακόμα στοιχεία εμφανίζονται ως «Χωρίς επιβεβαίωση»· προστίθενται καθημερινά.',
    en: 'Measurements for the compatibility check are being collected gradually. Parts without them are shown as "Fit not verified"; more are added every day.',
  },
  known: { el: 'Γνωστές σήμερα:', en: 'Known today:' },
  gpu: { el: 'κάρτες γραφικών', en: 'graphics cards' },
  case: { el: 'κουτιά', en: 'cases' },
  cooler: { el: 'ψύκτρες', en: 'coolers' },
} satisfies Record<string, Text>;

export default function Builder() {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const state = useBuilderState();
  const { coverage, error, wantExtra } = state;
  const [mode, setMode] = useState<Mode>(() => (builderParams().get('mode') === 'quick' ? 'quick' : 'guided'));
  const choose = (m: Mode) => {
    setMode(m);
    writeBuilderParams((p) => {
      if (m === 'quick') p.set('mode', 'quick');
      else p.delete('mode');
      p.delete('step');
    });
  };

  // A failed load: the translated message, the detail folded, and a retry (UX-19). The builder's data
  // loader keeps its result for the session, so the retry reloads the page.
  if (error) {
    return (
      <div className="card">
        <ErrorState detail={error} onRetry={() => location.reload()} />
      </div>
    );
  }
  // Share of parts whose measurements are known yet (collected gradually, see scraper/specs.py),
  // counted at build time over every product, not just the ones the builder can offer.
  // While loading the notice shows without the percentages, so it doesn't push the parts down later.
  const collecting = !coverage || Object.values(coverage).some((v) => v < 90);

  const header = (
    <>
      <div role="radiogroup" aria-label={t(M.mode)} className="inline-flex self-start rounded-lg bg-sunken p-1 ring-1 ring-inset ring-edge">
        {(['guided', 'quick'] as const).map((m) => {
          const Icon = m === 'guided' ? ListOrdered : ListChecks;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => choose(m)}
              className={`tap inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === m ? 'bg-panel text-fg shadow-sm ring-1 ring-accent dark:ring-line' : 'text-muted hover:text-fg'
              }`}
            >
              <Icon className={`h-4 w-4 ${mode === m ? 'text-accent' : ''}`} /> {t(M[m])}
            </button>
          );
        })}
      </div>
      {collecting && (
        <div className="notice-warn flex gap-2 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex flex-col gap-1">
            <span>{t(C.text)}</span>
            {/* The percentages are their own line, which keeps its room while builder.json loads (invisible,
                fixed-width digits): the notice doesn't grow and push the steps down when they arrive (CLS), and
                the large text above is complete in the first render (it's the page's largest paint). */}
            <span className={coverage ? undefined : 'invisible'} aria-hidden={coverage ? undefined : true}>
              {t(C.known)} {t(C.gpu)} <span className="tabular-nums">{coverage?.gpu ?? 88}</span>%, {t(C.case)}{' '}
              <span className="tabular-nums">{coverage?.case ?? 88}</span>%, {t(C.cooler)}{' '}
              <span className="tabular-nums">{coverage?.cooler ?? 88}</span>%.
            </span>
          </span>
        </div>
      )}
    </>
  );

  return (
    // The page renders before builder.json arrives (the text is the largest element; waiting for the
    // data cost 1.7 s of LCP on phones). Any click, tap or keyboard focus fetches the shop links and
    // search titles (builder-extra.json).
    <div
      className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onPointerDownCapture={wantExtra}
      onFocusCapture={wantExtra}
    >
      {mode === 'guided' ? (
        <Guided state={state} header={header} />
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            {header}
            <QuickList state={state} />
          </div>
          <Summary state={state} />
        </>
      )}
    </div>
  );
}
