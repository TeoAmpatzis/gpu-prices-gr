// A product page's header (step 4, task 6; docs/redesign-v2.md "Σελίδα προϊόντος" part 1): photo, the key specs
// (./keySpecs: the category table's spec columns, in the table's order, filled from the spec line when fewer than
// four, storage from its spec line alone; never a price), the lowest price and the cheapest offer's shop link. The name is the page's <h1> (ModelPage).
// "Add to build" (task 8) is the page's (BuildFit.HeaderFit), passed in as `action`; "Compare" is v2.1 (backlog #12).
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CategoryConfig } from '../../lib/categories';
import { formatPrice, saleOf, type Model } from '../../lib/data';
import { isExamplePhoto } from '../../lib/examplePhoto';
import { T, tr, useLang } from '../../lib/i18n';
import { productImage } from '../../lib/images';
import { offerTotal } from '../../lib/offers';
import type { BaseListing } from '../../types';
import { LinkButton } from '../../ui/Button';
import { sellerLine } from '../../ui/PriceCell';
import { UI } from '../../ui/strings';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { keySpecs } from './keySpecs';
import { PRODUCT } from './productStrings';
import { ago } from '../../ui/strings';

/** A shop link: new tab, no opener, no referrer (as the category page's offer links), not followed by search engines. */
export const SHOP_REL = 'nofollow noopener noreferrer';

export function ProductHeader({
  cfg,
  model,
  photo,
  cheapest,
  action,
  selected = false,
  variants,
  checked,
}: {
  cfg: CategoryConfig<BaseListing>;
  model: Model<BaseListing>;
  /** The model has a stored photo (ModelEntry.photo): without one no photo is requested, the category icon shows. */
  photo: boolean;
  /** The first offer of the shops table (lowest total, else price: lib/offers.sortOffers). */
  cheapest: BaseListing;
  /** "Add to build" (task 8, BuildFit.HeaderFit), next to the shop link; none for a category that is no builder slot. */
  action?: ReactNode;
  selected?: boolean;
  variants?: ReactNode;
  checked?: string | null;
}) {
  const lang = useLang();
  const specs = keySpecs(cfg, model, lang);
  const sale = saleOf(model.listings, model.cheapest);
  const example = isExamplePhoto(cfg, model);
  const total = offerTotal(cheapest); // price + shipping, as on every row of the table
  const seller = sellerLine(lang, cheapest.source, cheapest.merchant);

  return (
    <section data-product-header className="product-hero">
      <div className="product-hero-photo">
        {/* The page's largest element (its LCP): loaded at once, not lazily as in the lists. */}
        <ProductPhoto
          image={productImage(cfg.id, model.key, photo)}
          size="lg"
          icon={cfg.icon}
          alt={tr(lang, PRODUCT.photo)}
          hint={tr(lang, PRODUCT.photoNote)}
          eager
        />
        <p className="mt-2 text-xs text-faint">{tr(lang, photo ? PRODUCT.photo : PRODUCT.noPhoto)}</p>
        {example && <span className="sr-only">{tr(lang, T.examplePhoto)}</span>}
      </div>

      <div className="product-hero-main">
        <h1 className="text-2xl font-semibold leading-8 tracking-tight [overflow-wrap:anywhere]">{model.chip}</h1>
        {specs.length > 0 && (
          <dl aria-label={tr(lang, UI.keySpecs)} className="product-spec-chips">
            {specs.map((s) => (
              <div key={s.key} data-spec className="min-w-0">
                <dt className="text-muted">{s.label}</dt>
                <dd className="ui-num font-semibold text-fg [overflow-wrap:anywhere]">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <LinkButton variant="primary" icon={ExternalLink} href={cheapest.url} target="_blank" rel={SHOP_REL} className="tap">
            {tr(lang, UI.toShop)}
            <span className="sr-only">{` (${seller}, ${tr(lang, UI.newTab)})`}</span>
          </LinkButton>
          {action}
        </div>
        {variants}
      </div>
        <div className="product-price-card ui-card">
          <span className="text-sm text-muted">{tr(lang, selected ? PRODUCT.price : UI.lowestTotal)}</span>
          <div className="flex flex-wrap items-center gap-2">
            {sale && (
              <span className="badge badge-sale" title={`${tr(lang, T.saleBy)}${sale.reference != null ? `: ${formatPrice(sale.reference, lang)}` : ''}`}>
                −{sale.pct}%
              </span>
            )}
            <span data-lowest className="ui-num text-[32px] font-bold leading-10 tracking-tight text-fg">
              {formatPrice(total ?? cheapest.price, lang)}
            </span>
          </div>
          <span className={`text-sm ${total != null ? 'text-muted' : 'text-faint'}`}>
            {tr(lang, total != null ? UI.withShipping : UI.noShipping)}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-sm text-fg-soft">
            <SourceBadge source={cheapest.source} />
            <span className="[overflow-wrap:anywhere]">{seller}</span>
          </span>
          <span className="text-xs text-muted">{tr(lang, UI.offerChecked)} {ago(lang, checked ?? null)}</span>
        </div>
    </section>
  );
}
