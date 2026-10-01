import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { T, tr, useLang } from '../lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sticky bottom area, e.g. the "Show N results" button. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Phone/tablet sheet sliding up from the bottom. Closes on Esc, a tap on the backdrop, the × button,
 * or dragging the handle/header down. Locks page scroll while open and returns focus afterwards.
 */
export default function BottomSheet({ open, onClose, title, footer, children }: Props) {
  const lang = useLang();
  const sheet = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0); // px dragged down
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // The sheet is phone/tablet only: close it (and unlock scrolling) if the window grows to lg.
    const wide = window.matchMedia('(min-width: 1024px)');
    const onWide = () => wide.matches && onClose();
    wide.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      previous?.focus();
      setDrag(0);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Swipe down on the handle/header: follow the finger, close past 90px.
  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (start.current != null) setDrag(Math.max(0, e.clientY - start.current));
  };
  const onPointerUp = () => {
    if (drag > 90) onClose();
    else setDrag(0);
    start.current = null;
  };

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeIn_150ms_ease-out]" onClick={onClose} />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-panel shadow-[0_-8px_30px_rgb(0_0_0/0.2)] ring-1 ring-edge focus:outline-none ${
          drag ? '' : 'transition-transform duration-200 motion-safe:animate-[sheetUp_200ms_ease-out]'
        }`}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 px-4 pb-2 pt-2.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <div className="flex w-full items-center justify-between">
            <span className="text-base font-semibold">{title}</span>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={tr(lang, T.close)}
              className="tap-square grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 scrollbar-none">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
