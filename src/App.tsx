// The site (v2 shell, Phase 1): header, the page for the current address, footer. Real URLs (src/lib/routes.ts)
// instead of v1's "#…" routes; old links are redirected before this renders (main.tsx). The category pages,
// the builder and the text pages are separate chunks, loaded when opened or when their link is hovered,
// focused or touched.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { tr, useLang, type Text } from './lib/i18n';
import { navigate, notifyUrl, useLinkNavigation, usePath } from './lib/router';
import { CATEGORY_LIST, matchRoute, redirectLegacyLink } from './lib/routes';
import type { Category } from './types';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { Header } from './shell/Header';
import { Home } from './shell/Home';
import { BUILDER, CATS, href } from './shell/nav';
import { Footer, NotFoundPage, PartsPage } from './shell/pages';
import { PageTitle } from './shell/PageTitle';
import { loadSearchIndex, useSite } from './shell/site';
import { PAGE } from './shell/texts';
import type { SearchSetup } from './ui/SearchBox';
import { SkeletonRows } from './ui/states';
import { UI } from './ui/strings';

const loadCategoryPage = () => import('./shell/CategoryPage');
const loadBuilderView = () => import('./components/Builder');
const loadInfoView = () => import('./components/InfoPage');
const CategoryPage = lazy(loadCategoryPage);
const ModelRedirect = lazy(() => loadCategoryPage().then((m) => ({ default: m.ModelRedirect })));
const Builder = lazy(loadBuilderView);
const InfoPage = lazy(loadInfoView);

/** Start loading a page's code and data before it opens (link hover, focus or touch; and the first page). */
function prefetchPath(path: string) {
  const r = matchRoute(new URL(path, location.origin).pathname);
  if (r.kind === 'category' || r.kind === 'model') void loadCategoryPage().then((m) => m.prefetch(r.cat));
  else if (r.kind === 'builder') {
    void loadBuilderView();
    void import('./lib/data').then((m) => m.prefetch('builder'));
  } else if (r.kind === 'info') void loadInfoView();
}

/** The first page's code and data start downloading at once (main.tsx calls this after the old-link redirect). */
export function startFirstPage() {
  const first = matchRoute(location.pathname);
  const data = first.kind === 'category' || first.kind === 'model' ? `/data/${first.cat}/list.json` : first.kind === 'builder' ? '/data/builder.json' : null;
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
  const title: Text =
    route.kind === 'category' || route.kind === 'model'
      ? CATS[route.cat].name
      : route.kind === 'info'
        ? PAGE[route.page].title
        : route.kind === 'home'
          ? PAGE.home.title
          : PAGE[route.kind].title;
  useEffect(() => {
    document.title = route.kind === 'home' ? `BuildDraft.gr — ${tr(lang, title)}` : `${tr(lang, title)} — BuildDraft.gr`;
  }, [route, title, lang]);

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
    <div className={route.kind === 'builder' ? 'pb-32 lg:pb-0' : undefined}>
      <Header current={current} search={SEARCH} counts={site?.counts} />
      {/* Pages with data are at least a screen tall, so the footer starts below the fold while they load. */}
      <main id="main" tabIndex={-1} className="mx-auto min-h-screen max-w-7xl px-4 py-6 outline-none sm:py-8">
        <ErrorBoundary>
          <Suspense fallback={<SkeletonRows />}>
            {route.kind === 'home' && <Home counts={site?.counts} search={SEARCH} />}
            {visited.map((c) => (
              <div key={c} hidden={activeCat !== c}>
                <CategoryPage cat={c} home={home} />
              </div>
            ))}
            {route.kind === 'model' && <ModelRedirect cat={route.cat} slug={route.slug} notFound={notFound} />}
            {builderSeen && (
              <div hidden={route.kind !== 'builder'}>
                <PageTitle crumbs={crumbs(PAGE.builder.title)} title={PAGE.builder.title} subtitle={PAGE.builder.subtitle} />
                <Builder />
              </div>
            )}
            {route.kind === 'parts' && <PartsPage counts={site?.counts} search={SEARCH} />}
            {route.kind === 'info' && (
              <>
                <PageTitle crumbs={crumbs(PAGE[route.page].title)} title={PAGE[route.page].title} subtitle={PAGE[route.page].subtitle} />
                <InfoPage page={route.page} />
              </>
            )}
            {route.kind === 'notFound' && notFound}
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer sources={site?.sources ?? {}} staleIn={site?.staleIn} />
    </div>
  );
}
