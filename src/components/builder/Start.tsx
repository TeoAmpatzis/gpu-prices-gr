// The builder's start screen (step 5 task 11, owner's answer 7): the use (+ resolution for gaming) and the budget, then
// "Build it for me" (the automatic build of that budget, auto.json → the part list), "Step by step" or "Part list".
// "Costs at least X € today" appears as soon as use and budget are set. This screen is the builder's first paint: it
// loads only the index file (and auto.json once a budget is set), never the parts' code (rule 11).

import { Suspense, lazy, useEffect, useState } from 'react';
import { Briefcase, Gamepad2, HelpCircle, Info, ListChecks, ListOrdered, Palette, Sparkles } from 'lucide-react';
import type { AutoFile, BuilderIndex } from '../../types';
import { autoFor, loadAuto } from '../../lib/autoPick';
import { loadIndex } from '../../lib/builderIndex';
import type { View } from '../../lib/builderView';
import { readBuild, writeBuild, type StoredBuild, type UseKind } from '../../lib/buildStore';
import { formatPrice, formatWhole } from '../../lib/format';
import { tr, useLang, type Text } from '../../lib/i18n';
import { afterLargestPaint } from '../../lib/paint';
import { toUseKey } from '../../lib/useMinimums';
import type { Res } from '../../engine/data/tiers';
import { BUILDER as B, PC_FOR, USE_TEXT, fill } from '../../ui/builderStrings';
import { UI } from '../../ui/strings';
import { Button } from '../../ui/Button';
import './builder.css';

// Only when "Build it for me" would replace an open named build: kept out of the first paint (rule 11).
const Dialog = lazy(() => import('../../ui/overlays').then((m) => ({ default: m.Dialog })));
const Toast = lazy(() => import('../../ui/overlays').then((m) => ({ default: m.Toast })));
const ToastRegion = lazy(() => import('../../ui/overlays').then((m) => ({ default: m.ToastRegion })));
import { NOT_STORED_TEXT, closeActive, readSavedBuilds } from '../../lib/savedBuilds';

const USES: { id: UseKind; icon: typeof Gamepad2 }[] = [
  { id: 'gaming', icon: Gamepad2 },
  { id: 'everyday', icon: Briefcase },
  { id: 'creating', icon: Palette },
  { id: 'unsure', icon: HelpCircle },
];
const RES: Res[] = ['1080p', '1440p', '4k'];
const BUDGETS = [700, 1000, 1500, 2000];

const pill = (on: boolean) =>
  `tap inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition ${
    on ? 'bg-accent/10 text-accent ring-accent dark:ring-accent/30' : 'text-muted ring-line-strong hover:bg-hover hover:text-fg'
  }`;

