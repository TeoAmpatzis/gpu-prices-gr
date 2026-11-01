import type { PsuListing } from '../../types';
import type { AnyModel } from '../../lib/builderState';
import { tr, type Lang } from '../../lib/i18n';
import { BUILDER as B } from '../../ui/builderStrings';

export default function PsuCard({ m, lang }: { m: AnyModel; lang: Lang }) {
  const p = m.cheapest as PsuListing;
  const modular = p.modular && { Full: B.fullModular, Semi: B.semiModular, Non: B.nonModular }[p.modular];
  return <span data-card="psu">{[`${p.watts} W`, p.efficiency ? `80+ ${p.efficiency}` : tr(lang, B.noEfficiency), p.formFactor, p.atx3 && 'ATX 3.x', modular && tr(lang, modular)].filter(Boolean).join(' · ')}</span>;
}
