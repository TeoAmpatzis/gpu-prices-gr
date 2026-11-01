import type { PsuListing } from '../../types';
import type { AnyModel } from '../../lib/builderState';
import type { Lang } from '../../lib/i18n';
import { psuText } from '../../lib/copyList';

/** The PSU picker card's specs; the part list, Review and Copy list use the same text (copyList.psuText). */
export default function PsuCard({ m, lang }: { m: AnyModel; lang: Lang }) {
  return <span data-card="psu">{psuText(m.cheapest as PsuListing, lang)}</span>;
}
