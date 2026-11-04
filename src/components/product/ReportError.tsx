// "Found a mistake?" (step 4, task 9; part 8): a mailto link to the site's mailbox; the subject names the model and
// the page's address so the report can be checked at once.
import { Mail } from 'lucide-react';
import { tr, useLang } from '../../lib/i18n';
import { usePath } from '../../lib/router';
import { CONTACT_EMAIL } from '../../lib/site';
import { UI } from '../../ui/strings';
import { PRODUCT } from './productStrings';

/** mailto:<site mailbox>?subject=<model name> — <page URL>, URL-encoded. */
export const reportHref = (name: string, url: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${name} — ${url}`)}`;

export function ReportError({ name }: { name: string }) {
  const lang = useLang();
  usePath(); // re-renders when the address changes, so the rendered link follows it
  // The address at the moment of use (filters and redirects change it without a render): refreshed on hover, focus and click.
  const refresh = (e: { currentTarget: HTMLAnchorElement }) => {
    e.currentTarget.href = reportHref(name, location.href);
  };
  return (
    <section aria-label={tr(lang, PRODUCT.correction)} className="product-correction ui-card">
      <p className="text-sm text-muted">{tr(lang, PRODUCT.correction)}</p>
      <a
        href={reportHref(name, location.href)}
        onPointerEnter={refresh}
        onFocus={refresh}
        onClick={refresh}
        data-report-error
        className="ui-btn ui-btn--secondary tap"
      >
        <Mail aria-hidden="true" className="size-4" />
        {tr(lang, UI.reportError)}
      </a>
    </section>
  );
}
