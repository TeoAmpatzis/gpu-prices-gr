// Review's power estimate (step 5 task 13): the engine's per-part figures (rule 14's formula, src/engine/rules/power.ts),
// their sum, the headroom, the card maker's figure and the recommended PSU; what is unknown is said, never guessed.
import type { PowerEstimate } from '../../engine/rules/power';
import { tr, type Lang } from '../../lib/i18n';
import { BUILDER as B, fill } from '../../ui/builderStrings';

export default function PowerBreakdown({ power, watts, lang }: { power: PowerEstimate; watts: number | null; lang: Lang }) {
  const t = (x: { el: string; en: string }) => tr(lang, x);
  const row = (label: string, value: string, strong = false) => (
    <li className={`flex justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-muted'}>{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </li>
  );
  return (
    <section aria-labelledby="power-title" className="flex flex-col gap-2" data-power>
      <h3 id="power-title" className="text-sm font-semibold">
        {t(B.power)}
      </h3>
      <ul className="flex flex-col divide-y divide-line text-sm [&>li]:py-2">
        {power.parts.map((p) => (
          <li key={p.key} className="flex justify-between gap-3">
            <span className="min-w-0 text-muted">{t(p.label)}</span>
            <span className="shrink-0 tabular-nums">{p.watts} W</span>
          </li>
        ))}
        {power.totalW != null && row(t(B.powerSum), `${power.totalW} W`)}
        {power.formulaW != null && row(t(B.headroom), `${power.formulaW} W`)}
        {power.makerW != null && row(t(B.makerPsu), `${power.makerW} W`)}
        {watts != null && row(t(B.recommendedPsu), `≥ ${watts} W`, true)}
      </ul>
      {power.totalW == null && power.missing.length > 0 && (
        <p className="text-sm text-muted">{fill(t(B.powerMissing), { what: power.missing.map((m) => t(m)).join(', ') })}</p>
      )}
    </section>
  );
}
