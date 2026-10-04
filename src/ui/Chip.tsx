import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { tr, useLang } from '../lib/i18n';
import { UI, num } from './strings';

/**
 * A filter option as a chip: off / on (aria-pressed), with an optional count. A chip with 0 results is
 * disabled, except when it is on (so it can always be turned off).
 */
export function FilterChip({
  pressed,
  count,
  disabled,
  onClick,
  force,
  children,
}: {
  pressed: boolean;
  count?: number;
  disabled?: boolean;
  onClick?: () => void;
  force?: string;
  children: ReactNode;
}) {
  const lang = useLang();
  return (
    <button
      type="button"
      className="ui-chip"
      aria-pressed={pressed}
      disabled={disabled && !pressed}
      onClick={onClick}
      data-force={force}
    >
      {pressed && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
      {count != null && <span className="ui-count">{num(lang, count)}</span>}
    </button>
  );
}

/** An applied filter above the results: the whole chip removes it ("Αφαίρεση φίλτρου «NVIDIA»"). */
export function AppliedChip({ label, onRemove, force }: { label: string; onRemove?: () => void; force?: string }) {
  const lang = useLang();
  return (
    <button
      type="button"
      className="ui-chip ui-chip--applied"
      onClick={onRemove}
      aria-label={`${tr(lang, UI.removeFilter)} «${label}»`}
      data-force={force}
    >
      {label}
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
