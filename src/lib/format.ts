// Price and age formatting, shared by the site shell and the pages (kept out of data.ts so the shell
// doesn't pull the data code into every page's first download).
import type { Lang } from './i18n';

/** No-break space: a number never wraps away from its unit. */
const NBSP = String.fromCharCode(0xa0);

// "1.209,62 €" in Greek, "€1,209.62" in English.
const EUR: Record<Lang, Intl.NumberFormat> = {
  el: new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }),
};
export const formatPrice = (n: number, lang: Lang) => EUR[lang].format(n);

const RELATIVE: Record<Lang, Intl.RelativeTimeFormat> = {
  el: new Intl.RelativeTimeFormat('el', { numeric: 'auto' }),
  en: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }),
};

/** Compact age for tight spots: "39′", "2 ώρ." / "2 h", "3 ημ." / "3 d". */
export function shortAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}′`;
  const h = Math.round(mins / 60);
  if (h < 48) return lang === 'el' ? `${h}${NBSP}ώρ.` : `${h}${NBSP}h`;
  const d = Math.round(h / 24);
  return lang === 'el' ? `${d}${NBSP}ημ.` : `${d}${NBSP}d`;
}

export function timeAgo(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = RELATIVE[lang];
  if (mins < 60) return rtf.format(-mins, 'minute');
  const h = Math.round(mins / 60);
  if (h < 48) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}
