import type { ReactNode } from 'react';
import { ABOUT, CONTACT, CREDITS, PRIVACY, type InfoPageContent } from '../content/pages';
import { tr, useLang } from '../lib/i18n';

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

const CONTENT: Record<'about' | 'contact' | 'privacy' | 'credits', InfoPageContent> = {
  about: ABOUT,
  contact: CONTACT,
  privacy: PRIVACY,
  credits: CREDITS,
};

/**
 * A text page (About, Contact, Privacy): sections of paragraphs and bullet lists on a card. Loaded
 * lazily with its texts (App.tsx), so other pages don't download them.
 */
export default function InfoPage({ page }: { page: keyof typeof CONTENT }) {
  const lang = useLang();
  const content = CONTENT[page];
  return (
    <article className="card max-w-3xl p-5 sm:p-8">
      <div className="flex flex-col gap-7">
        {content.sections.map((s) => (
          <section key={tr('en', s.heading)} className="flex flex-col gap-2.5">
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
    </article>
  );
}
