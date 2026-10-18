// The product page's "fits your build" (v2 step 4, task 8), the part in the page's first paint: the saved build (read at
// once, so every line and button that depends on it is laid out from the first paint and nothing shifts), the header's
// "Add to build" and, for graphics cards, each offer's verdict line and button. The check itself (useBuildCheck, the
// builder's rules, the pick worker) is BuildFit.tsx, a chunk loaded after the first paint (byte rule 11): until it
// answers, the lines say "Checking…" and the buttons wait. No engine and no builder code in this file.
import { ArrowDown, Check, ExternalLink, Plus, Replace } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Finding, Part } from '../../engine';
import type { FitCandidate, FitState, FitView, SlotAction } from '../../lib/buildFit';
import { onBuildChange, readBuild, type StoredBuild } from '../../lib/buildStore';
import { tr, useLang, type Lang, type Text } from '../../lib/i18n';
import { idle } from '../../lib/slices';
import { CATEGORY_RULE_SLOTS, candidateKey, cpuVersion, type Slot } from '../../lib/slots';
import type { BaseListing, ModelEntry } from '../../types';
import { Badge, CompatBadge, type CompatLevel } from '../../ui/Badge';
import { Button, LinkButton } from '../../ui/Button';
import { FIT, REPLACE } from '../../ui/fitStrings';
import { PICK } from '../../ui/pickStrings';

/** The section's heading: the header's "Add to build" moves the focus (and the page) there when a build exists. */
export const FIT_TITLE_ID = 'build-fit-title';
/** The shops table's heading (OffersTable): a graphics card's header button goes there. */
export const OFFERS_TITLE_ID = 'offers-title';

/** What the check (BuildFit.useModelFit) gives the page; one object per change (memoised), null until it has loaded. */
export interface ModelFit {
  /** The saved build as the check read it. */
  stored: StoredBuild;
  status: 'loading' | 'checking' | 'ready' | 'timeout';
  /** The build parts the candidates are checked against (other slots, those this slot's rules read). */
  build: Part[];
  missing: { slot: Slot; key: string; name: string }[];
  unchecked: { slot: Slot; key: string; name: string }[];
  cands: FitCandidate[];
  candidate: (key: string) => FitCandidate | undefined;
  view: (key: string) => FitView;
  action: (key: string) => SlotAction;
  /** The candidate of the page's one button (every slot but graphics cards; a CPU's Box or Tray as in pick mode). */
  main: FitCandidate | undefined;
  /** The last add on this page (for the confirmation), while that part is still the one saved; `name` = its name. */
  added: { key: string; replaced: boolean; name: string } | null;
  add: (key: string) => void;
}

/** Where an add was made: the element that replaces the clicked button there takes the focus (useFocusAfterAdd). */
export type AddPlace = 'header' | 'section' | 'row' | 'card';
let focusNext: string | null = null;

/**
 * A ref for the wrapper of what replaces an "Add" button after the add ("Open the build", "In build"): when that add
 * was made right there, the focus moves to its link (else it would be lost with the clicked button, on <body>).
 */
export function useFocusAfterAdd(place: AddPlace, key: string) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el || focusNext !== `${place}:${key}`) return;
      focusNext = null;
      (el.querySelector<HTMLElement>('a, button') ?? el).focus();
    },
    [place, key],
  );
}

const FitRunner = lazy(() => import('./BuildFit'));

export interface ProductFit {
  slot: Slot;
  stored: StoredBuild;
  /** The saved build has a part: the section shows. */
  show: boolean;
  /** The build has parts this slot's rules read: each card's verdict line is kept from the first paint. */
  lines: boolean;
  /** The builder's key of a listing (slots.candidateKey). */
  keyOf: (l: BaseListing) => string;
  /** The page's one button until the check says otherwise: the saved key when it is one of this model's, else the
   * cheapest offer's (as BuildFit's mainCandidate). */
  firstKey: string;
  fit: ModelFit | null;
  /** Adds a candidate (waits for the check's code if it hasn't arrived yet: at most one queued add); `place` gets the
   * focus afterwards. */
  add: (key: string, place: AddPlace) => void;
  /** The check, rendered where the section goes (after the first paint). */
  runner: ReactNode;
}

