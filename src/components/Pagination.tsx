import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PER_PAGE } from '../lib/data';
import { T, tr, useLang } from '../lib/i18n';

interface Props {
  page: number; // 1-based, already within 1..pages
  pages: number;
  per: number;
  total: number;
  onPage: (page: number) => void;
  onPer: (per: number) => void;
}

/** Page numbers around the current one: 1 … 4 5 6 … 20 (at most 7 entries). */
export function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const from = Math.max(2, Math.min(page - 1, pages - 4));
  const to = Math.min(pages - 1, Math.max(page + 1, 5));
  const out: (number | '…')[] = [1];
  // "…" only when it hides two pages or more ("1 2 3 4 5", not "1 … 3 4 5").
  if (from === 3) out.push(2);
  else if (from > 3) out.push('…');
  for (let p = from; p <= to; p++) out.push(p);
  if (to === pages - 2) out.push(pages - 1);
  else if (to < pages - 2) out.push('…');
  out.push(pages);
  return out;
}

const BUTTON = 'tap-square grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm tabular-nums transition-colors duration-150';
const IDLE = `${BUTTON} edge text-muted enabled:hover:bg-hover enabled:hover:text-fg disabled:cursor-not-allowed disabled:opacity-40`;

/** Modrinth-style pager under the results: range, page numbers (phones: "Page 3 of 20"), per-page choice. */
export default function Pagination({ page, pages, per, total, onPage, onPer }: Props) {
  const lang = useLang();
  const t = (x: Parameters<typeof tr>[1]) => tr(lang, x);
  const num = (n: number) => n.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  const first = (page - 1) * per + 1;
  const last = Math.min(page * per, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-1 text-sm">
      <span className="text-muted tabular-nums">
        {num(first)}–{num(last)} {t(T.of)} {num(total)}
      </span>
      {pages > 1 && (
        <nav aria-label={t(T.pagination)} className="flex items-center gap-1">
          <button type="button" className={IDLE} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t(T.prevPage)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* Phones: one line of text instead of numbers, so the pager fits 360px. */}
          <span className="px-2 tabular-nums text-muted sm:hidden">
            {t(T.page)} {page} {t(T.of)} {pages}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            {pageList(page, pages).map((p, i) =>
              p === '…' ? (
                <span key={`gap${i}`} className="px-1 text-faint" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`${t(T.page)} ${p}`}
                  className={
                    p === page
                      ? `${BUTTON} bg-accent/10 font-semibold text-accent ring-1 ring-inset ring-accent dark:ring-accent/30`
                      : IDLE
                  }
                >
                  {p}
                </button>
              ),
            )}
          </span>
          <button type="button" className={IDLE} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t(T.nextPage)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
      <label className="flex items-center gap-2 text-muted">
        {t(T.perPage)}
        <select className="field px-2 py-1.5" value={per} onChange={(e) => onPer(Number(e.target.value))}>
          {PER_PAGE.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
