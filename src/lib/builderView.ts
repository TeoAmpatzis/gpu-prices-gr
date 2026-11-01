// The builder's address (/builder?mode=quick&step=case&cpu=…) and which screen it opens: the start screen (use and
// budget), the guided steps or the part list. Small and free of the parts' code: the start screen is the builder's
// first paint (rule 11), the rest loads after it.

import { decodeShare } from './share';

export type View = 'start' | 'guided' | 'quick';

/** The builder's parameters, or empty ones on another page. */
export function builderParams(): URLSearchParams {
  return location.pathname === '/builder' ? new URLSearchParams(location.search) : new URLSearchParams();
}

/** Replace (not push) the builder's parameters; the page stays "/builder". */
export function writeBuilderParams(change: (p: URLSearchParams) => void) {
  if (location.pathname !== '/builder') return;
  const p = builderParams();
  change(p);
  const qs = p.toString();
  const next = `/builder${qs ? `?${qs}` : ''}`;
  if (location.pathname + location.search !== next) history.replaceState(history.state, '', next);
}

/**
 * The screen an address opens: `mode=quick` the part list; `step=use` the start screen; another step or a shared
 * build the guided steps (a shared build on its Review); else a saved build with parts its part list, an empty one
 * the start screen.
 */
export function firstView(p: URLSearchParams, hasParts: boolean): View {
  if (p.get('mode') === 'quick') return 'quick';
  const step = p.get('step');
  if (step === 'use') return 'start';
  if (step || decodeShare(p)) return 'guided';
  return hasParts ? 'quick' : 'start';
}

/** The address of a screen: the start screen keeps `step=use` (a reload stays there), the part list `mode=quick`. */
export function viewParams(p: URLSearchParams, view: View, step?: string) {
  p.delete('mode');
  p.delete('step');
  if (view === 'start') p.set('step', 'use');
  else if (view === 'quick') p.set('mode', 'quick');
  else if (step) p.set('step', step);
}
