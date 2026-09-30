import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Latest } from '../types';
import { shortAgo, timeAgo } from '../lib/data';
import { T, tr, useLang } from '../lib/i18n';
import { SOURCE_NAMES } from '../lib/sources';
import SourceBadge from './SourceBadge';

/**
 * One line above the table — "5 stores · updated 39′ ago" — with a popover that breaks it down per
 * store. Opens on hover (mouse), Enter/Space (keyboard) and tap; closes on Escape or a click outside.
 */
export default function SourcesStatus({ latest }: { latest: Latest }) {
  const lang = useLang();
  const t = (x: Parameters<typeof tr>[1]) => tr(lang, x);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rows = SOURCE_NAMES.map((s) => ({ source: s, meta: latest.sources[s] }));
  const active = rows.filter((r) => r.meta);
  const delayed = active.filter((r) => !r.meta!.ok).length;
  // "Updated" = the most recent successful update of any store.
  const newest = active
    .map((r) => r.meta!.updatedAt)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  return (
    <div
      ref={ref}
      className="relative ml-auto"
      // Hover opens it for a mouse only: on touch a tap would fire hover and click together.
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        // Mouse/tap clicks (detail ≥ 1) open it — a mouse has usually opened it by hovering already;
        // Enter/Space (detail 0) toggles it.
        onClick={(e) => setOpen((o) => (e.detail === 0 ? !o : true))}
        className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-xs text-muted ring-1 ring-inset ring-line transition-colors duration-150 hover:text-fg"
      >
        <span className={`h-2 w-2 rounded-full ${delayed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <span className="tabular-nums">
          {active.length} {t(T.stores)} · {t(T.updated)} {shortAgo(newest, lang)}
          {t(T.agoSuffix)}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t(T.updatesByStore)}
          className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-panel p-3 text-xs shadow-lg ring-1 ring-line"
        >
          <div className="label mb-2">{t(T.updatesByStore)}</div>
          <ul className="flex flex-col gap-2">
            {rows.map(({ source, meta }) => (
              <li
                key={source}
                className="flex items-center gap-2"
                title={meta && !meta.ok ? t(T.staleSource) : undefined}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${!meta ? 'bg-zinc-400' : meta.ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                <SourceBadge source={source} />
                <span className="ml-auto whitespace-nowrap tabular-nums text-fg-soft">
                  {meta?.count ?? 0} {t(T.listingsShort)}
                </span>
                <span className="w-28 whitespace-nowrap text-right tabular-nums text-muted">
                  {meta && !meta.ok ? t(T.delayed) : timeAgo(meta?.updatedAt, lang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
