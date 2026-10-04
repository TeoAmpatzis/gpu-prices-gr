import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tr, useLang } from '../lib/i18n';
import { Button } from './Button';
import { UI, num } from './strings';

export const PER_PAGE = [20, 50, 100] as const;

/** Page numbers with gaps: 1 … 4 5 6 … 20. */
export function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const out: (number | null)[] = [];
  let last = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (p - last > 1) out.push(null);
    out.push(p);
    last = p;
  }
  return out;
}

/**
 * Pages and page size. Desktop: numbers; phones (< 640 px): "Σελίδα 3 από 20" between the arrows.
 * Every target is 44 px on touch screens (UX-48).
 */
export function Pagination({
  page,
  pages,
  per,
  onPage,
  onPer,
}: {
  page: number;
  pages: number;
  per: number;
  onPage: (p: number) => void;
  onPer: (n: number) => void;
}) {
  const lang = useLang();
  return (
    <nav aria-label={tr(lang, UI.pages)} className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" icon={ChevronLeft} iconOnly disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {tr(lang, UI.prev)}
        </Button>
        <ol className="hidden items-center gap-1 sm:flex">
          {pageList(page, pages).map((p, i) =>
            p == null ? (
              <li key={`gap${i}`} className="px-1 text-faint" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`${tr(lang, UI.page)} ${p}`}
                  className={`ui-num tap-square grid h-10 min-w-10 place-items-center rounded-md px-2 text-sm font-medium ${
                    p === page ? 'bg-brand-solid text-on-brand' : 'text-fg hover:bg-hover'
                  }`}
                >
                  {num(lang, p)}
                </button>
              </li>
            ),
          )}
        </ol>
        <span className="ui-num px-2 text-sm text-fg sm:hidden" aria-live="polite">
          {tr(lang, UI.page)} {num(lang, page)} {tr(lang, UI.of)} {num(lang, pages)}
        </span>
        <Button variant="ghost" icon={ChevronRight} iconOnly disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {tr(lang, UI.next)}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        {tr(lang, UI.perPage)}
        <select className="ui-field ui-num w-auto pr-8" value={per} onChange={(e) => onPer(Number(e.target.value))}>
          {PER_PAGE.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
