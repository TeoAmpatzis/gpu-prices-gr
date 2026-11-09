import { Scale, X } from 'lucide-react';
import { tr, useLang } from '../../lib/i18n';
import { COMPARE_ENABLED } from '../../lib/compare/flag';
import { compareActivate, compareClear, dismissNotice, useCompare, useNotice } from '../../lib/compare/session';
import { MAX_ITEMS } from '../../lib/compare/refs';
import { CMP } from '../../lib/compare/strings';
import { CATS } from '../../shell/nav';
import type { Category } from '../../types';
import { Button, LinkButton } from '../../ui/Button';

/**
 * The bar at the bottom of every page (except the PC Builder, which has its own, and the compare page itself)
 * that shows what is being compared and opens the table. It also says why an add was refused.
 */
export function CompareTray({ hidden }: { hidden: boolean }) {
  const lang = useLang();
  const state = useCompare();
  const notice = useNotice();
  if (!COMPARE_ENABLED || hidden) return null;
  const cats = Object.keys(state.groups) as Category[];
  const active = state.active;
  const count = active ? (state.groups[active]?.length ?? 0) : 0;
  if (!active && !notice) return null;
  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <aside aria-label={tr(lang, CMP.trayLabel)} data-compare-tray className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-panel pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgb(0_0_0/0.25)]">
        <div className="site-container flex flex-col gap-2 py-2">
          {notice && (
            <p role="status" data-compare-notice className="flex items-start justify-between gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
              <span>{tr(lang, notice.kind === 'full' ? CMP.full : CMP.groupsFull)}</span>
              <button type="button" className="tap shrink-0" onClick={dismissNotice} aria-label={tr(lang, CMP.dismiss)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </p>
          )}
          {active && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Scale className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-sm font-semibold">{tr(lang, CMP.trayLabel)}</span>
                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="ui-chip"
                    aria-pressed={c === active}
                    disabled={cats.length === 1}
                    onClick={() => compareActivate(c)}
                  >
                    {tr(lang, CATS[c].name)} <span className="ui-num">{state.groups[c]?.length}/{MAX_ITEMS}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => compareClear(active)}>
                  {tr(lang, CMP.clear)}
                </Button>
                <LinkButton size="sm" variant="primary" href="/compare" data-compare-open>
                  {tr(lang, CMP.open)} ({count})
                </LinkButton>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
