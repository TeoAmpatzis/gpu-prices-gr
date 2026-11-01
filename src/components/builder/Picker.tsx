import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import type { AutoFile, BaseListing, CaseListing, Category, CpuListing, FanListing } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import type { Model } from '../../lib/data';
import { candidates, cpuCards, type Slot } from '../../lib/builderData';
import type { Line } from '../../lib/buildStore';
import { ENGINE_TEXT } from '../../lib/builderEngine';
import { fanPlan, planPackOrder } from '../../lib/fanPlan';
import { ratingOf, stepReason, LABEL_TEXT, type Rating } from '../../lib/fitLabel';
import { useStepVerdicts, type AnyModel, type BuilderState } from '../../lib/builderState';
import { pickerOrder, loadAuto } from '../../lib/recommend';
import { toUseKey } from '../../lib/useMinimums';
import { SORTS, sorter, type SortBy } from '../../lib/wizard';
import { pickerMatches } from '../../lib/search';
import { T, tr, type Lang, type Text } from '../../lib/i18n';
import { CaseFansLine } from './FanAdvice';
import PartCard from './PartCard';
import CpuCard from './CpuCard';
import { plural } from '../../ui/strings';
import { ErrorState } from '../../ui/states';
import { BUILDER as B } from '../../ui/builderStrings';
const PAGE = 24;
const HIDDEN = { el: ['ασύμβατο κρυμμένο', 'ασύμβατα κρυμμένα'] as [string, string], en: ['incompatible hidden', 'incompatible hidden'] as [string, string] };
const G = {
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

/** A part of the step with the engine's label, and whether "Only compatible" hides it (pickHide: a real "no"). */
type Rated = { m: Model<BaseListing>; rating: Rating; hide: boolean };
const NO_RATING: Rating = { fit: null, reasons: [] };

export default function Picker({ slot, state, auto = null, lang, line = slot, onPicked }: { slot: Slot; state: BuilderState; auto?: AutoFile | null; lang: Lang; line?: Line; onPicked?: () => void }) {
  const t = (x: Text) => tr(lang, x);
  const [loadedAuto, setLoadedAuto] = useState<AutoFile | null>(null);
  useEffect(() => {
    if (!state.builtAt || state.prefs.budget == null) return;
    let live = true;
    void loadAuto(state.builtAt).then((value) => { if (live) setLoadedAuto(value); }, () => {});
    return () => { live = false; };
  }, [state.builtAt, state.prefs.budget]);
  const effectiveAuto = auto ?? loadedAuto;
  const { models, build, update, prefs, extraVersion, wantSlot } = state;
  // Each step's parts are their own file (/data/builder/<slot>.json), fetched when the step opens; then the pick worker
  // checks them against the build (the first answer is waited for, later ones replace the labels when they arrive).
  const { verdicts } = useStepVerdicts(state, slot, line);
  const failed = state.slotFailed(slot);
  const loading = state.loading || !state.slotReady(slot) || verdicts === null;
  useEffect(() => {
    if (!state.loading) wantSlot(slot);
    // A failed file waits for the retry button; the state's callback changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- request only on opening a step or loading the index
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
      const key = line === 'storage2' ? `${m.key}#2` : m.key;
      const v = verdicts.get(key);
      return { m, rating: v ? ratingOf(v.findings, key, state.parts) : NO_RATING, hide: v?.hide ?? false };
    });
  }, [models, slot, verdicts, state.parts, line]);
  // The one "not verified" reason of the step (#14), said above the cards instead of on each.
  const reason = useMemo(() => (verdicts ? stepReason(verdicts) : null), [verdicts]);
  // Recommended: by the use and the budget left (recommend.ts, task 10); Price and Value as before.
  const useKey = toUseKey(prefs.use, prefs.res);
  const pricedBuild = useMemo(() => Object.fromEntries(state.resolvedLines.filter((r) => r.line !== 'storage2').map((r) => [r.line, { ...r.model, cheapest: { ...r.model.cheapest, price: r.total } }])), [state.resolvedLines]);
  // The other drive is a distinct line even though Recommended's plan has one storage allocation.
  const otherDrive = state.resolvedLines.find((r) => r.line === (line === 'storage2' ? 'storage' : 'storage2'))?.total ?? 0;
  const orderBudget = prefs.budget == null ? null : prefs.budget - otherDrive;
  const order = useMemo(
    () =>
      sort === 'recommended'
        ? pickerOrder(slot, rated, { auto: effectiveAuto, use: useKey, budget: orderBudget, build: pricedBuild, psuWatts: state.psuWatts })
        : sorter(slot, rated.map((r) => r.m), sort),
    [slot, rated, sort, effectiveAuto, useKey, orderBudget, pricedBuild, state.psuWatts],
  );
  const current = state.resolvedLines.find((r) => r.line === line);
  const left = prefs.budget == null ? null : prefs.budget - state.resolvedTotal + (current?.total ?? 0);

  const { shown, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const search = cfg as unknown as { searchText: (l: BaseListing) => string };
    let list = rated.filter((r) => !q || r.m.listings.some((l) => pickerMatches(search.searchText(l), q)));
    const clashes = list.filter((r) => r.hide).length;
    if (onlyCompatible) list = list.filter((r) => !r.hide);
    if (verifiedOnly) list = list.filter((r) => r.rating.fit !== 'unverified');
    if (withinBudget && left != null) list = list.filter((r) => r.m.cheapest.price * (slot === 'fan' ? state.fanQty : 1) <= left);
    if (slot === 'fan' && picked && sizes.length) list = list.filter((r) => sizes.includes((r.m as Model<FanListing>).cheapest.size));
    if (slot === 'fan' && fanType) list = list.filter((r) => (r.m as Model<FanListing>).cheapest.fanType === fanType);
    // "Fit not verified" after the verified parts (owner answers 1–4); clashes (shown when "Only compatible" is off)
    // go last, greyed out.
    const rank = (r: Rated) => (r.hide ? 2 : r.rating.fit === 'unverified' ? 1 : 0);
    return { shown: [...list].sort((a, b) => rank(a) - rank(b) || (slot === 'fan' ? planPackOrder(sizes, (a.m.cheapest as FanListing).size) - planPackOrder(sizes, (b.m.cheapest as FanListing).size) : 0) || order(a, b)), hidden: clashes };
    // extraVersion: search titles mutate existing rows later (/data/builder/<slot>-extra.json).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- those row mutations require a search refresh
  }, [rated, order, query, onlyCompatible, verifiedOnly, withinBudget, left, cfg, extraVersion, slot, sizes, fanType, picked, state.fanQty]);
  // Back to one page when the filters change.
  const filterKey = JSON.stringify([query, sort, onlyCompatible, verifiedOnly, withinBudget, sizes, fanType, picked]);
  const [paged, setPaged] = useState({ key: filterKey, n: PAGE });
  const limit = paged.key === filterKey ? paged.n : PAGE;
  // CPUs are paged by card (one chip, its versions inside), not by version.
  const cpuGroups = useMemo(() => (slot === 'cpu' ? cpuCards(shown.map((r) => r.m) as Model<CpuListing>[]) : null), [slot, shown]);
  const cardCount = cpuGroups ? cpuGroups.length : shown.length;

  const chosen = (line === 'storage2' ? state.storage2 : build[slot]) as AnyModel | undefined;
  const pick = (m: AnyModel | undefined) => {
    if (line === 'storage2') state.setStorage2(m ?? null);
    else update({ ...build, [slot]: m });
    onPicked?.();
  };
  const renderCard = (r: Rated) => (
              <PartCard
                key={r.m.key}
                slot={slot}
                m={r.m as AnyModel}
                rating={r.rating}
                hide={r.hide}
                reason={reason}
                chosen={chosen?.key === r.m.key}
                onChoose={() => pick(r.m)}
                onRemove={() => pick(undefined)}
                lang={lang}
                state={state}
                line={line}
              >
                {slot === 'case' && <CaseFansLine c={r.m as Model<CaseListing>} build={build} watts={state.psuWatts} lang={lang} />}
              </PartCard>
            
  );

  return (
    <div className="flex flex-col gap-3" data-picker={line}>
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
            {cpuGroups ? cpuGroups.slice(0, limit).map((group) => (
              <CpuCard key={group.chip} chip={group.chip}>{group.versions.map((m) => renderCard(shown.find((r) => r.m.key === m.key)!))}</CpuCard>
            )) : shown.slice(0, limit).map(renderCard)}
          </ul>
          {cardCount > limit && (
            <button
              type="button"
              onClick={() => setPaged({ key: filterKey, n: limit + PAGE })}
              className="tap mx-auto rounded-lg px-4 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10"
            >
              {t(G.showMore)} ({cardCount - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}