/** The page's fit state: the saved build now, the check's code after the first paint. */
export function useProductFit(slot: Slot, entry: ModelEntry, builtAt: string): ProductFit {
  const [stored, setStored] = useState(readBuild);
  useEffect(() => onBuildChange(() => setStored(readBuild())), []);
  const [go, setGo] = useState(false);
  useEffect(() => idle(() => setGo(true)), []);
  const [fit, setFit] = useState<ModelFit | null>(null);
  const queued = useRef<string | null>(null);
  useEffect(() => {
    if (fit && queued.current) {
      fit.add(queued.current);
      queued.current = null;
    }
  }, [fit]);
  const add = useCallback(
    (key: string, place: AddPlace) => {
      focusNext = `${place}:${key}`;
      if (fit) fit.add(key);
      else queued.current = key;
    },
    [fit],
  );
  const keyOf = useCallback((l: BaseListing) => candidateKey(slot, l as BaseListing & { coolerIncluded?: boolean | null }, entry.key), [slot, entry.key]);
  const show = Object.keys(stored.parts).length > 0;
  return {
    slot,
    stored,
    show,
    lines: show && CATEGORY_RULE_SLOTS[slot].some((s) => stored.parts[s]),
    keyOf,
    firstKey: entry.listings.some((l) => keyOf(l) === stored.parts[slot]?.key) ? stored.parts[slot]!.key : keyOf(entry.listings[0]),
    fit,
    add,
    runner: go ? (
      <Suspense fallback={null}>
        <FitRunner slot={slot} entry={entry} builtAt={builtAt} show={show} onFit={setFit} add={add} />
      </Suspense>
    ) : null,
  };
}

/** What the buttons need: the page's (ProductFit) or, inside the section, the check's own. */
export type FitCtx = Pick<ProductFit, 'slot' | 'stored' | 'show' | 'fit' | 'add'>;

/** Add, replace, switch version or already there: the check's answer, or the saved build's slot until it has loaded. */
function kindOf(p: FitCtx, key: string): SlotAction['kind'] {
  if (p.fit) return p.fit.action(key).kind;
  const cur = p.stored.parts[p.slot];
  if (!cur) return 'add';
  if (cur.key === key) return 'in-build';
  const chip = (k: string) => k.slice(0, k.lastIndexOf('|'));
  return p.slot === 'cpu' && chip(cur.key) === chip(key) ? 'switch' : 'replace';
}

/** The button's words: add, replace your <part>, or switch to the Box / Tray version of the same CPU. */
function actionLabel(p: FitCtx, kind: SlotAction['kind'], key: string, card: boolean): Text {
  if (kind === 'replace') return REPLACE[p.slot];
  if (kind === 'switch') {
    const to = cpuVersion(key);
    return to === 'box' ? FIT.switchBox : to === 'tray' ? FIT.switchTray : FIT.switchThis;
  }
  return card ? PICK.addCard : PICK.add;
}

const offered = (p: FitCtx, key: string) => !p.fit || p.fit.candidate(key)?.offered !== false;
const CHECKING: FitView = { state: 'checking', findings: [], notes: [], canAdd: false };
const viewOf = (p: FitCtx, key: string): FitView => (p.fit ? p.fit.view(key) : CHECKING);

export const WORD: Record<Exclude<FitState, 'checking' | 'timeout' | 'alone' | 'unchecked'>, { level: CompatLevel; word: Text }> = {
  fits: { level: 'pass', word: FIT.fits },
  partly: { level: 'note', word: FIT.partly },
  issues: { level: 'warning', word: FIT.issues },
  blocked: { level: 'error', word: FIT.blocked },
};

/** The one-line verdict: colour, icon and word (CompatBadge), or a neutral word while checking / when nothing is. */
export function FitBadge({ v }: { v: FitView }) {
  const lang = useLang();
  if (v.state === 'checking' || v.state === 'timeout' || v.state === 'alone' || v.state === 'unchecked') {
    const word = v.state === 'checking' ? FIT.checking : v.state === 'alone' ? FIT.nothingToCheck : FIT.notChecked;
    return <Badge tone="neutral">{tr(lang, word)}</Badge>;
  }
  return <CompatBadge level={WORD[v.state].level} word={WORD[v.state].word} />;
}

