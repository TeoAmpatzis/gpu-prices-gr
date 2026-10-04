// Small building blocks of the catalogue page (not part of the design system).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { parseRgb, toHex, type Rgb } from '../ui/contrast';

export type Palette = 'blue' | 'indigo';

/** A part of the page forced to a theme (logo on dark, the dark column of a table…). */
export function Scope({ theme, palette, className = '', children }: { theme: 'light' | 'dark'; palette: Palette; className?: string; children: ReactNode }) {
  return (
    <div className={`ds ds-${theme} ${className}`} data-palette={palette}>
      {children}
    </div>
  );
}

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

/**
 * Token values (as "r g b") of a palette × theme, read from a short-lived probe element. Computed from
 * the live CSS, so the catalogue shows exactly what the stylesheet defines.
 */
export function useTokens(palette: Palette, theme: 'light' | 'dark', names: string[]): Record<string, Rgb> | null {
  const key = names.join(',');
  return useMemo(() => {
    const probe = document.createElement('div');
    probe.className = `ds ds-${theme}`;
    probe.dataset.palette = palette;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const vals = Object.fromEntries(key.split(',').map((n) => [n, parseRgb(cs.getPropertyValue(`--${n}`))]));
    probe.remove();
    return vals;
  }, [palette, theme, key]);
}

/** Draws children at a fixed size (e.g. the 1200 × 630 social image) scaled down to the available width. */
export function Scaled({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-lg" style={{ height: height * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
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
  return Math.round(((h * 60) + 360) % 360);
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
            className={`tap rounded-md px-2.5 py-1 text-sm font-medium ${value === o.v ? 'bg-panel text-fg shadow-[var(--shadow-1)]' : 'text-muted hover:text-fg'}`}
          >
            {tr(lang, o.label)}
          </button>
        ))}
      </span>
    </div>
  );
}
