import type { BuilderState } from '../../lib/builderState';
import { lineTitle, shopName } from '../../lib/copyList';
import { formatPrice } from '../../lib/format';
import { tr, type Lang } from '../../lib/i18n';

/** Shipping belongs to the exact selected offer. Never infer a combined shop basket from source listings. */
export default function PurchaseSummary({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: { el: string; en: string }) => tr(lang, x);
  const lines = state.resolvedLines.filter((r) => r.displayModel !== null);
  return <section className="card builder-purchase" data-purchase-summary>
    <h2 className="font-semibold">{t({ el: 'Πώς θα τα αγοράσεις', en: 'How you will buy it' })}</h2>
    <p className="text-xs text-muted">{t({ el: 'Οι επιλεγμένες προσφορές ανά εξάρτημα. Αλλαγή από «Άλλο κατάστημα» στη λίστα.', en: 'Selected offers per part. Use “Other shop” in the list to change an offer.' })}</p>
    <ul className="divide-y divide-line">
      {lines.map((r) => <li key={r.line} className="py-3 text-sm">
        <p className="font-medium [overflow-wrap:anywhere]">{lineTitle(r, lang)}</p>
        <div className="mt-1 flex flex-wrap justify-between gap-2"><span className="text-muted">{shopName(r)}</span><span className="font-mono">{formatPrice(r.total, lang)}</span></div>
        <p className="mt-1 text-xs text-muted">{r.offer.ship != null ? `${t({ el: 'Μεταφορικά προσφοράς', en: 'Offer shipping' })}: ${formatPrice(r.offer.ship, lang)}` : t({ el: 'Άγνωστα μεταφορικά', en: 'Shipping unknown' })}</p>
      </li>)}
    </ul>
    {!lines.length && <p className="text-sm text-muted">{t({ el: 'Επίλεξε εξαρτήματα για να δεις τις προσφορές.', en: 'Choose parts to see purchase offers.' })}</p>}
    <p className="border-t border-line pt-3 text-xs text-muted">{t({ el: 'Τα μεταφορικά δεν αθροίζονται σε κοινό καλάθι. Επιβεβαίωσε το τελικό κόστος στο κατάστημα.', en: 'Shipping is not combined into a shared basket. Confirm the final cost at the shop.' })}</p>
  </section>;
}
