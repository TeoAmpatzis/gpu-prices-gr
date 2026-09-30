import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '../lib/theme';
import { T, tr, useLang } from '../lib/i18n';

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const lang = useLang();
  const label = tr(lang, next === 'dark' ? T.darkTheme : T.lightTheme);
  return (
    <button
      onClick={() => setTheme(next)}
      className="tap-square grid h-9 w-9 place-items-center rounded-lg bg-panel text-muted shadow-sm ring-1 ring-inset ring-line transition hover:text-fg dark:shadow-none"
      title={label}
      aria-label={label}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
