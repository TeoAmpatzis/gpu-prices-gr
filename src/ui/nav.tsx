import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { shortAgo } from '../lib/format';
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
      {staleIn && staleIn.length > 0 && <StaleDetails staleIn={staleIn} />}
    </div>
  );
}

/** Site-wide stale data (C1): one calm line, the source × category pairs grouped by source behind "Details". */
function StaleDetails({ staleIn }: { staleIn: { source: SourceName; category: Text; updatedAt: string }[] }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  // Per source: how many categories are late and the oldest update among them.
  const groups = new Map<SourceName, { cats: number; oldest: string }>();
  const ms = (iso: string) => Date.parse(iso);
  for (const x of staleIn) {
    const g = groups.get(x.source);
    if (!g) groups.set(x.source, { cats: 1, oldest: x.updatedAt });
    else {
      g.cats += 1;
      if (ms(x.updatedAt) < ms(g.oldest)) g.oldest = x.updatedAt;
    }
  }
  return (
    <div
      className="flex flex-col gap-1 text-warning-fg"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <p className="flex flex-wrap items-center gap-x-2">
        <span className="inline-flex items-start gap-1.5">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {tr(lang, UI.someStale)}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="tap inline-flex items-center rounded font-medium underline underline-offset-2 hover:text-fg"
        >
          {tr(lang, UI.staleDetails)}
        </button>
      </p>
      {open && (
        <ul id={id} className="ml-5 flex flex-col gap-0.5">
          {[...groups].map(([s, g]) => (
            <li key={s}>
              {SOURCES[s].label}: {g.cats} {tr(lang, g.cats === 1 ? UI.categoryOne : UI.categoryMany)},{' '}
              <span className="ui-num">{shortAgo(g.oldest, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
