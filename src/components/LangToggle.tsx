import { Languages } from 'lucide-react';
import { setLang, T, tr, useLang } from '../lib/i18n';

/** Switches between Greek and English; shows the language you'd switch *to*. */
export default function LangToggle() {
  const lang = useLang();
  const next = lang === 'el' ? 'en' : 'el';
  const label = tr(lang, T.switchLang);
  return (
    <button
      onClick={() => setLang(next)}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-panel px-2.5 text-sm font-semibold text-muted shadow-sm ring-1 ring-inset ring-line transition hover:text-fg dark:shadow-none"
      title={label}
      aria-label={label}
    >
      <Languages className="h-4 w-4" />
      {next === 'en' ? 'EN' : 'ΕΛ'}
    </button>
  );
}
