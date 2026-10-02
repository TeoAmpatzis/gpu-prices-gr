// The PC builder page: shared state (src/lib/builderState.ts), the mode toggle (Guided, the default,
// or Quick list: #builder?mode=quick), the measurement notice and the summary.

import { useState } from 'react';
import { AlertTriangle, Info, ListChecks, ListOrdered } from 'lucide-react';
import { builderParams, useBuilderState, writeBuilderParams } from '../lib/builderState';
import { T, tr, useLang, type Text } from '../lib/i18n';
import Guided from './builder/Guided';
import QuickList from './builder/QuickList';
import Summary from './builder/Summary';

type Mode = 'guided' | 'quick';

const M = {
  guided: { el: 'Βήμα-βήμα', en: 'Guided' },
  quick: { el: 'Γρήγορη λίστα', en: 'Quick list' },
  mode: { el: 'Τρόπος συναρμολόγησης', en: 'Builder mode' },
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

  if (error) {
    return (
      <div className="notice-danger flex items-center gap-2 p-4">
        <AlertTriangle className="h-5 w-5" /> {t(T.loadError)}: {error}
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
          <span>
            {t({
              el: `Οι διαστάσεις για τον έλεγχο συμβατότητας συλλέγονται σταδιακά${coverage ? ` (κάρτες γραφικών ${coverage.gpu}%, κουτιά ${coverage.case}%, ψύκτρες ${coverage.cooler}%)` : ''}. Όσα δεν έχουν ακόμα στοιχεία εμφανίζονται ως «Χωρίς επιβεβαίωση»· προστίθενται καθημερινά.`,
              en: `Measurements for the compatibility check are being collected gradually${coverage ? ` (graphics cards ${coverage.gpu}%, cases ${coverage.case}%, coolers ${coverage.cooler}%)` : ''}. Parts without them are shown as "Fit not verified"; more are added every day.`,
            })}
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
