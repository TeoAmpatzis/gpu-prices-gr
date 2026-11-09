// The site (v2 shell, Phase 1): header, the page for the current address, footer. Real URLs (src/lib/routes.ts)
// instead of v1's "#…" routes; old links are redirected before this renders (main.tsx). The category pages,
// the builder and the text pages are separate chunks, loaded when opened or when their link is hovered,
// focused or touched.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tr, useLang, type Text } from './lib/i18n';
import { listUrl } from './lib/columns';
import { afterFirstPaint } from './lib/paint';
import { navigate, notifyUrl, useLinkNavigation, usePath } from './lib/router';
import { CATEGORY_LIST, matchRoute, redirectLegacyLink } from './lib/routes';
import type { Category } from './types';
import { CompareTray } from './components/compare/CompareTray';
import { COMPARE_ENABLED } from './lib/compare/flag';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { Header } from './shell/Header';
import { Home } from './shell/Home';
import { BUILDER, CATS, href } from './shell/nav';
import { Footer, NotFoundPage, PartsPage } from './shell/pages';
import { PageTitle } from './shell/PageTitle';
import { loadSearchIndex, useSite } from './shell/site';
import { applyMeta, pageMeta } from './lib/pageMeta';
import { CAT_PAGE, PAGE } from './shell/texts';
import type { SearchSetup } from './ui/SearchBox';
import { useMedia } from './lib/useMedia';
import { SkeletonCards, SkeletonRows } from './ui/states';
import { UI } from './ui/strings';

/** Loading placeholder while a page's code arrives: rows on wide screens, card shapes on phones (UX-21). */
function PageSkeleton() {
  return useMedia('(min-width: 1024px)') ? <SkeletonRows /> : <SkeletonCards cards={4} />;
}

const loadCategoryPage = () => import('./shell/CategoryPage');
const loadBuilderView = () => import('./components/Builder');
const loadInfoView = () => import('./components/InfoPage');
const CategoryPage = lazy(loadCategoryPage);
const loadModelPage = () => import('./components/product/ModelPage');
const ModelPage = lazy(loadModelPage);
const Builder = lazy(loadBuilderView);
const InfoPage = lazy(loadInfoView);
const loadSearchPage = () => import('./components/search/SearchPage');
const SearchPage = lazy(loadSearchPage);
const ComparePage = lazy(() => import('./components/compare/ComparePage'));

/** Start loading a page's code and data before it opens (link hover, focus or touch; and the first page). */
function prefetchPath(path: string) {
  const r = matchRoute(new URL(path, location.origin).pathname);
  if (r.kind === 'model') void loadModelPage();
  else if (r.kind === 'category') void loadCategoryPage().then((m) => m.prefetch(r.cat));
  else if (r.kind === 'builder') {
    void loadBuilderView();
    // Its first screen's small index (/data/builder/index.json); each step's parts load when the step opens.
    void import('./lib/builderIndex').then((m) => m.loadIndex()).catch(() => {});
  } else if (r.kind === 'info') void loadInfoView();
  else if (r.kind === 'search') { void loadSearchPage(); void loadSearchIndex().catch(() => {}); }
}

/**
 * The first page's code and data. App starts them right after the first paint (see `painted`), as v1 fetched
 * its data after painting: anything requested before the first paint counts toward it in Lighthouse's phone
 * simulation (measured on /gpu: mobile 97 → 92, LCP 2.5 → 3.2 s when they started before React rendered).
 */
function startFirstPage() {
  const first = matchRoute(location.pathname);
  if (first.kind === 'builder') {
    // Code only: the builder requests its index file itself once it has rendered, as in v1. Its step text is
    // the page's largest paint, and the 270 KB builder.json finishing before it counted toward it (mobile 91 → 88).
    void loadBuilderView();
    // An address that opens the steps or the part list (a step, the list, a shared build) or a saved build skips the
    // start screen: its workbench code starts with the page's, not after it (one hop less; the same test as
    // builderView.firstView, kept here so the shell doesn't carry the build store).
    let saved = '';
    try {
      saved = localStorage.getItem('pcBuild') ?? '';
    } catch {
      /* no storage: the start screen */
    }
    const part = /"(cpu|mobo|ram|gpu|cooler|storage|case|psu|fan)":/;
    if (/[?&](step=(?!use\b)|mode=quick|(cpu|mobo|ram|gpu|cooler|storage|case|psu|fan)=)/.test(location.search) || part.test(saved)) {
      void import('./components/builder/Workbench');
    }
    return;
  }
  // A category page needs its list. A product page never loads it: ModelPage requests only the manifest and its
  // model chunk (the photo comes from the chunk), and the list would share a phone's slow link with them and with
  // the photo, the page's LCP element (step 4 gate: /case/<model> phone 87, 254 KB of data).
  const data = first.kind === 'category' ? listUrl(first.cat) : null;
  if (data) {
    const l = document.createElement('link');
    l.rel = 'preload';
    l.as = 'fetch';
    l.href = data;
    l.crossOrigin = 'anonymous';
    document.head.append(l);
  }
  prefetchPath(location.pathname);
}

