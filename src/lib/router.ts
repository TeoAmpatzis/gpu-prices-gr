// A small router over the History API (plan A1: ~1 KB instead of a library). The app reads the path with
// usePath(); links are plain <a href="/…"> that useLinkNavigation() turns into in-page navigation, so the
// design-system components need no router import. Code that rewrites the URL itself (filters, builder
// steps) calls notifyUrl() after history.replaceState.
import { useEffect, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) window.addEventListener('popstate', emit);
  return () => {
    listeners.delete(l);
    if (!listeners.size) window.removeEventListener('popstate', emit);
  };
}

/** The current pathname; re-renders only when it changes (not when a query string does). */
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname);

/** Re-render subscribers after the URL was changed with history.replaceState / pushState directly. */
export const notifyUrl = emit;

/** Subscribe to every URL change (back/forward, navigate, notifyUrl). */
export const onUrlChange = subscribe;

/** Go to an address in the site; a new page starts at the top (back/forward keep their place). */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search + location.hash) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  emit();
  if (!replace) window.scrollTo(0, 0);
}

/** An address the router handles: same site, a page (not a data file, photo, font or download). */
function routable(a: HTMLAnchorElement): string | null {
  if (a.target && a.target !== '_self') return null;
  if (a.hasAttribute('download') || a.origin !== location.origin) return null;
  if (/^\/(data|img|fonts|brand|assets)\//.test(a.pathname)) return null;
  if (a.pathname === location.pathname && a.search === location.search && a.hash) return null; // in-page anchor
  return a.pathname + a.search + a.hash;
}

/**
 * Turns clicks on the site's own links into in-page navigation (no reload), and calls `onIntent(path)` when
 * a pointer rests on, keyboard focus reaches or a finger touches a link — so its page can start loading.
 */
export function useLinkNavigation(onIntent?: (path: string) => void) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const to = a && routable(a);
      if (!to) return;
      e.preventDefault();
      navigate(to);
    };
    const intent = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const to = a && routable(a);
      if (to) onIntent?.(to);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('mouseover', intent, { passive: true });
    document.addEventListener('focusin', intent);
    document.addEventListener('touchstart', intent, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('mouseover', intent);
      document.removeEventListener('focusin', intent);
      document.removeEventListener('touchstart', intent);
    };
  }, [onIntent]);
}