/** The engine's level as a badge (an unknown is shown as a note, engine/util.shownLevel). */
const levelOf = (s: Finding['status']): CompatLevel => (s === 'unknown' ? 'note' : s);

/** Each finding once with its level's badge and, where the engine gives one, what to do about it. */
export function Findings({ list, lang, fixes = false }: { list: Finding[]; lang: Lang; fixes?: boolean }) {
  if (!list.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((f) => (
        <li key={`${f.rule}-${f.message.en}`} data-finding={f.rule} className="flex flex-col items-start gap-0.5 text-sm">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-fg-soft">
            <CompatBadge level={levelOf(f.status)} />
            <span className="min-w-0 [overflow-wrap:anywhere]">{tr(lang, f.message)}</span>
          </span>
          {fixes && f.fix && <span className="text-muted [overflow-wrap:anywhere]">{tr(lang, f.fix)}</span>}
        </li>
      ))}
    </ul>
  );
}

/** "Added to your build · Open the build" (or "It's in your build"): the page stays, the builder is one tap away. */
export function InBuild({ p, keyOf, lang, place }: { p: FitCtx; keyOf: string; lang: Lang; place: AddPlace }) {
  const added = p.fit?.added;
  const just = added?.key === keyOf;
  const focus = useFocusAfterAdd(place, keyOf);
  return (
    <div ref={focus} data-in-build className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-success-fg">
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
        {tr(lang, just ? (added!.replaced ? FIT.replaced : FIT.added) : FIT.inBuild)}
      </span>
      <LinkButton href="/builder" variant="secondary" size="sm" icon={ExternalLink} className="tap">
        {tr(lang, FIT.openBuild)}
      </LinkButton>
    </div>
  );
}

/**
 * The add / replace button of one candidate (full words), or where it stands (in the build, not offered). With a saved
 * build it waits for the verdict (busy), and a part the check rules out gets no working button, as in pick mode.
 */
export function Action({ p, keyOf, lang, place }: { p: FitCtx; keyOf: string; lang: Lang; place: 'section' | 'card' }) {
  if (!offered(p, keyOf)) return <p className="text-sm text-muted">{tr(lang, PICK.notOffered)}</p>;
  const kind = kindOf(p, keyOf);
  if (kind === 'in-build') return <InBuild p={p} keyOf={keyOf} lang={lang} place={place} />;
  const v = viewOf(p, keyOf);
  const checking = p.show && v.state === 'checking';
  return (
    <Button
      variant="primary"
      size="sm"
      icon={kind === 'add' ? Plus : Replace}
      className="tap"
      disabled={p.show && !v.canAdd && !checking}
      loading={checking}
      data-fit-action={kind}
      onClick={() => p.add(keyOf, place)}
    >
      {tr(lang, actionLabel(p, kind, keyOf, place === 'card'))}
    </Button>
  );
}

const focusOn = (id: string) => document.getElementById(id)?.focus();

/** A box (no layout of its own) whose link takes the focus after an add made at `place` (useFocusAfterAdd). */
function AfterAdd({ place, k, children }: { place: AddPlace; k: string; children: ReactNode }) {
  const ref = useFocusAfterAdd(place, k);
  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  );
}

/**
 * The header's button (part 1). Graphics cards: "Pick a card from the shops" (the builder takes a card, so the button
 * is on each offer; this one goes there). Other parts: "Add to build" — with no saved build it adds at once (nothing to
 * check or replace; the section then appears with the confirmation); with one it goes to the section first, which
 * shows the verdict and what it would replace before anything changes.
 */
