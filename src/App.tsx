import { useEffect, useState } from 'react';
import { Info, Mail, ShieldCheck, Wrench } from 'lucide-react';
import type { BaseListing, Category } from './types';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from './lib/categories';
import Backdrop from './components/Backdrop';
import Builder from './components/Builder';
import CategoryView from './components/CategoryView';
import InfoPage from './components/InfoPage';
import Logo from './components/Logo';
import LangToggle from './components/LangToggle';
import ThemeToggle from './components/ThemeToggle';
import { T, tr, useLang } from './lib/i18n';
import { ABOUT, CONTACT, PRIVACY, type InfoPageContent } from './content/pages';
import { OWNER_NAME } from './lib/site';

type InfoId = 'about' | 'contact' | 'privacy';
type Page = Category | 'builder' | InfoId;

/** Text pages, linked from the footer (#about, #contact, #privacy). */
const INFO: Record<
  InfoId,
  {
    title: { el: string; en: string };
    subtitle: { el: string; en: string };
    icon: typeof Info;
    content: InfoPageContent;
  }
> = {
  about: {
    title: { el: 'Σχετικά', en: 'About' },
    subtitle: {
      el: 'Τι είναι το BuildDraft.gr και από πού έρχονται οι τιμές.',
      en: 'What BuildDraft.gr is and where the prices come from.',
    },
    icon: Info,
    content: ABOUT,
  },
  contact: {
    title: { el: 'Επικοινωνία', en: 'Contact' },
    subtitle: { el: 'Ερωτήσεις, διορθώσεις και προτάσεις.', en: 'Questions, corrections and suggestions.' },
    icon: Mail,
    content: CONTACT,
  },
  privacy: {
    title: { el: 'Πολιτική απορρήτου', en: 'Privacy policy' },
    subtitle: {
      el: 'Ποια δεδομένα επεξεργάζονται και ποια είναι τα δικαιώματά σας.',
      en: 'What data is processed and what your rights are.',
    },
    icon: ShieldCheck,
    content: PRIVACY,
  },
};
const INFO_IDS = Object.keys(INFO) as InfoId[];
const isInfo = (p: Page): p is InfoId => (INFO_IDS as string[]).includes(p);

const fromHash = (): Page => {
  // "#ram?type=ddr5" → "ram": filters live after the "?" (src/lib/filterUrl.ts).
  const id = location.hash.slice(1).split('?')[0];
  return id === 'builder' || (CATEGORY_IDS as string[]).includes(id) || (INFO_IDS as string[]).includes(id)
    ? (id as Page)
    : 'gpu';
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
  const cfg = active === 'builder' ? BUILDER : isInfo(active) ? INFO[active] : CATEGORIES[active];

  // Text pages open at the top, like a new page.
  useEffect(() => {
    if (isInfo(active)) window.scrollTo({ top: 0 });
  }, [active]);

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
    <>
      <Backdrop />
      {/* On the builder, room at the bottom for its fixed summary bar (below lg). */}
      <div className={`mx-auto max-w-7xl px-4 py-5 sm:py-8 ${active === 'builder' ? 'pb-32 sm:pb-32 lg:pb-8' : ''}`}>
        <header className="mb-6 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <a href="/" onClick={goHome} className="tap flex min-w-0 items-center gap-2.5" aria-label={t(T.homeLabel)}>
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
                  className={`tap inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition ${
                    id === active
                      ? 'border-accent text-fg'
                      : 'border-transparent text-muted hover:border-line-strong hover:text-fg'
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
              className={`tap ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-semibold transition ${
                active === 'builder'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-accent/80 hover:text-accent'
              }`}
            >
              <Wrench className="h-4 w-4" /> {t(BUILDER.tab)}
            </a>
          </nav>

          <div className="relative isolate flex items-start gap-3">
            {/* Soft green glow behind the title (index.css .bd-glow, intensity --bg-glow). */}
            <span className="bd-glow" aria-hidden="true" />
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
        {isInfo(active) && <InfoPage content={INFO[active].content} />}

        <footer className="mt-10 border-t border-line pt-6 text-center text-xs text-faint">
          <nav aria-label={t(T.footerNav)} className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            {INFO_IDS.map((id) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? 'page' : undefined}
                className={`tap inline-flex items-center rounded transition-colors duration-150 hover:text-fg ${active === id ? 'font-medium text-fg' : 'text-muted'}`}
              >
                {t(INFO[id].title)}
              </a>
            ))}
          </nav>
          {t(T.footer)}
          <div className="mt-1">BuildDraft.gr · © 2026 {t(OWNER_NAME)} · {t(T.notAffiliated)}</div>
        </footer>
      </div>
    </>
  );
}
