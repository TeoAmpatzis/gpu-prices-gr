// The product page's "fits your build" (v2 step 4, task 8; docs/redesign-v2.md "Σελίδα προϊόντος" part 4), the part
// loaded after the first paint (fitUi.useProductFit renders it lazily): the check and the section under the price
// history (only with a saved build). The check is pick mode's (useBuildCheck: stale saved parts refreshed from the
// compat chunks first (A7), then the pick worker), with the model's own candidates (ModelEntry.parts: a card per
// offer, a CPU per Box / Tray, any other part the model). Adding writes the same StoredPart as pick mode's "Add to
// build" (key, engine fields, data date), and the page stays where it is: a confirmation with a link to the builder.
import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addToBuild, cpuVersion, fitCandidates, fitView, mainCandidate, slotAction, withVersion, type FitState } from '../../lib/buildFit';
import { tr, useLang, type Text } from '../../lib/i18n';
import type { Slot } from '../../lib/slots';
import { useBuildCheck } from '../../lib/useBuildCheck';
import { CATS } from '../../shell/nav';
import type { ModelEntry } from '../../types';
import { Badge, CompatBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FIT } from '../../ui/fitStrings';
import { PICK } from '../../ui/pickStrings';
import { plural, UI } from '../../ui/strings';
import { Action, FIT_TITLE_ID, FitBadge, Findings, InBuild, OFFERS_TITLE_ID, WORD, type FitCtx, type ModelFit } from './fitUi';

/** The check of the model's candidates against the saved build, as one memoised object per change. */
export function useModelFit(slot: Slot, entry: ModelEntry, builtAt: string): ModelFit {
  const cands = useMemo(() => fitCandidates(slot, entry), [slot, entry]);
  const parts = useMemo(() => cands.map((c) => c.part), [cands]);
  // No build: no check and no worker (no section); `full`: notes and unknowns too ("Fits" only when none is left).
  const { stored, status, verdicts, build, missing, unchecked } = useBuildCheck(slot, builtAt, parts, { full: true, skipEmpty: true });
  const [added, setAdded] = useState<{ key: string; replaced: boolean; name: Text } | null>(null);
  const add = useCallback(
    (key: string) => {
      const c = cands.find((x) => x.key === key);
      if (!c?.offered) return;
      const name = slot === 'cpu' ? withVersion(c.part.name, key) : c.part.name;
      setAdded({ key, replaced: addToBuild(slot, c, builtAt) !== null, name });
    },
    [cands, slot, builtAt],
  );
  return useMemo(() => {
    // Saved parts this slot's rules read that couldn't be checked: never a plain "Fits" then.
    const gaps = missing.length + unchecked.length > 0;
    const view = (key: string) => fitView(status, verdicts?.get(key), build, gaps);
    return {
      stored,
      status,
      build,
      missing,
      unchecked,
      cands,
      candidate: (key: string) => cands.find((c) => c.key === key),
      view,
      action: (key: string) => slotAction(stored, slot, key),
      main: slot === 'gpu' ? undefined : mainCandidate(cands, entry.listings, (k) => view(k).state === 'blocked', stored.parts[slot]?.key),
      added: added && stored.parts[slot]?.key === added.key ? added : null,
      add,
    };
  }, [status, verdicts, build, missing, unchecked, cands, stored, slot, entry.listings, added, add]);
}

/** The lazy part's root: runs the check, hands it to the page (header, offers) and renders the section. */
export default function FitRunner({
  slot,
  entry,
  builtAt,
  show,
  onFit,
  add,
}: {
  slot: Slot;
  entry: ModelEntry;
  builtAt: string;
  show: boolean;
  onFit: (fit: ModelFit) => void;
  /** The page's add (fitUi.useProductFit: moves the focus to what replaces the clicked button). */
  add: FitCtx['add'];
}) {
  const fit = useModelFit(slot, entry, builtAt);
  useEffect(() => onFit(fit), [fit, onFit]);
  return show ? <BuildFitSection fit={fit} slot={slot} add={add} /> : null;
}

