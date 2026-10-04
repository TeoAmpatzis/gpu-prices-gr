import { useState } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { CATEGORY_IDS } from '../lib/categories';
import type { Category } from '../types';
import { Header } from '../shell/Header';
import { MegaMenu } from '../shell/MegaMenu';
import { BUILDER, CATS, href } from '../shell/nav';
import { Footer, NotFoundPage, PartsPage } from '../shell/pages';
import { AppliedChip } from '../ui/Chip';
import { CheckList, type Option } from '../ui/filters';
import { PartRow, ProductCard } from '../ui/lists';
import { Breadcrumbs, StatusLine } from '../ui/nav';
import { BottomSheet } from '../ui/overlays';
import { Pagination } from '../ui/Pagination';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { Button } from '../ui/Button';
import { UI } from '../ui/strings';
import { buildParts, listItem } from './ComponentSections';
import type { PreviewData } from './data';
import { Section, Spec } from './kit';
import { P } from './strings';

export function searchSetup(d: PreviewData, notify: (t: string) => void, lang: 'el' | 'en'): SearchSetup {
  return {
    load: () => Promise.resolve(d.index),
    sections: [...CATEGORY_IDS.map((c) => ({ id: c, ...CATS[c] })), { id: 'builder' as const, ...BUILDER }],
    href: {
      section: (id) => (id === 'builder' ? href.builder : href.category(id)),
      model: href.model,
      all: href.search,
      maker: href.maker,
    },
    go: (h) => notify(`${tr(lang, P.toastGo)}: ${decodeURIComponent(h)}`),
  };
}

const crumbsFor = (lang: 'el' | 'en', cat: Category) => [
  { label: tr(lang, UI.home), href: href.home },
  { label: tr(lang, CATS[cat].name), href: href.category(cat) },
];

export function NavSection({ d, setup }: { d: PreviewData; setup: SearchSetup }) {
  const lang = useLang();
  return (
    <Section id="nav" title={P.sNav} intro={P.navIntro}>
      <div className="ui-card flex flex-col gap-3 p-4">
        <Breadcrumbs items={crumbsFor(lang, 'gpu')} />
        <Breadcrumbs items={[...crumbsFor(lang, 'gpu'), { label: 'RTX 5070 12GB', href: '/gpu/rtx-5070-12gb' }, { label: 'Inno3D RTX 5070 Twin X2 OC' }]} />
        <Breadcrumbs items={[{ label: tr(lang, UI.home), href: href.home }, { label: 'PC Builder' }]} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Spec label={P.statusCategory} className="ui-card p-4">
          <StatusLine sources={d.sourceTimes('storage')} />
        </Spec>
        <Spec label={P.statusSite} className="ui-card p-4">
          <StatusLine sources={d.siteTimes} staleIn={d.staleIn} />
        </Spec>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Spec label={P.searchLive}>
          <SearchBox setup={setup} variant="large" />
        </Spec>
        <Spec label={P.searchOpen}>
          <div className="min-h-[30rem]">
            <SearchBox setup={setup} initialQuery="rtx 50" initialOpen />
          </div>
        </Spec>
      </div>
    </Section>
  );
}

/** A 360 px phone showing one view of the catalogue in an iframe (real media queries). */
function Phone({ view, label }: { view: string; label: Text }) {
  const lang = useLang();
  const src = `/_preview?frame=${view}&lang=${lang}`;
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-fg/80 bg-page shadow-[var(--shadow-2)]">
        <iframe title={tr(lang, label)} src={src} width={360} height={740} className="block" loading="lazy" />
      </div>
      <figcaption className="text-sm text-muted">{tr(lang, label)}</figcaption>
    </figure>
  );
}

