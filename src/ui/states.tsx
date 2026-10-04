import { CloudOff, RotateCw, SearchX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { tr, useLang } from '../lib/i18n';
import { Button } from './Button';
import { UI } from './strings';

/** Empty result: what happened, and one way out (one wording for every reset: UX-17). */
export function EmptyState({ icon: Icon = SearchX, title, text, action }: { icon?: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sunken text-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-1 text-base font-semibold text-fg">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Load error (UX-19): a translated message and "Try again"; the technical text (e.g. "HTTP 500") only
 * inside a folded "Technical details".
 */
export function ErrorState({ detail, onRetry, retrying }: { detail?: string; onRetry: () => void; retrying?: boolean }) {
  const lang = useLang();
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-bg text-danger-fg">
        <CloudOff className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-1 text-base font-semibold text-fg">{tr(lang, UI.loadErrorTitle)}</h2>
      <p className="max-w-sm text-sm text-muted">{tr(lang, UI.loadErrorText)}</p>
      <Button variant="primary" icon={RotateCw} loading={retrying} onClick={onRetry} className="mt-2">
        {tr(lang, UI.retry)}
      </Button>
      {detail && (
        <details className="mt-1 text-xs text-faint">
          <summary className="tap cursor-pointer">{tr(lang, UI.details)}</summary>
          <code className="ui-mono mt-1 block">{detail}</code>
        </details>
      )}
    </div>
  );
}

/** Loading placeholders shaped like what comes (a phone gets card shapes, not the desktop table: UX-21). */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  const lang = useLang();
  return (
    <div role="status" aria-label={tr(lang, UI.loading)} className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-line px-3 py-3 first:border-t-0">
          <span className="ui-skeleton h-10 w-10" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="ui-skeleton h-4 w-2/5" />
            <span className="ui-skeleton h-3 w-3/5" />
          </span>
          <span className="flex flex-col items-end gap-2">
            <span className="ui-skeleton h-5 w-20" />
            <span className="ui-skeleton h-3 w-28" />
          </span>
        </div>
      ))}
    </div>
  );
}
export function SkeletonCards({ cards = 2 }: { cards?: number }) {
  const lang = useLang();
  return (
    <div role="status" aria-label={tr(lang, UI.loading)} className="flex flex-col gap-3">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="ui-card flex flex-col gap-3 p-3">
          <div className="flex gap-3">
            <span className="ui-skeleton h-14 w-14" />
            <span className="flex flex-1 flex-col gap-2 pt-1">
              <span className="ui-skeleton h-4 w-3/4" />
              <span className="ui-skeleton h-3 w-1/2" />
            </span>
          </div>
          <span className="ui-skeleton h-5 w-24" />
          <span className="ui-skeleton h-3 w-40" />
        </div>
      ))}
    </div>
  );
}
