import { House, Wrench } from 'lucide-react';
import { tr, useLang, type Text } from '../lib/i18n';
import type { Category, SourceName } from '../types';
import { LinkButton } from '../ui/Button';
import { StatusLine, type SourceTimes } from '../ui/nav';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { UI, plural } from '../ui/strings';
import { LangSwitch } from './controls';
import type { Current } from './MegaMenu';
import { CATS, GROUPS, href } from './nav';
import { SHELL } from './texts';

/** Category tiles: icon, name, model count; the current one is marked. Used by /parts, the home and 404. */
export function Tiles({ current, counts, cats }: { current?: Current; counts?: Partial<Record<Category, number>>; cats: Category[] }) {
  const lang = useLang();
  return (
    <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {cats.map((cat) => {
        const c = CATS[cat];
        const here = current === cat;
        return (
          <li key={cat}>
            <a
              href={href.category(cat)}
              aria-current={here ? 'page' : undefined}
              className={`flex h-full min-h-20 items-center gap-3 rounded-xl border p-4 ${
                here ? 'border-accent bg-brand-subtle text-accent' : 'border-edge bg-panel text-fg shadow-[var(--shadow-1)] hover:border-edge-hover hover:bg-hover'
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-sunken text-accent"><c.icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">{tr(lang, c.name)}</span>
                {/* Always one line tall, so the tile keeps its size when the counts arrive (no layout shift). */}
                <span className="ui-num block text-xs text-muted" aria-hidden={counts?.[cat] == null || undefined}>
                  {counts?.[cat] != null ? plural(lang, counts[cat]!, UI.modelForms) : '\u00a0'}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** /parts — the "Εξαρτήματα" menu as a page (phones); also holds the language switch there. */
export function PartsPage({ current, counts, search }: { current?: Current; counts?: Partial<Record<Category, number>>; search: SearchSetup }) {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{tr(lang, UI.parts)}</h1>
        <LangSwitch wide />
      </div>
      <SearchBox setup={search} variant="large" />
      {GROUPS.map((g) => (
        <section key={tr('en', g.title)} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, g.title)}</h2>
          <Tiles current={current} counts={counts} cats={g.cats} />
        </section>
      ))}
      <LinkButton variant="primary" icon={Wrench} href={href.builder} className="w-full sm:w-auto sm:self-start">
        PC Builder
      </LinkButton>
    </div>
  );
}

/** 404 (UX-08: v1 showed graphics cards for any unknown address): search, the categories, home. */
export function NotFoundPage({ search }: { counts?: Partial<Record<Category, number>>; search: SearchSetup }) {
  const lang = useLang();
  return (
    <div className="mx-auto flex max-w-[672px] flex-col items-center gap-5 pb-14 pt-10 text-center sm:pt-14">
      <p className="ui-mono text-[56px] font-semibold leading-[60px] text-accent">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">{tr(lang, UI.notFoundTitle)}</h1>
      <p className="max-w-[480px] text-sm leading-5 text-muted">{tr(lang, UI.notFoundText)}</p>
      <div className="w-full max-w-[480px] text-left"><SearchBox setup={search} variant="large" /></div>
      <nav aria-label={tr(lang, UI.categories)} className="flex max-w-[560px] flex-wrap justify-center gap-2">
        {GROUPS.flatMap((g) => g.cats).map((cat) => <a key={cat} className="ui-chip text-accent" href={href.category(cat)}>{tr(lang, CATS[cat].name)}</a>)}
      </nav>
      <div className="flex flex-wrap justify-center gap-2">
        <LinkButton variant="secondary" icon={House} href={href.home}>{tr(lang, UI.home)}</LinkButton>
        <LinkButton variant="primary" icon={Wrench} href={href.builder}>PC Builder</LinkButton>
      </div>
    </div>
  );
}

/** Footer: text pages, the site-wide status line, the language switch (phones), "© 2026 BuildDraft.gr". */
export function Footer({ sources, staleIn }: { sources: SourceTimes; staleIn?: { source: SourceName; category: Text; updatedAt: string }[] }) {
  const lang = useLang();
  return (
    <>
      <div className="site-container mb-8 mt-4">
        <div className="ui-card flex flex-col gap-2 px-5 py-4">
          <StatusLine sources={sources} staleIn={staleIn} />
          <p className="text-xs text-faint">{tr(lang, UI.notAffiliated)}</p>
        </div>
      </div>
      <footer className="border-t border-line bg-panel">
        <div className="site-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 text-sm">
          <p className="text-muted">© 2026 BuildDraft.gr</p>
          <nav aria-label={tr(lang, SHELL.information)} className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="/how-prices" className="tap inline-flex items-center rounded text-accent underline hover:text-fg">{tr(lang, { el: 'Πώς βγάζουμε τις τιμές', en: 'How prices work' })}</a>
            {(['about', 'contact', 'privacy'] as const).map((p) => (
              <a key={p} href={`/${p}`} className="tap inline-flex items-center rounded text-accent underline hover:text-fg">
                {tr(lang, p === 'privacy' ? SHELL.privacy : UI[p])}
              </a>
            ))}
          </nav>
          <div className="sm:hidden">
            <LangSwitch wide />
          </div>
        </div>
      </footer>
    </>
  );
}
