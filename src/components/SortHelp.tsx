import { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { T, tr, useLang } from '../lib/i18n';

/** "How is this sorted?" — a small button next to the sort dropdown with a short explanation. */
export default function SortHelp() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    // The popover is positioned against the sort row (the nearest `relative` parent), full width.
    <div ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={tr(lang, T.sortHelpTitle)}
        title={tr(lang, T.sortHelpTitle)}
        onClick={() => setOpen((o) => !o)}
        className="tap-square grid h-9 w-9 place-items-center rounded-lg text-muted edge transition-colors duration-150 hover:bg-hover hover:text-fg"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={tr(lang, T.sortHelpTitle)}
          className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl bg-panel p-3 text-sm shadow-lg ring-1 ring-edge"
        >
          <div className="mb-1.5 font-semibold">{tr(lang, T.sortHelpTitle)}</div>
          <p className="text-fg-soft">{tr(lang, T.sortHelp)}</p>
        </div>
      )}
    </div>
  );
}
