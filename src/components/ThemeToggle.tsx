import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '../lib/theme';

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Σκούρο θέμα' : 'Φωτεινό θέμα';
  return (
    <button
      onClick={() => setTheme(next)}
      className="grid h-9 w-9 place-items-center rounded-lg bg-panel text-muted shadow-sm ring-1 ring-inset ring-line transition hover:text-fg dark:shadow-none"
      title={label}
      aria-label={label}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