const SECTIONS: SearchSetup['sections'] = [...CATEGORY_LIST.map((c) => ({ id: c, ...CATS[c] })), { id: 'builder', ...BUILDER }];
const SEARCH: SearchSetup = {
  load: loadSearchIndex,
  sections: SECTIONS,
  href: {
    section: (id) => (id === 'builder' ? href.builder : href.category(id)),
    model: href.model,
    all: href.search,
    maker: href.maker,
  },
  go: (to) => navigate(to),
};

export default function App() {
  const lang = useLang();
  const path = usePath();
  const route = useMemo(() => matchRoute(path), [path]);
  const site = useSite();
  useLinkNavigation(prefetchPath);
  // The first frame paints the header, the page title and a skeleton; the page's own (lazy) code and data
  // start right after that paint.
  const [painted, setPainted] = useState(false);
  useEffect(
    () =>
      afterFirstPaint(() => {
        startFirstPage();
        setPainted(true);
      }),
    [],
  );
  /** A lazy page part: a skeleton until the first paint is done and while its code arrives. */
  const later = (node: ReactNode) => (painted ? <Suspense fallback={<PageSkeleton />}>{node}</Suspense> : <PageSkeleton />);
  // An old "#…" link opened where the site is already showing (only the hash changes): same redirect.
  useEffect(() => {
    const onHash = () => redirectLegacyLink() && notifyUrl();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Visited category pages (and the builder) stay mounted, hidden, so their filters and state survive
  // switching back and forth (as in v1).
  const activeCat: Category | null = route.kind === 'category' ? route.cat : null;
  // (Updated while rendering, React's pattern for remembering earlier renders.)
  const [visited, setVisited] = useState<Category[]>([]);
  if (activeCat && !visited.includes(activeCat)) setVisited([...visited, activeCat]);
  const [builderSeen, setBuilderSeen] = useState(false);
  if (route.kind === 'builder' && !builderSeen) setBuilderSeen(true);

  const home = tr(lang, UI.home);
  const crumbs = (label: Text) => [{ label: home, href: '/' }, { label: tr(lang, label) }];
  useEffect(() => {
    if (route.kind === 'model') return; // the model page names the model (components/product/ModelPage)
    applyMeta(pageMeta(path, lang));
  }, [route, path, lang]);

  // After an in-site navigation, focus moves to the new page's content (screen readers announce it).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [path]);

  const current = route.kind === 'category' || route.kind === 'model' ? route.cat : route.kind === 'builder' ? 'builder' : null;
  const notFound = <NotFoundPage counts={site?.counts} search={SEARCH} />;

  return (
    // On the builder, room at the bottom for its fixed summary bar on phones and tablets.
    <div className={`site-shell${route.kind === 'builder' ? ' pb-32 lg:pb-0' : ''}`}>
      <Header current={current} search={SEARCH} counts={site?.counts} />
      {/* Reserve the first screen while data pages load; short pages use the flex frame's remaining space. */}
      <main id="main" tabIndex={-1} className={`site-container site-main py-4 outline-none sm:py-5${route.kind === 'category' || route.kind === 'model' || route.kind === 'builder' ? ' min-h-screen' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            {route.kind === 'home' && <Home counts={site?.counts} search={SEARCH} />}
            {visited.map((c) => (
              <div key={c} hidden={activeCat !== c}>
                <PageTitle compact crumbs={crumbs(CATS[c].name)} title={CAT_PAGE[c].title} subtitle={CAT_PAGE[c].subtitle} />
                {later(<CategoryPage cat={c} />)}
              </div>
            ))}
            {route.kind === 'model' && later(<ModelPage cat={route.cat} slug={route.slug} />)}
            {builderSeen && (
              <div hidden={route.kind !== 'builder'}>
                {later(<Builder />)}
              </div>
            )}
            {route.kind === 'parts' && <PartsPage counts={site?.counts} search={SEARCH} />}
            {route.kind === 'search' && later(<SearchPage />)}
            {route.kind === 'compare' && COMPARE_ENABLED && (
              <div className="mx-auto max-w-[1032px]">
                <PageTitle crumbs={crumbs(PAGE.compare.title)} title={PAGE.compare.title} subtitle={PAGE.compare.subtitle} />
                {later(<ComparePage />)}
              </div>
            )}
            {route.kind === 'info' && (
              <div className="mx-auto max-w-[1032px]">
                <PageTitle crumbs={crumbs(PAGE[route.page].title)} title={PAGE[route.page].title} subtitle={PAGE[route.page].subtitle} />
                {later(<InfoPage page={route.page} />)}
              </div>
            )}
            {(route.kind === 'notFound' || (route.kind === 'compare' && !COMPARE_ENABLED)) && notFound}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer sources={site?.sources ?? {}} staleIn={site?.staleIn} />
      <CompareTray hidden={route.kind === 'builder' || route.kind === 'compare'} />
    </div>
  );
}