export default function Start({ onGo, onIntent }: { onGo: (v: Exclude<View, 'start'>) => void; onIntent: () => void }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const [prefs, setPrefsState] = useState(() => {
    const b = readBuild();
    return { use: b.use ?? null, res: b.res ?? null, budget: b.budget ?? null };
  });
  const [text, setText] = useState(prefs.budget ? String(prefs.budget) : '');
  const [index, setIndex] = useState<BuilderIndex | null>(null);
  const [auto, setAuto] = useState<AutoFile | null>(null);
  const [autoFailed, setAutoFailed] = useState(false);
  const [autoTry, setAutoTry] = useState(0); // a retry asks auto.json again

  // The index file once this screen (the page's largest paint) is on screen (src/lib/paint.ts); a failure leaves the
  // screen without the "costs at least" line. The parts' code follows on the first interaction or 5 s later.
  useEffect(() => {
    const cancel = afterLargestPaint(() => void loadIndex().then(setIndex, () => {}));
    const later = window.setTimeout(onIntent, 5000);
    return () => {
      cancel();
      clearTimeout(later);
    };
  }, [onIntent]);
  // auto.json once a budget is set (a few KiB).
  const builtAt = index?.builtAt;
  const hasBudget = prefs.budget != null;
  useEffect(() => {
    if (!builtAt || !hasBudget) return;
    let live = true;
    loadAuto(builtAt).then(
      (a) => {
        if (!live) return;
        setAuto(a);
        setAutoFailed(false);
      },
      () => {
        if (live) setAutoFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [builtAt, hasBudget, autoTry]);

  const save = (p: typeof prefs) => {
    setPrefsState(p);
    const next: StoredBuild = { ...readBuild() };
    delete next.use;
    delete next.res;
    delete next.budget;
    if (p.use) next.use = p.use;
    if (p.use === 'gaming' && p.res) next.res = p.res;
    if (p.budget) next.budget = p.budget;
    writeBuild(next);
  };
  const setBudget = (v: string) => {
    setText(v);
    const n = Math.round(Number(v.replace(/[^\d]/g, '')));
    save({ ...prefs, budget: n > 0 ? n : null });
  };

  const key = toUseKey(prefs.use, prefs.use === 'gaming' ? prefs.res : null);
  const minimum = key ? index?.minimum[key] : null;
  const pick = key && prefs.budget && auto ? autoFor(auto, key, prefs.budget) : null;
  // An open named build that "Build it for me" would replace: asked first, then closed so it stays as saved.
  const [replacing, setReplacing] = useState<{ name: string; budget: number } | null>(null);
  const [refused, setRefused] = useState(0); // > 0: the storage-refused toast (its key, so a repeat shows again)
  useEffect(() => {
    if (!refused) return;
    const id = window.setTimeout(() => setRefused(0), 4000);
    return () => window.clearTimeout(id);
  }, [refused]);
  /** Saves an automatic build (the parts, their fan quantity, the use and budget) and opens the part list. */
  const take = (budget: number, confirmed = false) => {
    const r = key && auto ? autoFor(auto, key, budget) : null;
    if (r?.kind !== 'build') return;
    const saved = readSavedBuilds();
    const named = saved.active ? saved.builds[saved.active] : undefined;
    if (named && !confirmed) return setReplacing({ name: named.name, budget });
    // Storage refused closing it: writing now would overwrite the named build (mirrorActive), so stop and say so.
    if (named && !closeActive()) {
      setReplacing(null);
      return setRefused((n) => n + 1);
    }
    const b: StoredBuild = { parts: Object.fromEntries(Object.entries(r.build.parts).map(([s, k]) => [s, { key: k }])) };
    if (r.build.fanQty > 0) b.fanQty = r.build.fanQty;
    if (prefs.use) b.use = prefs.use;
    if (prefs.use === 'gaming' && prefs.res) b.res = prefs.res;
    if (prefs.budget) b.budget = prefs.budget;
    writeBuild(b);
    onGo('quick');
  };

  return (
    <div className="builder-start card flex flex-col gap-5 p-4 sm:p-5" onPointerDownCapture={onIntent} onFocusCapture={onIntent}>
      <div className="builder-start-heading"><span className="badge badge-unverified">PC Builder</span><h1>{t({ el: 'Φτιάξε τον δικό σου υπολογιστή', en: 'Build your own PC' })}</h1><p>{t({ el: 'Διάλεξε χρήση και προϋπολογισμό. Σύγκρινε πραγματικές τιμές και έλεγξε τη συμβατότητα των εξαρτημάτων.', en: 'Choose your use and budget. Compare real prices and check how your parts fit together.' })}</p></div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t(B.useQ)}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {USES.map(({ id, icon: Icon }) => {
            const on = prefs.use === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => save({ ...prefs, use: on ? null : id })}
                className={`tap flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition ${
                  on ? 'bg-accent/10 ring-accent dark:ring-accent/40' : 'ring-line-strong hover:bg-hover'
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{t(USE_TEXT[id].label)}</span>
                  <span className="block text-sm text-muted">{t(USE_TEXT[id].desc)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {prefs.use === 'gaming' && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t(B.resQ)}</legend>
          <div className="flex flex-wrap gap-2">
            {RES.map((r) => (
              <button key={r} type="button" aria-pressed={(prefs.res ?? '1080p') === r} onClick={() => save({ ...prefs, res: r })} className={pill((prefs.res ?? '1080p') === r)}>
                {r === '4k' ? '4K' : r}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div>
        <label htmlFor="budget" className="mb-1 block text-sm font-semibold">
          {t(B.budgetQ)}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              id="budget"
              inputMode="numeric"
              value={text}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000"
              className={`field w-32 py-2 tabular-nums ${lang === 'en' ? 'pl-8 pr-3' : 'pl-3 pr-8'}`}
            />
            {/* the sign on the language's side, as in the chips: "€1,000" / "1.000 €" */}
            <span className={`pointer-events-none absolute ${lang === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-sm text-muted`}>€</span>
          </div>
          {BUDGETS.map((b) => (
            <button key={b} type="button" aria-pressed={prefs.budget === b} onClick={() => setBudget(prefs.budget === b ? '' : String(b))} className={pill(prefs.budget === b)}>
              {formatWhole(b, lang)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">{t(B.budgetHint)}</p>
      </div>

      {/* "Costs at least X € today" (Review Focus 2) and the range's top, as soon as use and budget are set. */}
      <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        {key && prefs.budget && minimum && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-minimum>
            <span className={prefs.budget < minimum.total ? 'font-medium text-fg' : 'text-muted'}>
              {fill(t(B.minimum), { pc: t(PC_FOR[key]), x: formatPrice(minimum.total, lang) })}
            </span>
            <button type="button" disabled={!auto} onClick={() => take(minimum.total)} className="tap text-sm font-medium text-accent hover:underline disabled:text-muted">
              {t(B.seeMinimum)}
            </button>
          </p>
        )}
        {pick?.kind === 'above' && auto && <p className="text-sm text-muted">{fill(t(B.aboveRange), { max: formatWhole(auto.grid.to, lang) })}</p>}
        {autoFailed && (
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
            {t(B.autoFailed)}
            <button type="button" onClick={() => setAutoTry((n) => n + 1)} className="tap font-medium text-accent hover:underline">
              {t(UI.retry)}
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={pick?.kind !== 'build'}
          onClick={() => prefs.budget && take(prefs.budget)}
          className="tap inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-panel hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" /> {t(B.buildForMe)}
        </button>
        <button type="button" onClick={() => onGo('guided')} className="tap inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10">
          <ListOrdered className="h-4 w-4" aria-hidden="true" /> {t(B.stepByStep)}
        </button>
        <button type="button" onClick={() => onGo('quick')} className="tap inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10">
          <ListChecks className="h-4 w-4" aria-hidden="true" /> {t(B.partList)}
        </button>
      </div>
      {(!key || !prefs.budget) && <p className="-mt-3 text-xs text-muted">{t(B.needUseBudget)}</p>}
      {replacing && (
        <Suspense fallback={null}>
          <Dialog
            open
            title={t(B.autoTitle)}
            onClose={() => setReplacing(null)}
            actions={
              <>
                <Button onClick={() => setReplacing(null)}>{t(UI.cancel)}</Button>
                <Button variant="primary" onClick={() => take(replacing.budget, true)}>
                  {t(B.continue)}
                </Button>
              </>
            }
          >
            {fill(t(B.autoKeeps), { name: replacing.name })}
          </Dialog>
        </Suspense>
      )}
      {refused > 0 && (
        <Suspense fallback={null}>
          <ToastRegion>
            <Toast key={refused} text={t(NOT_STORED_TEXT)} />
          </ToastRegion>
        </Suspense>
      )}

      {/* The measurement notice in full, once; the steps and the part list show it on one line (C9). The
          percentages keep their room while the index loads (no layout shift). */}
      <div className="notice-warn flex gap-2 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex flex-col gap-1">
          <span>{t(B.notice)}</span>
          <span className={index ? undefined : 'invisible'} aria-hidden={index ? undefined : true}>
            {t(B.known)} {t(B.knownGpu)} <span className="tabular-nums">{index?.coverage.gpu ?? 88}</span>%, {t(B.knownCase)}{' '}
            <span className="tabular-nums">{index?.coverage.case ?? 88}</span>%, {t(B.knownCooler)}{' '}
            <span className="tabular-nums">{index?.coverage.cooler ?? 88}</span>%.
          </span>
        </span>
      </div>
    </div>
  );
}
