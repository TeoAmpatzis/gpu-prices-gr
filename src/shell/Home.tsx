import { lazy, Suspense, useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { tr, useLang } from '../lib/i18n';
import { CATEGORY_LIST } from '../lib/routes';
import type { Category } from '../types';
import { Button, LinkButton } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { CATS } from './nav';
import { useSite } from './site';
import { SOURCES, SOURCE_NAMES } from '../lib/sources';
import { formatPrice, shortAgo } from '../lib/format';
import { afterFirstPaint } from '../lib/paint';
import { loadHome, type HomeFile } from '../lib/homeData';
import { HOME_TEXT as H } from './homeTexts';
import './home.css';

const HomeSections = lazy(() => import('./HomeSections'));
const POPULAR = ['RTX 5070', 'Ryzen 7 9700X', '990 Pro 1TB', 'DDR5 6000 32GB'];
const HOME_CATEGORIES: Category[] = ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'case', 'psu', 'cooler', 'fan'];
/** Published things you plug in (monitors): their own section, they are not PC parts. */
const HOME_PERIPHERALS: Category[] = (['monitor'] as Category[]).filter((c) => CATEGORY_LIST.includes(c));
const HOME_SOURCES = ['skroutz', 'bestprice', 'shopflix', 'snif', 'eshop'] as const;

/** Match the settled grid at every breakpoint while the post-paint feed or its view chunk loads. */
function HomeLoading() {
  const lang = useLang();
  const t = (key: keyof typeof H) => tr(lang, H[key]);
  return <>
    <section className="home-deals" aria-busy="true"><div className="home-section-heading"><h2>{t('drops')}</h2><span>{t('median')}</span></div><div className="home-deals-panel" /></section>
    <section className="home-builds" aria-busy="true"><div className="home-section-heading"><h2>{t('builds')}</h2><span>{t('estimates')}</span></div><div className="home-build-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div className="home-build" key={i}><span className="home-loading-line" /><span className="home-loading-line" /><span className="home-loading-line" /></div>)}</div><p className="home-preview-note">{t('preview')}</p></section>
  </>;
}

/**
 * The homepage paints its shell before loading the small derived feed. Catalogue, history and builder
 * files remain on their owning pages; category counts refer to source listings.
 */
export function Home({ search }: { counts?: Partial<Record<Category, number>>; search: SearchSetup }) {
  const lang = useLang();
  const t = (key: keyof typeof H) => tr(lang, H[key]);
  const site = useSite();
  const [data, setData] = useState<HomeFile | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let live = true;
    const cancel = afterFirstPaint(() => loadHome().then((file) => { if (live) { setData(file); setError(false); } }, () => { if (live) setError(true); }));
    return () => { live = false; cancel(); };
  }, [attempt]);
  const tile = (id: Category) => {
    const Icon = CATS[id].icon;
    const record = data?.categories.find((c) => c.id === id);
    return <li key={id} className="min-w-0 flex"><a href={`/${id}`} className="home-category w-full" data-home-category={id}><span className="home-category-icon"><Icon size={20} aria-hidden="true" /></span><span><strong>{tr(lang, CATS[id].name)}</strong><span className="text-muted">{record ? `${record.count.toLocaleString(lang === 'el' ? 'el-GR' : 'en-IE')} ${t('products')}` : '—'}</span></span><span className="home-category-price"><small>{t('from')}</small><strong>{record?.min != null ? formatPrice(record.min, lang) : '—'}</strong></span></a></li>;
  };
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-intro">
        <div className="home-hero-copy">
          <div><h1 id="home-intro">{t('title')}</h1><p>{t('intro')}</p></div>
          <div className="home-search"><SearchBox setup={search} variant="large" /></div>
          <div className="home-popular" role="group" aria-label={t('popular')}>{POPULAR.map((q) => <a className="home-query" key={q} href={`/search?q=${encodeURIComponent(q)}`}>{q}</a>)}</div>
          <div className="home-actions"><LinkButton variant="primary" icon={Wrench} href="/builder">{t('build')}</LinkButton><LinkButton href="#home-builds">{t('ready')}</LinkButton></div>
        </div>
        <aside className="home-freshness">
          <div className="home-section-heading"><h2>{t('checked')}</h2><span>{SOURCE_NAMES.length} {t('sources')}</span></div>
          <ul>{HOME_SOURCES.map((source) => {
            const checkedAt = site?.sources[source]?.updatedAt;
            const age = checkedAt ? now - Date.parse(checkedAt) : NaN;
            const fresh = Number.isFinite(age) && age >= 0 && age <= 864e5;
            return <li key={source}><span>{SOURCES[source].label}</span><div><time dateTime={checkedAt ?? undefined}>{shortAgo(checkedAt, lang)}</time><Badge tone={fresh ? 'success' : 'warning'}>{t(!checkedAt ? 'unknown' : fresh ? 'fresh' : 'stale')}</Badge></div></li>;
          })}</ul>
          <p>{t('freshness')}</p>
        </aside>
      </section>
      <section className="home-categories" aria-labelledby="home-categories">
        <div className="home-section-heading"><h2 id="home-categories">{t('categories')}</h2><a href="/parts">{t('all')}</a></div>
        <ul className="home-category-grid">{HOME_CATEGORIES.map(tile)}</ul>
      </section>
      {HOME_PERIPHERALS.length > 0 && (
        <section className="home-categories" aria-labelledby="home-peripherals">
          <div className="home-section-heading"><h2 id="home-peripherals">{t('peripherals')}</h2></div>
          <ul className="home-category-grid">{HOME_PERIPHERALS.map(tile)}</ul>
        </section>
      )}
      {error ? <div className="home-error" role="alert"><p>{t('loadFailed')}</p><Button onClick={() => { setError(false); setAttempt((n) => n + 1); }}>{t('retry')}</Button></div> : <Suspense fallback={<HomeLoading />}>{data ? <HomeSections data={data} now={now} /> : <HomeLoading />}</Suspense>}
      <div className="home-method"><span>{SOURCE_NAMES.length} {t('sources')} · {CATEGORY_LIST.length} {t('categories').toLocaleLowerCase(lang === 'el' ? 'el-GR' : 'en-IE')}</span><span>{t('policy')} <a href="/how-prices">{t('method')}</a></span></div>
    </div>
  );
}
