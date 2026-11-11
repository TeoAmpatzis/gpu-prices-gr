// A model's page, /<cat>/<slug> (step 4): the address handling (task 5: title, breadcrumbs, the moved /
// no-longer-available / loading states), then the header and the shops table (task 6), price history (task 7), fit
// with the saved build and add / replace (task 8).
import { PackageX } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type CategoryConfig } from '../../lib/categories';
import { groupModels, ownTotal } from '../../lib/data';
import { tr, useLang } from '../../lib/i18n';
import { applyMeta, pageMeta, productJsonLd } from '../../lib/pageMeta';
import type { Slot } from '../../lib/slots';
import { guardMoved, resolveModel, type ModelResolution } from '../../lib/modelData';
import { checkedAt, sortOffers } from '../../lib/offers';
import { navigate, onUrlChange } from '../../lib/router';
import { hasProductSelection, readProductSelection, resolveProductSelection, type ProductSelection } from '../../lib/productSelection';
import { CATS, href } from '../../shell/nav';
import { PageTitle } from '../../shell/PageTitle';
import type { BaseListing, Category, ModelChunk, ModelEntry } from '../../types';
import { LinkButton } from '../../ui/Button';
import { Breadcrumbs, type Crumb } from '../../ui/nav';
import { ErrorState, SkeletonRows } from '../../ui/states';
import { UI } from '../../ui/strings';
import { Alternatives } from './Alternatives';
import type { ProductFitView } from './fitUi';
import { OffersTable } from './OffersTable';
import { PriceHistory } from './PriceHistory';
import { CompareButton } from '../compare/CompareButton';
import { ProductHeader } from './ProductHeader';
import { ReportError } from './ReportError';
import { SpecGroups } from './SpecGroups';
import { Variants } from './Variants';
import './product.css';

type State = { for: string; res: ModelResolution } | { for: string; error: string } | null;

const ProductWithFit = lazy(() => import('./fitUi').then((m) => ({ default: m.ProductWithFit })));