export function ShellSection({ d, setup }: { d: PreviewData; setup: SearchSetup }) {
  const lang = useLang();
  return (
    <Section id="shell" title={P.sShell} intro={P.shellIntro}>
      <div className="overflow-hidden rounded-xl border border-edge">
        <Header current="gpu" search={setup} counts={d.counts} />
        <div className="bg-page px-4 py-3">
          <Breadcrumbs items={crumbsFor(lang, 'gpu')} />
        </div>
      </div>
      <Spec label={P.menuOpen}>
        <div className="max-w-5xl">
          <MegaMenu current="gpu" counts={d.counts} />
        </div>
      </Spec>
      <div className="overflow-hidden rounded-xl border border-edge">
        <Footer sources={d.siteTimes} staleIn={d.staleIn} />
      </div>
      <Spec label={P.phone}>
        <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <Phone view="shell" label={P.fShell} />
          <Phone view="parts" label={P.fParts} />
          <Phone view="search" label={P.fSearch} />
          <Phone view="sheet" label={P.fSheet} />
          <Phone view="builder" label={P.fBuilder} />
        </div>
      </Spec>
    </Section>
  );
}

/** What a phone frame shows (`/_preview?frame=<view>`). */
export function FrameView({ view, d, setup }: { view: string; d: PreviewData; setup: SearchSetup }) {
  const lang = useLang();
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(20);
  const gpu = d.models.gpu.slice(0, 4).map((m) => listItem(d, 'gpu', m, lang, 'md'));
  const opts: Option[] = [...new Set(d.models.gpu.map((m) => m.group))].map((g) => ({ value: g, label: g, count: d.models.gpu.filter((m) => m.group === g).length }));
  const list = (
    <main id="main" className="flex flex-col gap-3 px-4 py-4">
      <Breadcrumbs items={crumbsFor(lang, 'gpu')} />
      <h1 className="text-2xl font-semibold tracking-tight">{tr(lang, CATS.gpu.name)}</h1>
      <div className="ui-chip-row -mx-4 px-4">
        {['NVIDIA', '16 GB', tr(lang, P.upTo900)].map((l) => (
          <AppliedChip key={l} label={l} />
        ))}
      </div>
      {gpu.map((g) => (
        <ProductCard key={g.name} item={g} />
      ))}
      <Pagination page={page} pages={5} per={per} onPage={setPage} onPer={setPer} />
    </main>
  );
  if (view === 'parts') {
    return (
      <>
        <Header current={null} search={setup} counts={d.counts} />
        <main id="main" className="px-4 py-4">
          <PartsPage current="gpu" counts={d.counts} search={setup} />
        </main>
      </>
    );
  }
  if (view === 'search') return <Header current="gpu" search={setup} counts={d.counts} phoneSearchOpen phoneSearchQuery="rtx 50" />;
  if (view === 'builder') {
    const parts = buildParts(d, lang);
    return (
      <>
        <Header current="builder" search={setup} counts={d.counts} />
        <main id="main" className="flex flex-col gap-3 px-4 py-4">
          <Breadcrumbs items={[{ label: tr(lang, UI.home), href: href.home }, { label: 'PC Builder' }]} />
          <ul className="ui-card">
            <PartRow slot={CATS.cpu.one!} icon={CATS.cpu.icon} part={parts.cpu} />
            <PartRow slot={CATS.gpu.one!} icon={CATS.gpu.icon} part={parts.gpu} />
            <PartRow slot={CATS.case.one!} icon={CATS.case.icon} part={parts.case} />
            <PartRow slot={CATS.psu.one!} icon={CATS.psu.icon} part={null} />
          </ul>
        </main>
      </>
    );
  }
  return (
    <>
      <Header current="gpu" search={setup} counts={d.counts} />
      {list}
      <Footer sources={d.siteTimes} staleIn={d.staleIn} />
      {view === 'sheet' && (
        <BottomSheet
          open
          title={tr(lang, P.filtersTitle)}
          onClose={() => {}}
          footer={
            <>
              <Button>{tr(lang, UI.clearFilters)}</Button>
              <Button variant="primary" className="flex-1">
                {tr(lang, P.showModels(d.models.gpu.length))}
              </Button>
            </>
          }
        >
          <CheckList title={tr(lang, P.gpuMakers)} options={opts} selected={new Set(['NVIDIA'])} onToggle={() => {}} />
        </BottomSheet>
      )}
    </>
  );
}

export function NotFoundSample({ d, setup }: { d: PreviewData; setup: SearchSetup }) {
  return <NotFoundPage counts={d.counts} search={setup} />;
}
