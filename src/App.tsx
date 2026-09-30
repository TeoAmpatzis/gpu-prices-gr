import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import type { BaseListing, Category } from './types';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from './lib/categories';
import Builder from './components/Builder';
import CategoryView from './components/CategoryView';
import Logo from './components/Logo';
import LangToggle from './components/LangToggle';
import ThemeToggle from './components/ThemeToggle';
import { T, tr, useLang } from './lib/i18n';

type Page = Category | 'builder';

const fromHash = (): Page => {
  const id = location.hash.slice(1);
  return id === 'builder' || (CATEGORY_IDS as string[]).includes(id) ? (id as Page) : 'gpu';
};

const BUILDER = {
  tab: { el: 'Συναρμολόγηση PC', en: 'PC Builder' },
  title: { el: 'Συναρμολόγηση PC', en: 'PC Builder' },
  subtitle: {
    el: 'Διαλέξτε συμβατά εξαρτήματα με τις τρέχουσες τιμές της ελληνικής αγοράς.',
    en: 'Pick compatible parts at current Greek market prices.',
  },
  icon: Wrench,
};

export default function App() {
  const [active, setActive] = useState<Page>(fromHash);
  // Keep visited tabs mounted so their filters survive switching back and forth.
  const [visited, setVisited] = useState<Set<Page>>(() => new Set([fromHash()]));

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  const lang = useLang();
  const t = (x: Parameters<typeof tr>[1]) => tr(lang, x);
  const cfg = active === 'builder' ? BUILDER : CATEGORIES[active];

  useEffect(() => {
    document.title = `${t(cfg.title)} — ${t(T.siteName)}`;
  });
  const Icon = cfg.icon;
  // The logo goes to the home page ("/", which shows the first tab) without reloading the app.
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    history.pushState(null, '', '/');
    setActive('gpu');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <header className="mb-6 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <a href="/" onClick={goHome} className="flex min-w-0 items-center gap-2.5" aria-label={t(T.homeLabel)}>
            <Logo className="h-8 w-8 shrink-0 text-accent" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[17px] font-bold tracking-tight">
                BuildDraft<span className="text-accent">.gr</span>
              </span>
              <span className="block truncate text-xs text-faint">{t(T.siteTagline)}</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Bottom rule is an inset shadow so the active tab's underline can sit on it without
            causing vertical overflow; tabs scroll sideways on narrow screens. */}
        <nav className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_rgb(var(--line))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_IDS.map((id) => {
            const c = CATEGORIES[id];
            const TabIcon = c.icon;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={id === active ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition ${
                  id === active ? 'border-accent text-fg' : 'border-transparent text-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                <TabIcon className={`h-4 w-4 ${id === active ? 'text-accent' : ''}`} /> {t(c.tab)}
              </a>
            );
          })}
          {/* The builder sits apart, at the right end of the tab bar. */}
          <a
            href="#builder"
            aria-current={active === 'builder' ? 'page' : undefined}
            className={`ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-semibold transition ${
              active === 'builder' ? 'border-accent text-accent' : 'border-transparent text-accent/80 hover:text-accent'
            }`}
          >
            <Wrench className="h-4 w-4" /> {t(BUILDER.tab)}
          </a>
        </nav>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(cfg.title)}</h1>
            <p className="mt-1 text-sm text-muted">{t(cfg.subtitle)}</p>
          </div>
        </div>
      </header>

      {/* Visited tabs stay mounted (hidden) so their filters survive switching back and forth.
          Each config is typed for its own listing type, so it is widened here. */}
      {CATEGORY_IDS.filter((id) => visited.has(id)).map((id) => (
        <div key={id} hidden={active !== id}>
          <CategoryView cfg={CATEGORIES[id] as unknown as CategoryConfig<BaseListing>} />
        </div>
      ))}
      {visited.has('builder') && (
        <div hidden={active !== 'builder'}>
          <Builder />
        </div>
      )}

      <footer className="mt-10 border-t border-line pt-6 text-center text-xs text-faint">
        {t(T.footer)}
        <div className="mt-1">BuildDraft.gr · © 2026 Teo Ampatzis · {t(T.notAffiliated)}</div>
      </footer>
    </div>
  );
}