export default function ModelPage({ cat, slug }: { cat: Category; slug: string }) {
  const lang = useLang();
  const id = `${cat}/${slug}`;
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState(() => location.search);
  useEffect(() => onUrlChange(() => setSearch(location.search)), []);
  const selection = useMemo(() => readProductSelection(search), [search]);
  const requested = hasProductSelection(search);
  const left = useRef(new Set<string>()); // slugs of this address already left by a redirect (loop guard)

  useEffect(() => {
    let live = true;
    resolveModel(cat, slug).then(
      (found) => {
        if (!live) return;
        const res = guardMoved(found, slug, left.current);
        // An old address, or another spelling / letter case of the model's (task 13): the canonical one replaces it
        // (no history entry), query string and hash kept.
        if (res.kind === 'moved') navigate(`/${cat}/${res.slug}${location.search}${location.hash}`, { replace: true });
        else setState({ for: id, res });
      },
      (e: unknown) => live && setState({ for: id, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [cat, slug, id, attempt]);

  const catName = tr(lang, CATS[cat].name);
  const crumbs = (last: string) => [{ label: tr(lang, UI.home), href: '/' }, { label: catName, href: href.category(cat) }, { label: last }];
  const mine = state && state.for === id ? state : null;

  // The tab title names the model once it is known (App leaves model pages' titles to this page); until then, and on
  // the gone / error states, the category's.
  const name = mine && 'res' in mine && mine.res.kind === 'ok' ? (selection && resolveProductSelection(mine.res.entry.listings, selection)?.title) || mine.res.entry.chip : null;
  const listings = mine && 'res' in mine && mine.res.kind === 'ok' ? mine.res.entry.listings : null;
  useEffect(() => {
    if (!name || !listings?.length) {
      applyMeta(pageMeta(`/${cat}`, lang)); // until the model is known, and on the gone / error states, the category's
      return;
    }
    const prices = listings.map((l) => l.price);
    const data = { name, low: Math.min(...prices), high: Math.max(...prices), shops: new Set(listings.map((l) => l.source)).size };
    const meta = pageMeta(`/${cat}/${slug}`, lang, data);
    applyMeta(meta, productJsonLd(meta, data));
    return () => document.head.querySelector('script[data-jsonld]')?.remove();
  }, [name, listings, cat, slug, lang]);

  if (!mine) return <SkeletonRows />;
  if ('error' in mine) {
    return (
      <ErrorState
        detail={mine.error}
        onRetry={() => {
          setState(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  const res = mine.res;
  switch (res.kind) {
    case 'moved': // the redirect is under way (the address is replaced)
      return <SkeletonRows />;
    case 'gone':
      return (
        <div className="flex flex-col items-start gap-4">
          <PageTitle crumbs={crumbs(slug)} title={UI.goneTitle} subtitle={UI.goneText} />
          <LinkButton variant="primary" icon={PackageX} href={href.category(cat)}>
            {tr(lang, UI.goneAction)}
          </LinkButton>
        </div>
      );
    case 'ok':
      if (requested && (!selection || !resolveProductSelection(res.entry.listings, selection))) return (
        <div className="flex flex-col items-start gap-4" data-selection-unavailable>
          <PageTitle crumbs={crumbs(res.entry.chip)} title={{ el: 'Η επιλογή προϊόντος δεν είναι διαθέσιμη', en: 'Product selection unavailable' }} subtitle={{ el: 'Η συγκεκριμένη καταχώριση δεν βρέθηκε. Μπορείς να δεις τις διαθέσιμες εναλλακτικές της οικογένειας.', en: 'This listing could not be found. You can view the available family alternatives.' }} />
          <LinkButton href={`/${cat}/${res.entry.slug}`} variant="secondary">{tr(lang, { el: 'Προβολή οικογένειας προϊόντων', en: 'View product family' })}</LinkButton>
        </div>
      );
      return res.entry.parts ? (
        <Suspense fallback={<SkeletonRows />}>
          <ProductWithFit slot={cat as Slot} entry={res.entry} builtAt={res.builtAt} selection={selection ?? undefined}>
            {(fit) => <Product cat={cat} entry={res.entry} sources={res.sources} crumbs={crumbs(res.entry.chip)} fit={fit} selection={selection ?? undefined} />}
          </ProductWithFit>
        </Suspense>
      ) : (
        <Product cat={cat} entry={res.entry} sources={res.sources} crumbs={crumbs(res.entry.chip)} fit={null} selection={selection ?? undefined} />
      );
    default: {
      const never: never = res;
      return never;
    }
  }
}

type ProductProps = { cat: Category; entry: ModelEntry; sources: ModelChunk['sources']; crumbs: Crumb[]; selection?: ProductSelection };

/** The model's page proper: title, header, shops table, price history, fit with the build. */
function Product({ cat, entry, sources, crumbs, fit, selection }: ProductProps & { fit: ProductFitView | null }) {
  const cfg = CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
  // The model as the category page groups it (same ownTotal, same column values); every listing of the entry is this
  // one model, so the key is the entry's.
  const selected = selection ? resolveProductSelection(entry.listings, selection) : null;
  const listings = useMemo(() => selected ? [selected] : entry.listings, [entry, selected]);
  const model = useMemo(() => groupModels(listings.map(ownTotal), { ...cfg, modelKey: () => entry.key })[0], [cfg, entry, listings]);
  const offers = useMemo(() => sortOffers(entry.listings), [entry]);
  const siblings = selected ? offers.filter((l) => l.source !== selected.source || l.id !== selected.id) : [];
  return (
    <div className="product-page">
      <Breadcrumbs items={selected ? [...crumbs.slice(0, -1), { label: entry.chip, href: `/${cat}/${entry.slug}` }, { label: selected.title }] : crumbs} />
      <div className="flex flex-col gap-8">
        <ProductHeader
          cfg={cfg}
          model={{ ...model, chip: selected?.title ?? entry.chip }}
          photo={entry.photo}
          cheapest={selected ? ownTotal(selected) : offers[0]}
          action={
            <>
              {fit?.header}
              <CompareButton item={{ cat, slug: entry.slug, ...(selected ? { selection: { source: selected.source, id: selected.id } } : {}) }} name={selected?.title ?? entry.chip} />
            </>
          }
          selected={!!selected}
          checked={checkedAt(sources, (selected ?? offers[0]).source)}
          variants={<Variants cat={cat} entry={entry} />}
        />
        {selected && <OffersTable cat={cat} chip={entry.chip} offers={[selected]} sources={sources} selectedSource />}
        {(!selected || siblings.length > 0) &&
        <OffersTable
          key={entry.key}
          cat={cat}
          chip={entry.chip}
          offers={selected ? siblings : offers}
          sources={sources}
          alternatives={!!selected}
          familySlug={entry.slug}
          // Graphics cards: the builder picks a card (an offer), so each offer has its verdict and button.
          fitLine={fit?.offerLine}
          fitAction={fit?.offerAction}
        />}
        <div className={`product-analysis ${fit?.show ? 'product-analysis-with-fit' : ''}`}>
        <PriceHistory entry={entry} />
        {/* The check and the section (only with a saved build): a chunk loaded after the first paint. */}
        {fit?.runner}
        </div>
        <SpecGroups cat={cat} listings={listings} estimate={selected ? undefined : entry.lengthEstimate} />
        <Alternatives cat={cat} icon={cfg.icon} alternatives={entry.alternatives} />
        <ReportError name={selected?.title ?? entry.chip} />
      </div>
    </div>
  );
}
