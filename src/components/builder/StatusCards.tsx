import type { BuilderState } from '../../lib/builderState';
import { buildStatus, missingSlots } from '../../lib/builderEngine';
import { tr, type Lang } from '../../lib/i18n';
import { formatPrice } from '../../lib/format';

export default function StatusCards({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: { el: string; en: string }) => tr(lang, x);
  const status = buildStatus(state.findings, missingSlots(state.build, state.optFindings));
  const restoring = state.pending.length > 0 || state.pendingStorage2;
  return <div className="builder-status-grid" data-builder-status>
    <section className="card builder-status-card">
      <h2>{t({ el: 'Συμβατότητα', en: 'Compatibility' })}</h2>
      {state.findings === null || restoring ? <p>{t({ el: 'Οι έλεγχοι δεν έχουν ολοκληρωθεί.', en: 'Checks are not complete.' })}</p> : <>
        <div className="flex flex-wrap gap-1.5">
          <span className="badge badge-fits">{status.counts.fits} {t({ el: 'χωράνε', en: 'fit' })}</span>
          <span className="badge badge-likely">{status.counts.likely} {t({ el: 'πιθανότατα', en: 'likely' })}</span>
          <span className="badge badge-unverified">{status.counts.unverified + status.counts.check} {t({ el: 'προς έλεγχο', en: 'to check' })}</span>
          <span className="badge badge-no">{status.counts.no} {t({ el: 'ασύμβατα', en: 'incompatible' })}</span>
        </div>
        <p>{t({ el: 'Οι ενδείξεις αφορούν μόνο τα επιλεγμένα εξαρτήματα.', en: 'Checks cover the selected parts only.' })}</p>
      </>}
    </section>
    <section className="card builder-status-card">
      <h2>{t({ el: 'Κατανάλωση · εκτίμηση', en: 'Power draw · estimate' })}</h2>
      <div className="builder-status-value">{state.power?.totalW != null ? `${state.power.totalW} W` : '—'}</div>
      <p>{state.psuWatts != null ? `${t({ el: 'Προτεινόμενο τροφοδοτικό', en: 'Recommended PSU' })}: ≥ ${state.psuWatts} W` : t({ el: 'Δεν υπάρχουν ακόμα αρκετά στοιχεία.', en: 'Not enough data yet.' })}</p>
    </section>
    <section className="card builder-status-card">
      <h2>{t({ el: 'Σύνολο εξαρτημάτων', en: 'Parts total' })}</h2>
      <div className="builder-status-value">{formatPrice(state.resolvedTotal, lang)}{restoring && ' + …'}</div>
      <p>{t({ el: 'Χωρίς μεταφορικά. Άγνωστες ή μη διαθέσιμες επιλογές δεν προσμετρώνται.', en: 'Shipping excluded. Unresolved or unavailable selections are not counted.' })}</p>
    </section>
  </div>;
}
