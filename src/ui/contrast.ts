// WCAG 2.x contrast for the design tokens: the pairs the UI actually uses, with the ratio each needs.
// Used by the preview's contrast table (computed from the live CSS variables) and by
// tests/ui/tokens.test.ts (parsed from src/ui/tokens.css), so the two can't disagree.

import type { Text } from '../lib/i18n';

export type Rgb = [number, number, number];

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export const parseRgb = (triplet: string): Rgb => triplet.trim().split(/\s+/).map(Number) as Rgb;
export const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** AA: 4.5 for text, 3 for icons and control borders (WCAG 1.4.3 / 1.4.11). */
export interface Pair {
  fg: string; // role name (CSS variable without --)
  bg: string;
  min: 4.5 | 3;
  use: Text; // what this pair is in the UI
}

const BG = ['page', 'panel', 'sunken', 'overlay'] as const;
const each = (fg: string, bgs: readonly string[], min: 4.5 | 3, use: Text): Pair[] => bgs.map((bg) => ({ fg, bg, min, use }));

const MEANING = { success: 'πράσινο', warning: 'πορτοκαλί', danger: 'κόκκινο', info: 'γαλάζιο' };

export const PAIRS: Pair[] = [
  ...each('fg', [...BG, 'hover'], 4.5, { el: 'κύριο κείμενο', en: 'body text' }),
  ...each('fg-soft', ['page', 'panel'], 4.5, { el: 'έντονο δευτερεύον κείμενο', en: 'strong secondary text' }),
  ...each('muted', BG, 4.5, { el: 'δευτερεύον κείμενο', en: 'secondary text' }),
  ...each('faint', BG, 4.5, { el: 'υποδείξεις, ετικέτες', en: 'hints, labels, captions' }),
  ...each('accent', [...BG, 'brand-subtle'], 4.5, { el: 'σύνδεσμοι, επιλεγμένα', en: 'links, selected items' }),
  ...each('on-brand', ['brand-solid', 'brand-solid-hover', 'brand-solid-active'], 4.5, { el: 'κείμενο κύριου κουμπιού', en: 'primary button label' }),
  ...each('on-brand', ['danger-solid', 'danger-solid-hover'], 4.5, { el: 'κείμενο κουμπιού κινδύνου', en: 'danger button label' }),
  ...each('page', ['fg'], 4.5, { el: 'κείμενο tooltip', en: 'tooltip text (inverse)' }),
  ...(['success', 'warning', 'danger', 'info'] as const).flatMap((m) => [
    ...each(`${m}-fg`, ['page', 'panel', 'sunken'], 4.5, { el: `κείμενο: ${MEANING[m]}`, en: `${m} text` }),
    ...each(`${m}-strong`, [`${m}-bg`], 4.5, { el: `badge: ${MEANING[m]}`, en: `${m} badge / notice text` }),
    ...each(`${m}-solid`, ['panel', `${m}-bg`], 3, { el: `εικονίδιο: ${MEANING[m]}`, en: `${m} icon` }),
  ]),
  ...each('line-strong', BG, 3, { el: 'πλαίσιο πεδίου', en: 'form control border' }),
  ...each('focus', ['page', 'panel'], 3, { el: 'δακτύλιος εστίασης', en: 'focus ring' }),
];
