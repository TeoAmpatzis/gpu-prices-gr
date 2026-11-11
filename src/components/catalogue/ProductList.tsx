import type { BaseListing } from '../../types';
import type { ReactNode } from 'react';
import type { CategoryConfig } from '../../lib/categories';
import type { CatalogueRecord } from '../../lib/catalogueFilters';
import { formatPrice, saleOf, type Model } from '../../lib/data';
import { productHref } from '../../lib/productSelection';
import { CompareButton } from '../compare/CompareButton';
import { T, tr, useLang } from '../../lib/i18n';
import { SOURCES } from '../../lib/sources';
import { productImage } from '../../lib/images';
import { Photo } from '../../ui/Photo';
import { UI } from '../../ui/strings';
import { productSpecs } from './specs';
import './catalogue.css';

/** Pick mode (`?pick=1`, src/components/PickView.tsx): what a model's row adds. */
export interface RowExtra<L extends BaseListing> {
  /** Conservative exact-listing fit badge; absent outside pick mode. */
  badge?: ReactNode;
  /** Greyed: "Only compatible" is off and the model would be hidden (its reason is in `extra`). */
  dim: boolean;
  /** Findings and the "Add to build" button, under the name. */
  extra: ReactNode;
  /** Per offer in the open row (graphics cards: each card is added on its own): greyed or not, and what it adds. */
  listing?: (l: L) => { dim: boolean; extra: ReactNode };
}
export type RowPick<L extends BaseListing> = (m: Model<L>) => RowExtra<L>;

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  products: CatalogueRecord<L>[];
  cards: boolean;
  pick?: RowPick<L>;
  onReset: () => void;
  emptyExtra?: ReactNode;
  /** Keys of the models that have a photo (list.v2.json `photos`); without it every row shows the category icon. */
  photos?: Set<string>;
}
export default function ProductList<L extends BaseListing>({ cfg, products, cards, pick, onReset, emptyExtra, photos }: Props<L>) {
  const lang = useLang();
  const t = (text: { el: string; en: string }) => tr(lang, text);
  if (!products.length)
    return (
      <div className="catalogue-empty">
        <p>{tr(lang, cfg.empty)}</p>
        {emptyExtra}
        <button className="ui-btn ui-btn--secondary" onClick={onReset}>
          {t(UI.catalogueClear)}
        </button>
      </div>
    );
  const details = (p: CatalogueRecord<L>) => {
    const l = p.listing;
    const href = productHref(cfg.id, p.familySlug, l);
    const singleton = { ...p.family, listings: [l], cheapest: l };
    const row = pick?.(singleton);
    const extra = row?.listing?.(l) ?? row;
    // A deal and "lowest" come from the model's price history (src/lib/deals.ts); only the offer at that price shows them.
    const sale = saleOf([l], l);
    const lowest = l.lowestSince != null && l.price <= p.family.cheapest.price + 0.005;
    const specs = productSpecs(cfg.id, l, lang);
    const measured = specs
      .filter((s) => s.value)
      .slice(0, 3)
      .map((s) => s.value)
      .join(' · ');
    const gpu = l as BaseListing & { vram?: number; memType?: string | null };
    const known = [cfg.id === 'gpu' && gpu.vram ? `${gpu.vram} GB ${gpu.memType ?? ''}`.trim() : '', measured].filter(Boolean).join(' · ');
    return {
      href,
      extra,
      specs,
      known,
      name: (
        <div className="catalogue-product-name">
          <Photo image={productImage(cfg.id, p.family.key, photos?.has(p.family.key) ?? false)} size={cards ? 'md' : 'sm'} icon={cfg.icon} alt="" />
          <div>
            <a data-product-link href={href}>
              {l.title || l.chip}
            </a>
            <p>{known || t(UI.catalogueMissing)}</p>
            {known && specs[0]?.value == null && <span className="catalogue-missing">{tr(lang, specs[0].label)}: {t(UI.catalogueMissing)}</span>}
            <span className="catalogue-source">{SOURCES[l.source].label}</span>
            {row?.badge}
          </div>
        </div>
      ),
      price: (
        <div className="catalogue-price">
          <strong>
            {formatPrice(l.price, lang)}
            {sale && (
              <span className="badge badge-sale ml-1.5 align-middle" title={`${t(T.saleBy)}${sale.reference != null ? `: ${formatPrice(sale.reference, lang)}` : ''}`}>
                −{sale.pct}%
              </span>
            )}
            {lowest && (
              <span className="badge badge-low ml-1 align-middle" title={`${t(T.allTimeLowHint)} ${new Date(l.lowestSince!).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB')}`}>
                {t(T.allTimeLow)}
              </span>
            )}
          </strong>
          <span>
            {l.merchant && l.merchant !== SOURCES[l.source].label ? `${l.merchant} · ` : ''}
            {SOURCES[l.source].label} ·{' '}
            {l.shipping == null ? t(UI.noShipping) : l.shipping === 0 ? t(UI.freeShipping) : `+${formatPrice(l.shipping, lang)} ${t(UI.shippingPlus)}`}
          </span>
        </div>
      ),
      action: extra?.extra ?? (
        <span className="inline-flex items-center gap-1.5">
          <a className="ui-btn ui-btn--primary ui-btn--sm" href={href}>
            {t(UI.catalogueView)}
          </a>
          {/* Not in the builder's picker (`pick`): there the action is "Add to build". */}
          {!pick && <CompareButton iconOnly item={{ cat: cfg.id, slug: p.familySlug, selection: { source: l.source, id: l.id } }} name={l.title || l.chip} />}
        </span>
      ),
    };
  };
  if (cards)
    return (
      <ul className="catalogue-cards">
        {products.map((p) => {
          const d = details(p);
          return (
            <li className={`catalogue-card ${d.extra?.dim ? 'opacity-50' : ''}`} key={p.key} data-product-key={p.key}>
              {d.name}
              <div className="catalogue-card-footer">
                {d.price}
                <div className="catalogue-action">{d.action}</div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  const columns = productSpecs(cfg.id, products[0].listing, lang);
  return (
    <div className="catalogue-table-wrap">
      <table className="catalogue-table">
        <caption className="sr-only">{tr(lang, cfg.title)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(UI.catalogueModel)}</th>
            {columns.map((s, i) => (
              <th scope="col" key={i} className={`catalogue-spec spec-${i} ${s.hide ? 'spec-optional' : ''}`}>
                {tr(lang, s.label)}
              </th>
            ))}
            <th scope="col" className="catalogue-price-heading">
              {t(UI.cataloguePrice)}
            </th>
            <th scope="col">
              <span className="sr-only">{t(UI.catalogueAction)}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const d = details(p);
            return (
              <tr key={p.key} data-product-key={p.key} className={d.extra?.dim ? 'opacity-50' : ''}>
                <th scope="row">{d.name}</th>
                {d.specs.map((s, i) => (
                  <td key={i} className={`catalogue-spec spec-${i} ${s.hide ? 'spec-optional' : ''}`}>
                    {s.value ?? <span className="text-muted">{t(UI.catalogueMissing)}</span>}
                  </td>
                ))}
                <td>{d.price}</td>
                <td className="catalogue-action">{d.action}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
