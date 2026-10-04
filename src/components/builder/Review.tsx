// The guided builder's last step: every part with photo, price and shop, the total, what's missing,
// "Copy list" (plain text) and the share link (the build in the URL, src/lib/builderState.ts).

import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, ExternalLink, Link2 } from 'lucide-react';
import type { Category, SourceName } from '../../types';
import { CATEGORIES } from '../../lib/categories';
import { formatPrice } from '../../lib/data';
import { SLOTS, rate, type Slot } from '../../lib/builder';
import { shareLink, type AnyModel, type BuilderState } from '../../lib/builderState';
import { SOURCES } from '../../lib/sources';
import { STEP_NAME, optional, type StepId } from '../../lib/wizard';
import { tr, type Lang, type Text } from '../../lib/i18n';
import ProductPhoto from '../ProductPhoto';
import SourceBadge from '../SourceBadge';
import { FitBadge, partImage } from './parts';

const R = {
  missing: { el: 'Λείπει', en: 'Missing' },
  choose: { el: 'Επιλογή', en: 'Choose' },
  total: { el: 'Σύνολο', en: 'Total' },
  copyList: { el: 'Αντιγραφή λίστας', en: 'Copy list' },
  copyLink: { el: 'Αντιγραφή συνδέσμου', en: 'Copy link' },
  copied: { el: 'Αντιγράφηκε', en: 'Copied' },
  link: { el: 'Σύνδεσμος της σύνθεσης', en: 'Link to this build' },
  linkHint: {
    el: 'Όποιος τον ανοίξει βλέπει αυτή τη σύνθεση· η δική του αποθηκευμένη σύνθεση δεν αλλάζει.',
    en: 'Anyone who opens it sees this build; their own saved build is not changed.',
  },
  title: { el: 'Η σύνθεσή μου', en: 'My build' },
  prices: {
    el: 'Χαμηλότερες τιμές ανά προϊόν· τα μεταφορικά δεν περιλαμβάνονται',
    en: 'Lowest price per product; shipping not included',
  },
} satisfies Record<string, Text>;

/** Clipboard API, else the old select-and-copy (some in-app browsers). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export default function Review({ state, lang, onGo }: { state: BuilderState; lang: Lang; onGo: (s: StepId) => void }) {
  const t = (x: Text) => tr(lang, x);
  const { build, ctx, prefs, builtAt, wantExtra } = state;
  const [copied, setCopied] = useState<'list' | 'link' | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // The list carries the shop links (builder-extra.json).
  useEffect(() => wantExtra(), [wantExtra]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const chosen = SLOTS.filter((s) => build[s]);
  const total = chosen.reduce((sum, s) => sum + build[s]!.cheapest.price, 0);
  const link = shareLink(build, prefs);
  const date = builtAt ? new Date(builtAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB') : null;

  // Built when copied, so the shop links (which arrive later) are in it.
  const listText = () => {
    const lines = [`BuildDraft.gr · ${t(R.title)}`, ''];
    for (const s of chosen) {
      const m = build[s] as AnyModel;
      const shop = SOURCES[m.cheapest.source as SourceName]?.label ?? m.cheapest.source;
      lines.push(`${t(STEP_NAME[s])}: ${m.chip} · ${formatPrice(m.cheapest.price, lang)} (${shop})${m.cheapest.url ? ` ${m.cheapest.url}` : ''}`);
    }
    lines.push('', `${t(R.total)}: ${formatPrice(total, lang)}`, `${t(R.prices)}${date ? ` · ${date}` : ''}`, link);
    return lines.join('\n');
  };
  const copy = async (what: 'list' | 'link') => {
    if (await copyText(what === 'list' ? listText() : link)) {
      setCopied(what);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const button = (what: 'list' | 'link', label: Text, Icon: typeof Link2) => (
    <button
      type="button"
      onClick={() => copy(what)}
      disabled={!chosen.length}
      className="tap inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-muted disabled:ring-line-strong disabled:hover:bg-transparent"
    >
      {copied === what ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      <span aria-live="polite">{t(copied === what ? R.copied : label)}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-line rounded-xl ring-1 ring-edge">
        {SLOTS.map((s: Slot) => {
          const m = build[s] as AnyModel | undefined;
          const Icon = CATEGORIES[s as Category].icon;
          const opt = optional(s, build);
          return (
            <li key={s} className="flex flex-wrap items-center gap-3 p-3">
              {m ? (
                <ProductPhoto image={partImage(m)} size="md" icon={Icon} alt="" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-[9rem] flex-1">
                <div className="text-xs text-muted">{t(STEP_NAME[s])}</div>
                {m ? (
                  <>
                    <div className="font-medium [overflow-wrap:anywhere]">{m.chip}</div>
                    <div className="mt-1 empty:hidden">
                      <FitBadge rating={rate(s, m as never, build, ctx)} lang={lang} />
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => onGo(s)} className="tap text-sm font-medium text-accent hover:underline">
                    {opt.optional ? '—' : t(R.missing)} · {t(R.choose)}
                  </button>
                )}
              </div>
              {m && (
                <a href={m.cheapest.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-semibold tabular-nums text-accent">{formatPrice(m.cheapest.price, lang)}</span>
                  <SourceBadge source={m.cheapest.source} />
                  <ExternalLink className="h-3.5 w-3.5 text-faint" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">
          {t(R.total)}
          {date && <span className="text-faint"> · {date}</span>}
        </span>
        <span className="text-2xl font-semibold tabular-nums text-accent">{formatPrice(total, lang)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {button('list', R.copyList, ClipboardCopy)}
        {button('link', R.copyLink, Link2)}
      </div>
      {chosen.length > 0 && (
        <div>
          <label htmlFor="share-link" className="mb-1 block text-sm font-semibold">
            {t(R.link)}
          </label>
          <input
            id="share-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="field w-full py-2 pl-3 pr-3 text-sm text-muted"
          />
          <p className="mt-1 text-xs text-muted">{t(R.linkHint)}</p>
        </div>
      )}
    </div>
  );
}