export function HeaderFit({ p }: { p: ProductFit }) {
  const lang = useLang();
  const added = p.fit?.added;
  let body: ReactNode;
  if (p.slot === 'gpu') {
    body =
      p.fit && !p.fit.cands.some((c) => c.offered) ? (
        <p className="max-w-xs text-sm text-muted">{tr(lang, PICK.notOffered)}</p>
      ) : (
        <Button variant="secondary" icon={ArrowDown} className="tap max-w-full whitespace-normal py-2 text-left" data-fit-header="cards" onClick={() => focusOn(OFFERS_TITLE_ID)}>
          {tr(lang, FIT.pickCard)}
        </Button>
      );
  } else {
    const key = p.fit?.main?.key ?? p.firstKey;
    if (!offered(p, key)) body = <p className="max-w-xs text-sm text-muted">{tr(lang, PICK.notOffered)}</p>;
    else if (kindOf(p, key) === 'in-build')
      body = (
        <AfterAdd place="header" k={key}>
          <LinkButton href="/builder" variant="secondary" icon={Check} className="tap" data-fit-header="in-build">
            {tr(lang, FIT.inBuild)}
          </LinkButton>
        </AfterAdd>
      );
    else
      body = (
        <Button variant="secondary" icon={Plus} className="tap" data-fit-header="add" onClick={() => (p.show ? focusOn(FIT_TITLE_ID) : p.add(key, 'header'))}>
          {tr(lang, PICK.add)}
        </Button>
      );
  }
  return (
    <>
      {body}
      {/* Always in the page, so screen readers announce an add made anywhere on it. */}
      <p role="status" className="sr-only">
        {added ? tr(lang, added.replaced ? FIT.replacedNamed : FIT.addedNamed).replace('{name}', added.name) : ''}
      </p>
    </>
  );
}

/** A card's verdict line on its offer (graphics cards): laid out from the first paint, so nothing shifts; "Why?" opens it. */
export function OfferFitLine({ p, l }: { p: ProductFit; l: BaseListing }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  const key = p.keyOf(l);
  const v = useMemo(() => viewOf(p, key), [p, key]);
  if (!p.lines) return null;
  const more = v.findings.length + v.notes.length;
  return (
    <div data-offer-fit={v.state} className="mt-1.5">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <FitBadge v={v} />
        {/* Always laid out (hidden until there is something to explain), so the line never changes height. */}
        <button
          type="button"
          className={`tap px-1 text-sm font-medium text-accent underline-offset-2 hover:underline ${more > 0 ? '' : 'invisible'}`}
          aria-expanded={open}
          aria-controls={id}
          aria-hidden={more > 0 ? undefined : true}
          tabIndex={more > 0 ? undefined : -1}
          onClick={() => setOpen(!open)}
        >
          {tr(lang, FIT.why)}
        </button>
      </div>
      {open && more > 0 && (
        <div id={id} className="mt-2 whitespace-normal">
          <Findings list={[...v.findings, ...v.notes]} lang={lang} />
        </div>
      )}
    </div>
  );
}

/** A card's add / replace button on its offer: one word in the table (`short`, the full words for screen readers). */
export function OfferFitAction({ p, l, short = false }: { p: ProductFit; l: BaseListing; short?: boolean }) {
  const lang = useLang();
  const key = p.keyOf(l);
  if (!offered(p, key)) return null;
  if (!short) return <Action p={p} keyOf={key} lang={lang} place="card" />;
  const kind = kindOf(p, key);
  if (kind === 'in-build') {
    return (
      <AfterAdd place="row" k={key}>
        <LinkButton href="/builder" variant="secondary" size="sm" icon={Check} className="tap" aria-label={tr(lang, FIT.inBuildLabel)}>
          {tr(lang, FIT.inBuildShort)}
        </LinkButton>
      </AfterAdd>
    );
  }
  const v = viewOf(p, key);
  const checking = p.show && v.state === 'checking';
  return (
    <Button
      variant="primary"
      size="sm"
      icon={kind === 'replace' ? Replace : Plus}
      className="tap"
      disabled={p.show && !v.canAdd && !checking}
      loading={checking}
      data-fit-action={kind}
      aria-label={`${tr(lang, kind === 'replace' ? FIT.replaceCardLabel : FIT.addCardLabel)}: ${l.title}`}
      onClick={() => p.add(key, 'row')}
    >
      {tr(lang, kind === 'replace' ? FIT.replaceShort : FIT.addShort)}
    </Button>
  );
}
