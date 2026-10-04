// Small building blocks of the catalogue page (not part of the design system).
import { useMemo, type ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { parseRgb, toHex, type Rgb } from '../ui/contrast';

export function Section({ id, title, intro, children }: { id: string; title: Text; intro?: Text; children: ReactNode }) {
  const lang = useLang();
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="pv-section flex flex-col gap-5">
      <div>
        <h2 id={`${id}-h`} className="text-2xl font-semibold tracking-tight">
          {tr(lang, title)}
        </h2>
        {intro && <p className="mt-1 max-w-3xl text-sm text-muted">{tr(lang, intro)}</p>}
      </div>
      {children}
    </section>
  );
}

/** A labelled specimen: small caption above the thing shown. */
export function Spec({ label, children, className = '' }: { label: Text; children: ReactNode; className?: string }) {
  const lang = useLang();
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, label)}</span>
      {children}
    </div>
  );
}

/** Token values (as "r g b") read from the live CSS, so the catalogue shows exactly what the site uses. */
export function useTokens(names: string[]): Record<string, Rgb> {
  const key = names.join(',');
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(key.split(',').map((n) => [n, parseRgb(cs.getPropertyValue(`--${n}`))]));
  }, [key]);
}

export const hex = (rgb: Rgb | undefined) => (rgb ? toHex(rgb) : '');

/** Hue in degrees of an rgb colour. */
export function hue([r, g, b]: Rgb): number {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  if (max === min) return 0;
  const d = max - min;
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

/** Segmented control for the catalogue's switches. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: Text; value: T; options: { v: T; label: Text }[]; onChange: (v: T) => void }) {
  const lang = useLang();
  return (
    <div className="flex items-center gap-2" role="group" aria-label={tr(lang, label)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{tr(lang, label)}</span>
      <span className="inline-flex rounded-lg border border-edge bg-sunken p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={`tap rounded-md px-2.5 py-1 text-sm font-medium ${value === o.v ? 'bg-hover text-fg' : 'text-muted hover:text-fg'}`}
          >
            {tr(lang, o.label)}
          </button>
        ))}
      </span>
    </div>
  );
}
