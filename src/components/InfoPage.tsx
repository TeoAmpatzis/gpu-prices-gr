import type { ReactNode } from 'react';
import { ABOUT, CONTACT, PRIVACY, HOW_PRICES, type InfoPageContent } from '../content/pages';
import { tr, useLang } from '../lib/i18n';
import { CONTACT_EMAIL } from '../lib/site';
import { useSite } from '../shell/site';
import { StatusLine } from '../ui/nav';
import './info.css';

// Inline markup allowed in page text: [label](url), **bold**, `code`.
const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const key = m.index;
    if (m[1]) {
      const external = /^https?:/.test(m[2]);
      out.push(
        <a
          key={key}
          href={m[2]}
          className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition-colors duration-150 hover:decoration-accent"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {m[1]}
        </a>,
      );
    } else if (m[3]) {
      out.push(
        <strong key={key} className="font-semibold text-fg">
          {m[3]}
        </strong>,
      );
    } else {
      out.push(
        <code key={key} className="rounded bg-hover px-1 py-0.5 font-mono text-[0.9em] text-fg">
          {m[4]}
        </code>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const CONTENT: Record<'about' | 'contact' | 'privacy' | 'how-prices', InfoPageContent> = { about: ABOUT, contact: CONTACT, privacy: PRIVACY, 'how-prices': HOW_PRICES };

/**
 * A text page (About, Contact, Privacy): sections of paragraphs and bullet lists on a card. Loaded
 * lazily with its texts (App.tsx), so other pages don't download them.
 */
export default function InfoPage({ page }: { page: keyof typeof CONTENT }) {
  const lang = useLang();
  const site = useSite();
  const content = CONTENT[page];
  return (
    <article className={`info-page info-page--${page}`}>
      {page === 'about' && <div className="info-stats"><div className="ui-card"><strong>5</strong><span>{tr(lang, { el: 'πηγές τιμών', en: 'price sources' })}</span></div><div className="ui-card"><strong>9</strong><span>{tr(lang, { el: 'κατηγορίες', en: 'categories' })}</span></div><div className="ui-card"><strong>{site ? Object.values(site.counts).reduce((a, b) => a + (b ?? 0), 0).toLocaleString(lang) : '—'}</strong><span>{tr(lang, { el: 'οικογένειες μοντέλων', en: 'model families' })}</span></div></div>}
      {page === 'contact' && <a className="ui-btn ui-btn--primary info-mail" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
      {page === 'how-prices' && <div className="ui-card p-4 mb-8"><StatusLine sources={site?.sources ?? {}} staleIn={site?.staleIn} /></div>}
      <div className={page === 'privacy' ? 'info-with-contents' : ''}>
      {page === 'privacy' && <nav className="info-contents" aria-label={tr(lang, { el: 'Περιεχόμενα', en: 'Contents' })}><p className="text-muted mb-3">{tr(lang, { el: 'Περιεχόμενα', en: 'Contents' })}</p>{content.sections.map((s, i) => <a key={i} href={`#info-${i}`}>{i + 1}. {tr(lang, s.heading)}</a>)}</nav>}
      <div className="flex min-w-0 flex-col gap-8">
        {content.sections.map((s, i) => (
          <section id={`info-${i}`} key={tr('en', s.heading)} className="info-section flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{tr(lang, s.heading)}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="leading-relaxed text-fg-soft">
                {inline(tr(lang, p))}
              </p>
            ))}
            {s.bullets && (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-fg-soft marker:text-faint">
                {s.bullets.map((b, i) => (
                  <li key={i}>{inline(tr(lang, b))}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {content.footnote && (
          <p className="border-t border-line pt-4 text-sm text-muted">{tr(lang, content.footnote)}</p>
        )}
      </div>
      </div>
      {page !== 'contact' && (
        <div className="info-actions ui-card">
          <a className="ui-btn ui-btn--secondary" href="/how-prices">{tr(lang, { el: 'Πώς βγάζουμε τις τιμές', en: 'How prices work' })}</a>
          <a className="ui-btn ui-btn--primary" href="/contact">{tr(lang, { el: 'Επικοινωνία', en: 'Contact' })}</a>
        </div>
      )}
    </article>
  );
}
