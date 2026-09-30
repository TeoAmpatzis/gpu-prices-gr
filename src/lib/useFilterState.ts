import { useCallback, useEffect, useRef, useState } from 'react';
import type { BaseListing } from '../types';
import type { CategoryConfig } from './categories';
import { defaultFilters, type Filters } from './data';
import { decodeFilters, parseHash, writeFiltersToUrl } from './filterUrl';

const isHome = (page: string) => page === '' || page === 'gpu';

/**
 * A category's filters, kept in sync with the URL (see filterUrl.ts):
 * - on load, from a shared link or refresh, the URL wins;
 * - every change replaces the URL (no new history entries);
 * - back/forward or a typed URL with parameters restores them;
 * - a tab link without parameters ("#ram") keeps the tab's current filters and writes them back.
 */
export function useFilterState<L extends BaseListing>(cfg: CategoryConfig<L>) {
  const [filters, setState] = useState<Filters>(() => {
    const { page, params } = parseHash();
    const mine = page === cfg.id || (cfg.id === 'gpu' && isHome(page));
    return mine && params ? decodeFilters(params, cfg) : defaultFilters(cfg.groups);
  });
  const ref = useRef(filters);
  ref.current = filters;

  useEffect(() => {
    const onNavigate = () => {
      const { page, params } = parseHash();
      if (!(page === cfg.id || (cfg.id === 'gpu' && isHome(page)))) return;
      if (params) setState(decodeFilters(params, cfg));
      else writeFiltersToUrl(cfg, ref.current, cfg.id);
    };
    window.addEventListener('hashchange', onNavigate);
    window.addEventListener('popstate', onNavigate);
    return () => {
      window.removeEventListener('hashchange', onNavigate);
      window.removeEventListener('popstate', onNavigate);
    };
  }, [cfg]);

  const setFilters = useCallback(
    (f: Filters) => {
      setState(f);
      const { page } = parseHash();
      if (page === cfg.id || (cfg.id === 'gpu' && isHome(page))) writeFiltersToUrl(cfg, f, cfg.id);
    },
    [cfg],
  );
  return [filters, setFilters] as const;
}
