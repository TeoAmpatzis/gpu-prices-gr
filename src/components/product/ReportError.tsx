// "Found a mistake?" (step 4, task 9; part 8): a mailto link to the site's mailbox; the subject names the model and
// the page's address so the report can be checked at once.
import { Mail } from 'lucide-react';
import { tr, useLang } from '../../lib/i18n';
import { usePath } from '../../lib/router';
import { CONTACT_EMAIL } from '../../lib/site';
import { UI } from '../../ui/strings';

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
    <p>
      <a
        href={reportHref(name, location.href)}
        onPointerEnter={refresh}
        onFocus={refresh}
        onClick={refresh}
        data-report-error
        className="tap inline-flex items-center gap-2 text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        <Mail aria-hidden="true" className="size-4" />
        {tr(lang, UI.reportError)}
      </a>
    </p>
  );
}