/** Part 4: the verdict against the saved build and the add / replace button. */
function BuildFitSection({ fit, slot, add }: { fit: ModelFit; slot: Slot; add: FitCtx['add'] }) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const ctx: FitCtx = { slot, stored: fit.stored, show: true, fit, add };
  const status =
    fit.status === 'timeout'
      ? t(FIT.notFinished)
      : fit.status !== 'ready'
        ? t(PICK.checking)
        : fit.build.length === 0
          ? t(fit.missing.length + fit.unchecked.length > 0 ? FIT.noneChecked : FIT.alone)
          : `${t(PICK.checkedWith)} ${plural(lang, fit.build.length, UI.partForms)}.`;
  const one = (s: Slot) => t(CATS[s].one ?? CATS[s].name);

  let body = null;
  if (slot === 'gpu') {
    const counts = new Map<FitState, number>();
    for (const c of fit.cands) {
      const s = fit.view(c.key).state;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const order = ['blocked', 'issues', 'partly', 'fits'] as const;
    const added = fit.added && fit.cands.find((c) => c.key === fit.added!.key);
    body = (
      <>
        {fit.status === 'ready' && fit.build.length > 0 && (
          <ul data-fit-counts className="flex max-w-full flex-wrap gap-x-4 gap-y-2">
            {order
              .filter((s) => counts.get(s))
              .map((s) => (
                // Wraps: a long Greek verdict + "141 προσφορές τιμής" is wider than the card at 360 px (step 4 gate).
                <li key={s} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-fg-soft">
                  <CompatBadge level={WORD[s].level} word={WORD[s].word} />
                  <span className="ui-num">{plural(lang, counts.get(s)!, UI.offerForms)}</span>
                </li>
              ))}
          </ul>
        )}
        <p className="text-sm text-muted">{t(FIT.perCard)}</p>
        {added ? (
          <InBuild p={ctx} keyOf={added.key} lang={lang} place="section" />
        ) : (
          <Button variant="secondary" size="sm" icon={ArrowDown} className="tap max-w-full whitespace-normal py-1.5 text-left" onClick={() => document.getElementById(OFFERS_TITLE_ID)?.focus()}>
            {t(FIT.pickCard)}
          </Button>
        )}
      </>
    );
  } else if (fit.main) {
    const key = fit.main.key;
    const v = fit.view(key);
    const a = fit.action(key);
    const version = slot === 'cpu' && fit.cands.length > 1 ? cpuVersion(key) : null;
    body = (
      <>
        <div data-fit={v.state} className="flex min-h-7 flex-col items-start gap-2">
          {/* No headline for 'issues': each finding has its own level's badge (the same word). */}
          {v.state !== 'alone' && v.state !== 'issues' && <FitBadge v={v} />}
          <Findings list={v.findings} lang={lang} fixes />
          <Findings list={v.notes} lang={lang} />
        </div>
        {version && <p className="text-sm text-muted">{t(version === 'box' ? FIT.versionBox : FIT.versionTray)}</p>}
        {(a.kind === 'replace' || a.kind === 'switch') && a.name && (
          <p className="text-sm text-fg-soft [overflow-wrap:anywhere]">
            {t(FIT.nowInBuild)} <span className="font-medium text-fg">{t(a.name)}</span>
          </p>
        )}
        <Action p={ctx} keyOf={key} lang={lang} place="section" />
      </>
    );
  }

  return (
    <section id="build-fit" aria-labelledby={FIT_TITLE_ID} className="flex flex-col gap-3" data-build-fit>
      <h2 id={FIT_TITLE_ID} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
        {t(FIT.title)}
      </h2>
      <div className="ui-card flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-muted" data-fit-status>
          {status}
        </p>
        {fit.missing.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {fit.missing.map((m) => (
              <li key={m.slot} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-fg-soft">
                <Badge tone="warning">{t(PICK.noLongerAvailable)}</Badge>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {one(m.slot)}: {m.name} ({t(PICK.notChecked)})
                </span>
              </li>
            ))}
          </ul>
        )}
        {fit.unchecked.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {fit.unchecked.map((m) => (
              <li key={m.slot} className="text-fg-soft [overflow-wrap:anywhere]">
                {t(PICK.couldNotCheck)} {one(m.slot)}: {m.name}
              </li>
            ))}
          </ul>
        )}
        {body}
      </div>
    </section>
  );
}
