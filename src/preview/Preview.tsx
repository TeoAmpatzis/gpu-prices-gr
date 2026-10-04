// /_preview — the v2 component catalogue (Phase 1, plan A3/B). Development builds only: main.tsx imports
// this module behind `import.meta.env.DEV`, so production builds don't contain it (checked by
// scripts/phase1/check-no-preview.mjs).
//
// URL: /_preview?logo=a|b|c&palette=blue|indigo&theme=light|dark&lang=el|en[&frame=shell|parts|search|sheet|builder]
import './preview.css';
import { useEffect, useMemo, useState } from 'react';
import { setLang, tr, useLang } from '../lib/i18n';
import { setTheme, useTheme } from '../lib/theme';
import { withoutTransitions } from '../shell/controls';
import { Button } from '../ui/Button';
import { faviconSvg, type LogoKind } from '../ui/logos';
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
import { Segmented, hex, useTokens, type Palette } from './kit';
import { FrameView, NavSection, NotFoundSample, ShellSection, searchSetup } from './ShellSections';
import { P } from './strings';

interface State {
  logo: LogoKind;
  palette: Palette;
  frame: string | null;
}

/** Reads the URL once; theme and language from it are applied before the first render (not stored). */
function initial(): State {
  const p = new URLSearchParams(location.search);
  const theme = p.get('theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.classList.toggle('dark', theme === 'dark');
  const lang = p.get('lang');
  if (lang === 'el' || lang === 'en') document.documentElement.lang = lang;
  const logo = p.get('logo');
  return {
    logo: logo === 'b' || logo === 'c' ? logo : 'a',
    palette: p.get('palette') === 'indigo' ? 'indigo' : 'blue',
    frame: p.get('frame'),
  };
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
  const [s, setS] = useState(initial);
  const lang = useLang();
  const theme = useTheme();
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
    p.set('logo', s.logo);
    p.set('palette', s.palette);
    p.set('theme', theme);
    p.set('lang', lang);
    history.replaceState(null, '', `${location.pathname}?${p}`);
  }, [s, theme, lang]);

  // The browser tab shows the selected logo's favicon.
  const brand = useTokens(s.palette, 'light', ['brand-600', 'brand-400']);
  useEffect(() => {
    if (!brand) return;
    const url = `data:image/svg+xml,${encodeURIComponent(faviconSvg(s.logo, hex(brand['brand-600']), hex(brand['brand-400'])))}`;
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((l) => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = url;
    document.head.appendChild(link);
  }, [brand, s.logo]);
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
      <div className="ds min-h-screen" data-palette={s.palette}>
        {d && setup ? <FrameView view={s.frame} d={d} setup={setup} logo={s.logo} /> : <p className="p-4 text-sm text-faint">{tr(lang, P.loadingData)}</p>}
        {toastEl}
      </div>
    );
  }

  return (
    <div className="ds min-h-screen" data-palette={s.palette}>
      <div className="sticky top-0 z-30 border-b border-line bg-panel/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-sm font-semibold">
              BuildDraft.gr · {tr(lang, P.pageTitle)}
            </p>
            <Segmented
              label={P.logo}
              value={s.logo}
              onChange={(logo) => setS({ ...s, logo })}
              options={[
                { v: 'a', label: 'A' },
                { v: 'b', label: 'B' },
                { v: 'c', label: 'C' },
              ]}
            />
            <Segmented
              label={P.palette}
              value={s.palette}
              onChange={(palette) => setS({ ...s, palette })}
              options={[
                { v: 'blue', label: P.blue },
                { v: 'indigo', label: P.indigo },
              ]}
            />
            <Segmented
              label={P.theme}
              value={theme}
              onChange={(t) => withoutTransitions(() => setTheme(t))}
              options={[
                { v: 'light', label: P.light },
                { v: 'dark', label: P.dark },
              ]}
            />
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
        <LogosSection palette={s.palette} />
        <ColoursSection palette={s.palette} />
        <TypeSection />
        <ButtonsSection />
        {!d || !setup ? (
          <p className="text-sm text-faint">{tr(lang, P.loadingData)}</p>
        ) : (
          <>
            <ChipsSection d={d} />
            <CompatSection />
            <PriceSection d={d} />
            <SpecsSection d={d} />
            <FiltersSection d={d} />
            <ListsSection d={d} />
            <PagingSection />
            <OverlaysSection d={d} notify={notify} />
            <StatesSection notFound={<NotFoundSample d={d} setup={setup} />} />
            <NavSection d={d} setup={setup} />
            <ShellSection d={d} setup={setup} logo={s.logo} palette={s.palette} />
          </>
        )}
      </main>
      {toastEl}
    </div>
  );
}
