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
import { SOURCES } from '../../lib/sources';
import type { BaseListing } from '../../types';
import { LinkButton } from '../../ui/Button';
import { sellerLine } from '../../ui/PriceCell';
import { UI } from '../../ui/strings';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { keySpecs } from './keySpecs';

/** A shop link: new tab, no opener, no referrer (as the category page's offer links), not followed by search engines. */
export const SHOP_REL = 'nofollow noopener noreferrer';

export function ProductHeader({
  cfg,
  model,
  photo,
  cheapest,
  action,
}: {
  cfg: CategoryConfig<BaseListing>;
  model: Model<BaseListing>;
  /** The model has a stored photo (ModelEntry.photo): without one no photo is requested, the category icon shows. */
  photo: boolean;
  /** The first offer of the shops table (lowest total, else price: lib/offers.sortOffers). */
  cheapest: BaseListing;
  /** "Add to build" (task 8, BuildFit.HeaderFit), next to the shop link; none for a category that is no builder slot. */
  action?: ReactNode;
}) {
  const lang = useLang();
  const specs = keySpecs(cfg, model, lang);
  const sale = saleOf(model.listings, model.cheapest);
  const example = isExamplePhoto(cfg, model);
  const total = offerTotal(cheapest); // price + shipping, as on every row of the table
  const seller = sellerLine(lang, cheapest.source, cheapest.merchant);

  return (
    <section data-product-header className="ui-card flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <div className="shrink-0">
        {/* The page's largest element (its LCP): loaded at once, not lazily as in the lists. */}
        <ProductPhoto
          image={productImage(cfg.id, model.key, photo)}
          size="lg"
          icon={cfg.icon}
          alt={model.chip}
          hint={example ? tr(lang, T.examplePhoto) : undefined}
          eager
        />
        {example && <p className="mt-1 max-w-40 text-xs text-faint">{tr(lang, T.examplePhoto)}</p>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {specs.length > 0 && (
          <dl aria-label={tr(lang, UI.keySpecs)} className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:max-w-xl">
            {specs.map((s) => (
              <div key={s.key} data-spec className="min-w-0">
                <dt className="text-xs text-faint">{s.label}</dt>
                <dd className="ui-num text-sm font-medium text-fg [overflow-wrap:anywhere]">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex min-w-0 flex-col items-start gap-1.5 lg:items-end lg:text-right">
          <span className="text-xs text-muted">{tr(lang, UI.lowestTotal)}</span>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {sale && (
              <span className="badge badge-sale" title={`${tr(lang, T.saleBy)} ${SOURCES[sale.source].label}`}>
                −{sale.pct}%
              </span>
            )}
            <span data-lowest className="ui-num text-2xl font-semibold leading-8 text-fg">
              {formatPrice(total ?? cheapest.price, lang)}
            </span>
          </div>
          <span className={`text-sm ${total != null ? 'text-muted' : 'text-faint'}`}>
            {tr(lang, total != null ? UI.withShipping : UI.noShipping)}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-sm text-fg-soft lg:justify-end">
            <SourceBadge source={cheapest.source} />
            <span className="[overflow-wrap:anywhere]">{seller}</span>
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-end">
            <LinkButton variant="primary" icon={ExternalLink} href={cheapest.url} target="_blank" rel={SHOP_REL} className="tap">
              {tr(lang, UI.toShop)}
              <span className="sr-only">{` (${seller}, ${tr(lang, UI.newTab)})`}</span>
            </LinkButton>
            {action}
          </div>
        </div>
      </div>
    </section>
  );
}
