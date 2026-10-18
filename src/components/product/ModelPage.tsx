// A model's page, /<cat>/<slug> (step 4): the address handling (task 5: title, breadcrumbs, the moved /
// no-longer-available / loading states), then the header and the shops table (task 6), price history (task 7), fit
// with the saved build and add / replace (task 8).
import { PackageX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type CategoryConfig } from '../../lib/categories';
import { groupModels, ownTotal } from '../../lib/data';
import { tr, useLang } from '../../lib/i18n';
import type { Slot } from '../../lib/slots';
import { guardMoved, resolveModel, type ModelResolution } from '../../lib/modelData';
import { sortOffers } from '../../lib/offers';
import { navigate } from '../../lib/router';
import { CATS, href } from '../../shell/nav';
import { PageTitle } from '../../shell/PageTitle';
import type { BaseListing, Category, ModelChunk, ModelEntry } from '../../types';
import { LinkButton } from '../../ui/Button';
import type { Crumb } from '../../ui/nav';
import { ErrorState, SkeletonRows } from '../../ui/states';
import { UI } from '../../ui/strings';
import { HeaderFit, OfferFitAction, OfferFitLine, useProductFit, type ProductFit } from './fitUi';
import { OffersTable } from './OffersTable';
import { PriceHistory } from './PriceHistory';
import { ProductHeader } from './ProductHeader';

type State = { for: string; res: ModelResolution } | { for: string; error: string } | null;

export default function ModelPage({ cat, slug }: { cat: Category; slug: string }) {
  const lang = useLang();
  const id = `${cat}/${slug}`;
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);
  const left = useRef(new Set<string>()); // slugs of this address already left by a redirect (loop guard)

  useEffect(() => {
    let live = true;
    resolveModel(cat, slug).then(
      (found) => {
        if (!live) return;
        const res = guardMoved(found, slug, left.current);
        // An old address: the new one replaces it (no history entry), query string and hash kept.
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
  const name = mine && 'res' in mine && mine.res.kind === 'ok' ? mine.res.entry.chip : null;
  useEffect(() => {
    document.title = `${name ?? catName} — BuildDraft.gr`; // the separator every other page uses
  }, [name, catName]);

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
      return res.entry.parts ? (
        <ProductWithFit cat={cat} entry={res.entry} sources={res.sources} builtAt={res.builtAt} crumbs={crumbs(res.entry.chip)} />
      ) : (
        <Product cat={cat} entry={res.entry} sources={res.sources} crumbs={crumbs(res.entry.chip)} fit={null} />
      );
    default: {
      const never: never = res;
      return never;
    }
  }
}

type ProductProps = { cat: Category; entry: ModelEntry; sources: ModelChunk['sources']; crumbs: Crumb[] };

/** A builder part's page: the fit with the saved build (the nine categories are the builder's nine slots). */
function ProductWithFit(props: ProductProps & { builtAt: string }) {
  const fit = useProductFit(props.cat as Slot, props.entry, props.builtAt);
  return <Product {...props} fit={fit} />;
}

/** The model's page proper: title, header, shops table, price history, fit with the build. */
function Product({ cat, entry, sources, crumbs, fit }: ProductProps & { fit: ProductFit | null }) {
  const cfg = CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>;
  // The model as the category page groups it (same ownTotal, same column values); every listing of the entry is this
  // one model, so the key is the entry's.
  const model = useMemo(() => groupModels(entry.listings.map(ownTotal), { ...cfg, modelKey: () => entry.key })[0], [cfg, entry]);
  const offers = useMemo(() => sortOffers(entry.listings), [entry]);
  return (
    <>
      <PageTitle crumbs={crumbs} title={{ el: entry.chip, en: entry.chip }} />
      <div className="flex flex-col gap-8">
        <ProductHeader
          cfg={cfg}
          model={{ ...model, chip: entry.chip }}
          photo={entry.photo}
          cheapest={offers[0]}
          action={fit && <HeaderFit p={fit} />}
        />
        <OffersTable
          key={entry.key}
          cat={cat}
          chip={entry.chip}
          offers={offers}
          sources={sources}
          // Graphics cards: the builder picks a card (an offer), so each offer has its verdict and button.
          fitLine={fit?.slot === 'gpu' ? (l) => <OfferFitLine p={fit} l={l} /> : undefined}
          fitAction={fit?.slot === 'gpu' ? (l, short) => <OfferFitAction p={fit} l={l} short={short} /> : undefined}
        />
        <PriceHistory entry={entry} />
        {/* The check and the section (only with a saved build): a chunk loaded after the first paint. */}
        {fit?.runner}
      </div>
    </>
  );
}
