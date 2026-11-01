// The build's lines as text (step 5 task 13): the name Review, the part list and Copy list give a line (the listing
// actually used, so its variant; a PSU by maker + model and the picker card's specs, task 12 review #4), the line's
// notice when a chosen shop offer is loading or gone (Review Focus 5), and the Copy list itself (#27):
// "Category: <title> — <price> — <shop> — <URL of the listing used>", total, prices' date, share link.
import type { PsuListing } from '../types';
import type { ResolvedLine } from './builderOffers';
import { formatPrice } from './format';
import { tr, type Lang, type Text } from './i18n';
import { SOURCES } from './sources';
import { STEP_NAME } from './wizard';
import { BUILDER as B } from '../ui/builderStrings';

/** A PSU's specs as its picker card shows them: watts, efficiency (or "no stated efficiency"), form, ATX 3.x, modular. */
export function psuText(p: PsuListing, lang: Lang): string {
  const modular = p.modular && { Full: B.fullModular, Semi: B.semiModular, Non: B.nonModular }[p.modular];
  return [`${p.watts} W`, p.efficiency ? `80+ ${p.efficiency}` : tr(lang, B.noEfficiency), p.formFactor, p.atx3 && 'ATX 3.x', modular && tr(lang, modular)]
    .filter(Boolean)
    .join(' · ');
}

/** A listing's own title: a builder row holds the model's titles joined, its own first (derive.builderRow). */
export const ownTitle = (title: string | undefined): string => (title ?? '').split(' | ')[0].trim();

/** The line's name: the PSU's maker + model with its specs; else the title of the listing used (the variant). */
export function lineTitle(r: ResolvedLine, lang: Lang): string {
  if (r.line === 'psu') return `${r.model.chip} · ${psuText(r.offer as PsuListing, lang)}`;
  return ownTitle(r.offer.title) || r.model.chip;
}

/** What a line says about its chosen shop offer: still loading, failed to load or gone (it then shows the model's cheapest). */
export function lineNotice(r: ResolvedLine): Text | null {
  if (r.status === 'missing') return B.offerGone;
  if (r.status === 'pending') return B.offerLoading;
  if (r.status === 'failed') return B.offerFailed;
  return null;
}

/** The total: the sum of the lines' shown prices (fans × their quantity). */
export const linesTotal = (lines: ResolvedLine[]): number => Math.round(lines.reduce((sum, r) => sum + r.total, 0) * 100) / 100;

/** The shop of the listing used: the site, and the shop behind it when known. */
export const shopName = (r: ResolvedLine): string =>
  `${SOURCES[r.offer.source]?.label ?? r.offer.source}${r.offer.merchant ? ` · ${r.offer.merchant}` : ''}`;

export function copyListText(lines: ResolvedLine[], o: { lang: Lang; date: string | null; link: string }): string {
  const t = (x: Text) => tr(o.lang, x);
  const out = [`BuildDraft.gr · ${t(B.myBuild)}`, ''];
  for (const r of lines) {
    const cat = t(r.line === 'storage2' ? B.storage2 : STEP_NAME[r.line]);
    const qty = r.quantity > 1 ? `${r.quantity} × ` : '';
    out.push([`${cat}: ${qty}${lineTitle(r, o.lang)}`, formatPrice(r.total, o.lang), shopName(r), r.offer.url].filter(Boolean).join(' — '));
  }
  out.push('', `${t(B.total)}: ${formatPrice(linesTotal(lines), o.lang)}`, o.date ? `${t(B.pricesOf)} ${o.date} · ${t(B.noShipping)}` : t(B.noShipping), o.link);
  return out.join('\n');
}
