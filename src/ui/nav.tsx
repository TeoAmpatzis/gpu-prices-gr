import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { shortAgo } from '../lib/data';
import { SOURCES } from '../lib/sources';
import type { SourceName } from '../types';
import { isStale } from './PriceCell';
import { UI } from './strings';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Where the page is: Αρχική › Κάρτες γραφικών › RTX 5070 12GB. The last item is the current page (not a
 * link). On phones the middle items fold into "…" so the trail stays on one line.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const lang = useLang();
  return (
    <nav aria-label={tr(lang, UI.breadcrumb)} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          const middle = i > 0 && !last && items.length > 2;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden="true" className={`text-faint ${middle ? 'hidden sm:block' : ''}`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              )}
              {middle && i === 1 && (
                <li aria-hidden="true" className="sm:hidden">
                  …
                </li>
              )}
              <li className={`min-w-0 ${middle ? 'hidden sm:block' : ''} ${last ? 'truncate' : 'shrink-0'}`}>
                {last || !c.href ? (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-fg' : ''}>
                    {c.label}
                  </span>
                ) : (
                  <a href={c.href} className="tap inline-flex items-center rounded hover:text-fg hover:underline">
                    {c.label}
                  </a>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export interface SourceTimes {
  [source: string]: { updatedAt: string | null; ok?: boolean } | undefined;
}

/**
 * "Πηγές: Skroutz 3 ώρ. · BestPrice 2 ώρ. · …" — every source with its own last update, always visible
 * (UX-04: sources, not shops). A source older than 24 h is marked ⚠ with its age; on the site-wide
 * line (footer) the categories where that happens are named (backlog #9).
 */
export function StatusLine({
  sources,
  staleIn,
}: {
  sources: SourceTimes;
  /** Site-wide: source × category pairs older than 24 h. */
  staleIn?: { source: SourceName; category: Text; updatedAt: string }[];
}) {
  const lang = useLang();
  const names = (Object.keys(SOURCES) as SourceName[]).filter((s) => sources[s]);
  return (
    <div className="flex flex-col gap-1 text-sm text-muted">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-medium text-fg-soft">{tr(lang, UI.sources)}:</span>
        {names.map((s, i) => {
          const at = sources[s]!.updatedAt;
          const stale = isStale(at);
          return (
            <Fragment key={s}>
              {i > 0 && (
                <span className="text-faint" aria-hidden="true">
                  ·
                </span>
              )}
              <span className={`inline-flex items-center gap-1 whitespace-nowrap ${stale ? 'font-medium text-warning-fg' : ''}`}>
                {stale && <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                {SOURCES[s].label}
                <time dateTime={at ?? undefined} className="ui-num" title={at ? new Date(at).toLocaleString(lang === 'el' ? 'el-GR' : 'en-IE') : undefined}>
                  {shortAgo(at, lang)}
                </time>
                {stale && <span className="sr-only">({tr(lang, UI.olderThan24)})</span>}
              </span>
            </Fragment>
          );
        })}
      </p>
      {staleIn && staleIn.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-warning-fg">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {tr(lang, UI.olderThan24)}:{' '}
            {staleIn.map((x, i) => (
              <Fragment key={i}>
                {i > 0 && ', '}
                <span className="whitespace-nowrap">
                  {SOURCES[x.source].label} · {tr(lang, x.category)} <span className="ui-num">{shortAgo(x.updatedAt, lang)}</span>
                </span>
              </Fragment>
            ))}
          </span>
        </p>
      )}
    </div>
  );
}
