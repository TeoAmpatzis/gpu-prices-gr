import { setLang, tr, useLang } from '../lib/i18n';
import { Button } from '../ui/Button';
import { UI } from '../ui/strings';

/** Run a language change with every transition off for one frame (plan A4, rule 3). */
export function withoutTransitions(change: () => void) {
  const html = document.documentElement;
  html.setAttribute('data-switching', '');
  change();
  requestAnimationFrame(() => requestAnimationFrame(() => html.removeAttribute('data-switching')));
}

/** "EN" in Greek, "ΕΛ" in English: switches the whole site's language. */
export function LangSwitch({ wide = false }: { wide?: boolean }) {
  const lang = useLang();
  const next = lang === 'el' ? 'en' : 'el';
  return (
    <Button
      variant={wide ? 'secondary' : 'ghost'}
      iconOnly={false}
      aria-label={tr(lang, UI.toEnglish)}
      lang={next}
      onClick={() => withoutTransitions(() => setLang(next))}
      className={wide ? '' : 'w-10 px-0'}
    >
      {wide ? (next === 'en' ? 'English' : 'Ελληνικά') : next === 'en' ? 'EN' : 'ΕΛ'}
    </Button>
  );
}
