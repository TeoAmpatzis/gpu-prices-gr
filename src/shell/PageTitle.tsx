import { tr, useLang, type Text } from '../lib/i18n';
import { Breadcrumbs, type Crumb } from '../ui/nav';

/** Every page's top: where it is (breadcrumbs: UX-03), its title and one line about it. */
export function PageTitle({ crumbs, title, subtitle, compact = false }: { crumbs?: Crumb[]; title: Text; subtitle?: Text; compact?: boolean }) {
  const lang = useLang();
  return (
    <div className={`${compact ? 'mb-4' : 'mb-6'} flex flex-col gap-2`}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <h1 className={`text-2xl font-semibold tracking-tight${compact ? '' : ' sm:text-3xl'}`}>{tr(lang, title)}</h1>
      {subtitle && <p className="text-sm text-muted">{tr(lang, subtitle)}</p>}
    </div>
  );
}
