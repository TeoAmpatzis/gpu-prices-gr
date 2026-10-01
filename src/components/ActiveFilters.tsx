import { X } from 'lucide-react';
import type { BaseListing } from '../types';
import { defaultFilters, formatPrice, type Filters } from '../lib/data';
import { groupName, type CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Text } from '../lib/i18n';
import { SOURCES } from '../lib/sources';

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  filters: Filters;
  onChange: (f: Filters) => void;
  options: Record<string, { value: string; label: Text }[]>;
}

/** The active filters as removable chips above the results, plus "Clear all". Empty when nothing is set. */
export default function ActiveFilters<L extends BaseListing>({ cfg, filters: f, onChange, options }: Props<L>) {
  const lang = useLang();
  const t = (x: Text) => tr(lang, x);
  const d = defaultFilters(cfg.groups);
  const chips: { id: string; label: string; clear: Partial<Filters> }[] = [];

  if (f.query.trim()) chips.push({ id: 'q', label: `“${f.query.trim()}”`, clear: { query: '' } });
  if (f.groups.length !== d.groups.length)
    chips.push({
      id: 'groups',
      label: `${t(cfg.groupLabel)}: ${f.groups.map((g) => groupName(g, lang)).join(', ') || '—'}`,
      clear: { groups: d.groups },
    });
  if (f.segment !== d.segment && cfg.segments)
    chips.push({
      id: 'segment',
      label: `${t(T.segment)}: ${t(f.segment === 'pro' ? cfg.segments.pro : T.all)}`,
      clear: { segment: d.segment },
    });
  if (f.saleOnly) chips.push({ id: 'sale', label: t(T.saleOnly), clear: { saleOnly: false } });
  if (f.lowOnly) chips.push({ id: 'low', label: t(T.lowOnly), clear: { lowOnly: false } });
  if (f.sources.length !== d.sources.length)
    chips.push({
      id: 'sources',
      label: `${t(T.source)}: ${f.sources.map((s) => SOURCES[s].label).join(', ') || '—'}`,
      clear: { sources: d.sources },
    });
  for (const x of cfg.extraFilters) {
    const v = f.extra[x.key];
    if (!v) continue;
    const opt = options[x.key]?.find((o) => o.value === v);
    chips.push({
      id: `x-${x.key}`,
      label: `${t(x.label)}: ${opt ? t(opt.label) : v}`,
      clear: { extra: { ...f.extra, [x.key]: '' } },
    });
  }
  if (f.maxPrice != null)
    chips.push({ id: 'max', label: `≤ ${formatPrice(f.maxPrice, lang)}`, clear: { maxPrice: null } });

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={t(T.activeFilters)}>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange({ ...f, ...c.clear })}
          title={t(T.removeFilter)}
          className="tap inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pl-3 pr-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent transition-colors dark:ring-accent/30 duration-150 hover:bg-accent/15"
        >
          {c.label}
          <X className="h-3.5 w-3.5" aria-label={t(T.removeFilter)} />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...d, sort: f.sort, per: f.per })}
        className="tap rounded-full px-3 py-1 text-sm font-medium text-muted edge underline-offset-2 transition-colors duration-150 hover:text-fg hover:underline dark:ring-0"
      >
        {t(T.clearAll)}
      </button>
    </div>
  );
}
