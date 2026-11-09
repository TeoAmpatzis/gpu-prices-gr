import { Check, Scale } from 'lucide-react';
import { tr, useLang } from '../../lib/i18n';
import { COMPARE_ENABLED } from '../../lib/compare/flag';
import { encodeRef, isComparable, type CompareRef } from '../../lib/compare/refs';
import { compareAdd, compareRemove, isCompared, useCompare } from '../../lib/compare/session';
import { CMP } from '../../lib/compare/strings';
import { Button } from '../../ui/Button';

/**
 * Adds a product (a family page, or the exact listing of a card or offer row) to the comparison, or takes it out.
 * Nothing renders while comparison is switched off or the category is not published. A full group is explained
 * by the tray (session.ts notice), never fixed by silently dropping another item.
 */
export function CompareButton({ item, name, iconOnly = false }: { item: CompareRef; name: string; iconOnly?: boolean }) {
  const lang = useLang();
  const state = useCompare();
  if (!COMPARE_ENABLED || !isComparable(item.cat)) return null;
  const on = isCompared(state, item);
  const label = `${tr(lang, on ? CMP.removeLabel : CMP.addLabel)}: ${name}`;
  return (
    <Button
      size="sm"
      icon={on ? Check : Scale}
      iconOnly={iconOnly}
      aria-pressed={on}
      title={iconOnly ? label : undefined}
      data-compare-ref={encodeRef(item)}
      className={on ? 'text-accent ring-1 ring-accent' : undefined}
      onClick={() => (on ? compareRemove(item) : compareAdd(item))}
    >
      {iconOnly ? label : tr(lang, on ? CMP.added : CMP.add)}
    </Button>
  );
}
