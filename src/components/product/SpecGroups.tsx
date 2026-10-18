// A product page's full specs (step 4, task 9; part 6): general, dimensions, power, connections (ui/specs.ts
// specGroups), each value as the data has it; a missing value is left out, and so is an empty group. Where each value
// came from (shop or maker) is not in the data, so no per-value source is shown.
import { useMemo } from 'react';
import { tr, useLang, type Text } from '../../lib/i18n';
import type { BaseListing, Category } from '../../types';
import { specGroups, type SpecGroupId } from '../../ui/specs';
import { UI } from '../../ui/strings';

const TITLE: Record<SpecGroupId, Text> = {
  general: UI.specGeneral,
  dimensions: UI.specDimensions,
  power: UI.specPower,
  connections: UI.specConnections,
};

export function SpecGroups({ cat, listings, estimate }: { cat: Category; listings: BaseListing[]; estimate?: { min: number; max: number } }) {
  const lang = useLang();
  const groups = useMemo(() => specGroups(cat, listings, lang, estimate), [cat, listings, lang, estimate]);
  if (groups.length === 0) return null;
  return (
    <section aria-label={tr(lang, UI.specsTitle)} data-spec-groups className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{tr(lang, UI.specsTitle)}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.id} data-spec-group={g.id} className="ui-card flex min-w-0 flex-col gap-2 p-4">
            <h3 className="text-sm font-semibold text-muted">{tr(lang, TITLE[g.id])}</h3>
            <dl className="flex flex-col divide-y divide-edge">
              {g.items.map((i) => (
                <div key={i.label} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <dt className="text-muted">{i.label}</dt>
                  <dd className="ui-num min-w-0 text-right font-medium text-fg [overflow-wrap:anywhere]">{i.value}
                    {i.tag && <span data-spec-tag className="ml-2 rounded bg-hover px-1.5 py-0.5 text-xs font-normal text-muted">{i.tag}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
