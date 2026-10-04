import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Common {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  /** Icon-only button: `children` is then the accessible label (visually hidden). */
  iconOnly?: boolean;
  /** Catalogue only: show hover/focus/active without the pointer ("hover focus"). */
  force?: string;
  children?: ReactNode;
}

// Full class names (Tailwind keeps a components-layer class only if its whole name appears in the source).
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'ui-btn--primary',
  secondary: 'ui-btn--secondary',
  ghost: 'ui-btn--ghost',
  danger: 'ui-btn--danger',
};
const classes = ({ variant = 'secondary', size = 'md', iconOnly }: Common, extra = '') =>
  ['ui-btn', VARIANT[variant], size === 'sm' && 'ui-btn--sm', iconOnly && 'ui-btn--icon', extra].filter(Boolean).join(' ');

function Inner({ icon: Icon, iconOnly, children }: Common) {
  return (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children != null && <span className={iconOnly ? 'sr-only' : undefined}>{children}</span>}
    </>
  );
}

/** One button for every action: primary (one per view), secondary, ghost (toolbars), danger. */
export function Button({
  variant,
  size,
  icon,
  iconOnly,
  force,
  loading,
  className,
  children,
  disabled,
  ...rest
}: Common & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={classes({ variant, size, iconOnly }, className)}
      data-force={force}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled}
      onClick={loading ? undefined : rest.onClick}
    >
      <Inner icon={icon} iconOnly={iconOnly}>
        {children}
      </Inner>
      {loading && <span className="ui-spinner" aria-hidden="true" />}
    </button>
  );
}

/** A link that looks like a button (navigation, e.g. "PC Builder" in the header). */
export function LinkButton({
  variant,
  size,
  icon,
  iconOnly,
  force,
  className,
  children,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} className={classes({ variant, size, iconOnly }, className)} data-force={force}>
      <Inner icon={icon} iconOnly={iconOnly}>
        {children}
      </Inner>
    </a>
  );
}
