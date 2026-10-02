// The PC builder page: shared state (src/lib/builderState.ts), the measurement notice, the mode
// (Quick list) and the summary.

import { AlertTriangle, Info } from 'lucide-react';
import { useBuilderState } from '../lib/builderState';
import { T, tr, useLang, type Text } from '../lib/i18n';
import QuickList from './builder/QuickList';
import Summary from './builder/Summary';

export default function Builder() {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const state = useBuilderState();
  const { coverage, error, wantExtra } = state;

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

  return (
    // The page renders before builder.json arrives (the text is the largest element; waiting for the
    // data cost 1.7 s of LCP on phones). Any click, tap or keyboard focus fetches the shop links and
    // search titles (builder-extra.json).
    <div
      className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onPointerDownCapture={wantExtra}
      onFocusCapture={wantExtra}
    >
      <div className="flex min-w-0 flex-col gap-4">
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
        <QuickList state={state} />
      </div>
      <Summary state={state} />
    </div>
  );
}
