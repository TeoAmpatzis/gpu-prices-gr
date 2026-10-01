import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';
import { autoBuild, type AutoBuildOutcome, type SlotModels, type Use } from '../lib/autobuild';
import type { Build } from '../lib/builder';
import { formatPrice } from '../lib/data';
import { tr, useLang, type Text } from '../lib/i18n';

const S: Record<string, Text> = {
  title: {
    el: 'Αυτόματη σύνθεση για τον προϋπολογισμό σας',
    en: 'Automatic build for your budget',
  },
  intro: {
    el: 'Δώστε ποσό και χρήση: προτείνεται η συμβατή σύνθεση με την καλύτερη απόδοση για τα χρήματα, με τις σημερινές τιμές. Μετά αλλάζετε ό,τι θέλετε παρακάτω.',
    en: 'Enter an amount and a use: you get the compatible build with the best performance for the money at today’s prices. Then change anything you like below.',
  },
  budget: { el: 'Προϋπολογισμός (€)', en: 'Budget (€)' },
  use: { el: 'Χρήση', en: 'Use' },
  gaming: { el: 'Gaming', en: 'Gaming' },
  office: { el: 'Γραφείο & σπουδές', en: 'Office & study' },
  propose: { el: 'Πρόταση σύνθεσης', en: 'Suggest a build' },
  replaces: {
    el: 'Αντικαθιστά την τρέχουσα σύνθεση.',
    en: 'Replaces the current build.',
  },
  method: {
    el: 'Η απόδοση εκτιμάται από τον επεξεργαστή και την κάρτα γραφικών (μέσοι όροι δημοσιευμένων τεστ)· τα υπόλοιπα είναι τα φθηνότερα συμβατά με λογικές ελάχιστες απαιτήσεις. Δεν περιλαμβάνεται δίσκος, ούτε επιπλέον ανεμιστήρες (τα περισσότερα κουτιά έχουν ήδη).',
    en: 'Performance is estimated from the processor and graphics card (averages of published reviews); the other parts are the cheapest compatible ones with sensible minimums. No storage drive and no extra fans (most cases come with some).',
  },
  noCard: {
    el: 'Δεν χωράει κάρτα γραφικών στο ποσό: προτείνεται επεξεργαστής με ενσωματωμένα γραφικά, για ελαφρύ gaming.',
    en: 'No graphics card fits the amount: a processor with integrated graphics is suggested, for light gaming.',
  },
  noData: {
    el: 'Δεν υπάρχουν ακόμα αρκετά στοιχεία για πλήρη σύνθεση.',
    en: 'There is not enough data for a complete build yet.',
  },
};

const DEFAULT_BUDGET = 1000;
const MIN_BUDGET = 100;
const MAX_BUDGET = 20000;

/** Budget + use → the best-value build (src/lib/autobuild.ts), applied to the builder's slots. */
export default function AutoBuild({
  models,
  build,
  onApply,
}: {
  models: SlotModels;
  build: Build;
  onApply: (b: Build) => void;
}) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const [budget, setBudget] = useState(String(DEFAULT_BUDGET));
  const [use, setUse] = useState<Use>('gaming');
  const [outcome, setOutcome] = useState<{
    budget: number;
    result: AutoBuildOutcome;
  } | null>(null);
  const amount = Number(budget);
  const valid = Number.isFinite(amount) && amount >= MIN_BUDGET && amount <= MAX_BUDGET;
  const hasBuild = Object.values(build).some(Boolean);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const result = autoBuild(models, amount, use);
    setOutcome({ budget: amount, result });
    if (result.ok) onApply(result.result.build);
  };

  // The message only describes the proposal while it is still the build on screen.
  const shown = outcome && (!outcome.result.ok || outcome.result.result.build === build) ? outcome : null;

  return (
    <section className="card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Wand2 className="h-4 w-4 text-accent" />
        {t(S.title)}
      </h2>
      <p className="mt-1 text-sm text-muted">{t(S.intro)}</p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">{t(S.budget)}</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={50}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="field w-36 px-3 py-2 tabular-nums"
          />
        </label>
        <div className="flex flex-col gap-1" role="group" aria-label={t(S.use)}>
          <span className="label">{t(S.use)}</span>
          <div className="flex gap-0.5 rounded-lg bg-hover p-0.5 ring-1 ring-inset ring-edge">
            {(['gaming', 'office'] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={use === u}
                onClick={() => setUse(u)}
                className={`tap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  use === u
                    ? 'bg-panel text-fg shadow-sm ring-1 ring-accent dark:ring-line'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {t(S[u])}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="tap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-page transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t(S.propose)}
        </button>
      </form>
      {hasBuild && !shown && <p className="mt-2 text-xs text-faint">{t(S.replaces)}</p>}

      {shown && !shown.result.ok && (
        <div className="notice-warn mt-3 flex gap-2 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {shown.result.minimum == null
              ? t(S.noData)
              : t({
                  el: `Καμία πλήρης σύνθεση δεν χωράει στα ${formatPrice(shown.budget, lang)}. Η φθηνότερη κοστίζει ${formatPrice(shown.result.minimum, lang)}.`,
                  en: `No complete build fits ${formatPrice(shown.budget, lang)}. The cheapest one costs ${formatPrice(shown.result.minimum, lang)}.`,
                })}
          </span>
        </div>
      )}
      {shown?.result.ok && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-sunken p-3 text-sm ring-1 ring-edge">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              {t({
                el: `Προτεινόμενη σύνθεση: ${formatPrice(shown.result.result.total, lang)} από ${formatPrice(shown.budget, lang)}.`,
                en: `Suggested build: ${formatPrice(shown.result.result.total, lang)} of ${formatPrice(shown.budget, lang)}.`,
              })}
            </span>
          </div>
          {shown.result.result.noCard && <p className="text-muted">{t(S.noCard)}</p>}
          <p className="text-xs text-muted">{t(S.method)}</p>
        </div>
      )}
    </section>
  );
}
