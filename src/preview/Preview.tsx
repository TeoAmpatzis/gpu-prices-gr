// /_preview — the v2 component catalogue (Phase 1, plan A3/B). Development builds only: main.tsx imports
// this module behind `import.meta.env.DEV`, so production builds don't contain it (checked by
// scripts/phase1/check-no-preview.mjs).
//
// URL: /_preview?lang=el|en[&frame=shell|parts|search|sheet|builder]
import './preview.css';
import { useEffect, useMemo, useState } from 'react';
import { setLang, tr, useLang } from '../lib/i18n';
import { withoutTransitions } from '../shell/controls';
import { Button } from '../ui/Button';
import { Toast, ToastRegion } from '../ui/overlays';
import { UI } from '../ui/strings';
import {
  ButtonsSection,
  ChipsSection,
  CompatSection,
  FiltersSection,
  ListsSection,
  OverlaysSection,
  PagingSection,
  PriceSection,
  SpecsSection,
  StatesSection,
} from './ComponentSections';
import { usePreviewData } from './data';
import { ColoursSection, LogosSection, TypeSection } from './IdentitySections';
import { Segmented } from './kit';
import { FrameView, NavSection, NotFoundSample, ShellSection, searchSetup } from './ShellSections';
import { P } from './strings';

interface State {
  frame: string | null;
}

/** Reads the URL once; its language is applied before the first render (not stored). */
function initial(): State {
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang');
  if (lang === 'el' || lang === 'en') document.documentElement.lang = lang;
  return { frame: p.get('frame') };
}

const NAV = [
  ['logos', P.sLogos],
  ['colours', P.sColours],
  ['type', P.sType],
  ['buttons', P.sButtons],
  ['chips', P.sChips],
  ['compat', P.sCompat],
  ['price', P.sPrice],
  ['specs', P.sSpecs],
  ['filters', P.sFilters],
  ['lists', P.sLists],
  ['paging', P.sPaging],
  ['overlays', P.sOverlays],
  ['states', P.sStates],
  ['nav', P.sNav],
  ['shell', P.sShell],
] as const;

export default function Preview() {
  const [s] = useState(initial);
  const lang = useLang();
  const d = usePreviewData();
  const [toast, setToast] = useState<{ id: number; text: string; undo?: boolean } | null>(null);
  const notify = (text: string, undo?: boolean) => setToast((t) => ({ id: (t?.id ?? 0) + 1, text, undo }));
  // Each toast hides itself after 4 s (a newer one restarts the timer).
  const toastId = toast?.id;
  useEffect(() => {
    if (toastId == null) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toastId ? null : t)), 4000);
    return () => clearTimeout(timer);
  }, [toastId]);

  // The URL always describes what is shown, so any view can be reopened or screenshotted.
  useEffect(() => {
    const p = new URLSearchParams();
    if (s.frame) p.set('frame', s.frame);
    p.set('lang', lang);
    history.replaceState(null, '', `${location.pathname}?${p}`);
  }, [s, lang]);

  useEffect(() => {
    document.title = `${tr(lang, P.pageTitle)} — BuildDraft.gr`;
  }, [lang]);

  const setup = useMemo(() => (d ? searchSetup(d, notify, lang) : null), [d, lang]);

  const toastEl = toast && (
    <ToastRegion>
      <Toast
        key={toast.id}
        tone={toast.undo ? 'info' : 'success'}
        text={toast.text}
        action={
          toast.undo ? (
            <Button variant="ghost" size="sm" onClick={() => setToast(null)}>
              {tr(lang, UI.undo)}
            </Button>
          ) : undefined
        }
      />
    </ToastRegion>
  );

  if (s.frame) {
    return (
      <div className="min-h-screen bg-page text-fg">
        {d && setup ? <FrameView view={s.frame} d={d} setup={setup} /> : <p className="p-4 text-sm text-faint">{tr(lang, P.loadingData)}</p>}
        {toastEl}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-fg">
      <div className="sticky top-0 z-30 border-b border-line bg-panel/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-sm font-semibold">
              BuildDraft.gr · {tr(lang, P.pageTitle)}
            </p>
            <Segmented
              label={P.language}
              value={lang}
              onChange={(l) => withoutTransitions(() => setLang(l))}
              options={[
                { v: 'el', label: 'ΕΛ' },
                { v: 'en', label: 'EN' },
              ]}
            />
          </div>
          <nav aria-label={tr(lang, P.sections)} className="ui-chip-row -mx-1 px-1 text-sm">
            {NAV.map(([id, t]) => (
              <a key={id} href={`#${id}`} className="tap shrink-0 rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg">
                {tr(lang, t)}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-8">
        <header>
          <h1 className="text-display font-semibold">{tr(lang, P.pageTitle)}</h1>
          <p className="mt-2 max-w-3xl text-muted">{tr(lang, P.intro)}</p>
        </header>
        <LogosSection />
        <ColoursSection />
        <TypeSection />
        <ButtonsSection />
        {!d || !setup ? (
          <p className="text-sm text-faint">{tr(lang, P.loadingData)}</p>
        ) : (
          <>
            <ChipsSection d={d} />
            <CompatSection d={d} />
            <PriceSection d={d} />
            <SpecsSection d={d} />
            <FiltersSection d={d} />
            <ListsSection d={d} />
            <PagingSection />
            <OverlaysSection d={d} notify={notify} />
            <StatesSection notFound={<NotFoundSample d={d} setup={setup} />} />
            <NavSection d={d} setup={setup} />
            <ShellSection d={d} setup={setup} />
          </>
        )}
      </main>
      {toastEl}
    </div>
  );
}
