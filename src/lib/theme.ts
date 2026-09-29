import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme'; // also read by the inline script in index.html
const listeners = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

function stored(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export const getTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  listeners.forEach((l) => l());
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode: theme just won't persist */
  }
  apply(t);
}

// Follow the OS setting until the user picks a theme explicitly.
media.addEventListener('change', (e) => {
  if (!stored()) apply(e.matches ? 'dark' : 'light');
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useTheme = () => useSyncExternalStore(subscribe, getTheme);
