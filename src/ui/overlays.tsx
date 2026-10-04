import { CircleCheck, Info, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { tr, useLang } from '../lib/i18n';
import { Button } from './Button';
import { UI } from './strings';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet (phones): slides up (transform only), backdrop fades; Esc, backdrop tap and × close it;
 * focus moves in and returns to the opener. `inline` renders it in place, open, for the catalogue.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  footer,
  inline = false,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  inline?: boolean;
  children: ReactNode;
}) {
  const lang = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open || inline) return;
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!els.length) return;
      const [first, last] = [els[0], els[els.length - 1]];
      const wrapTo = e.shiftKey && document.activeElement === first ? last : !e.shiftKey && document.activeElement === last ? first : null;
      if (wrapTo) {
        e.preventDefault();
        wrapTo.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open, inline, onClose]);
  if (!open) return null;
  const panel = (
    <div
      ref={ref}
      role="dialog"
      aria-modal={inline ? undefined : true}
      aria-labelledby={titleId}
      className={`ui-pop flex max-h-[85vh] flex-col rounded-b-none ${inline ? '' : 'ui-enter-sheet fixed inset-x-0 bottom-0 z-50'}`}
    >
      <div className="flex justify-center pt-2" aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-line-strong" />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <Button variant="ghost" icon={X} iconOnly onClick={onClose}>
          {tr(lang, UI.close)}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      {footer && <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 [&>*]:grow">{footer}</div>}
    </div>
  );
  if (inline) return panel;
  return (
    <>
      <div className="ui-enter-fade fixed inset-0 z-40 bg-fg/40" onClick={onClose} aria-hidden="true" />
      {panel}
    </>
  );
}

/**
 * Dialog on the native <dialog> (showModal: focus trap, Esc, inert page — 0 KB of library). `inline`
 * renders the same box in place, for the catalogue.
 */
export function Dialog({
  open,
  title,
  onClose,
  actions,
  inline = false,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  actions: ReactNode;
  inline?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d || inline) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, inline]);
  const box = (
    <>
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-2 text-sm text-muted">{children}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
    </>
  );
  if (inline) {
    return (
      <div role="dialog" aria-labelledby={titleId} className="ui-pop w-full max-w-md p-5">
        {box}
      </div>
    );
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="ui-pop ui-enter-pop w-[min(28rem,calc(100vw-2rem))] p-5 text-fg backdrop:bg-fg/40"
    >
      {box}
    </dialog>
  );
}

/** A short message after an action (e.g. "Η λίστα αντιγράφηκε"), optionally with Undo. */
export function Toast({ tone = 'info', text, action }: { tone?: 'info' | 'success'; text: string; action?: ReactNode }) {
  const Icon = tone === 'success' ? CircleCheck : Info;
  return (
    <div className="ui-pop ui-enter-toast flex w-full max-w-sm items-center gap-3 px-4 py-3">
      <Icon className={`h-5 w-5 shrink-0 ${tone === 'success' ? 'text-success-solid' : 'text-info-solid'}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-fg">{text}</p>
      {action}
    </div>
  );
}

/** Where toasts appear; screen readers announce them politely. */
export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 [&>*]:pointer-events-auto">
      {children}
    </div>
  );
}

/**
 * Tooltip for extra detail only — never the only place for something the user needs (UX-23). Shows on
 * hover, keyboard focus and tap; Esc hides it.
 */
export function Tooltip({ content, children, open: forced }: { content: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const shown = forced ?? open;
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={`ui-tooltip absolute bottom-full left-1/2 z-30 mb-2 w-max -translate-x-1/2 ${shown ? 'ui-enter-pop' : 'sr-only'}`}
      >
        {content}
      </span>
    </span>
  );
}
