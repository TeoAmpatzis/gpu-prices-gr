import { ArrowDown, ArrowUp, ArrowUpDown, Minus, Plus, RefreshCw, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { tr, useLang, type Text } from '../lib/i18n';
import { CompatBadge, type CompatLevel } from './Badge';
import { Button } from './Button';
import { PriceCell, type PriceInfo } from './PriceCell';
import { SpecLine } from './SpecLine';
import type { Spec } from './specs';
import { UI, plural } from './strings';

export type SortDir = 'asc' | 'desc' | null;

/** Sortable column header (UX-16): a button inside the <th>, aria-sort on the <th>. */
export function SortHeader({
  label,
  dir,
  onSort,
  align = 'start',
  force,
}: {
  label: string;
  dir: SortDir;
  onSort?: () => void;
  align?: 'start' | 'end';
  force?: string;
}) {
  const lang = useLang();
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
      className={`px-3 py-2 ${align === 'end' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={onSort}
        data-force={force}
        className={`group relative inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide hover:text-fg data-[force~=hover]:text-fg ${dir ? 'text-fg' : 'text-muted'}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${dir ? 'text-accent' : 'text-faint'}`} aria-hidden="true" />
        <span className="sr-only">
          {dir ? `, ${tr(lang, dir === 'asc' ? UI.sortAsc : UI.sortDesc)}` : `, ${tr(lang, UI.sortBy)} ${label}`}
        </span>
      </button>
    </th>
  );
}

/** "12 προσφορές τιμής από 4 πηγές". */
function OfferCount({ offers, sources, inline = false }: { offers: number; sources: number; inline?: boolean }) {
  const lang = useLang();
  return (
    <span className="ui-num text-sm text-muted">
      {plural(lang, offers, UI.offerForms)}
      <span className={inline ? 'text-muted' : 'block whitespace-nowrap text-xs text-faint'}>
        {inline ? ' ' : ''}
        {tr(lang, UI.from)} {plural(lang, sources, UI.sourceForms)}
      </span>
    </span>
  );
}

export interface ListItem {
  name: string;
  href: string;
  photo: ReactNode;
  specs: Spec[];
  price: PriceInfo;
  offers: number;
  sources: number;
}

/** A model row of a category table (desktop). States: default, hover, focus (name link), selected. */
export function ListRow({ item, selected, force }: { item: ListItem; selected?: boolean; force?: string }) {
  return (
    <tr
      data-force={force}
      aria-selected={selected || undefined}
      className={`border-t border-line align-top hover:bg-hover data-[force~=hover]:bg-hover ${selected ? 'bg-brand-subtle shadow-[inset_3px_0_0_rgb(var(--accent))]' : ''}`}
    >
      <td className="px-3 py-3">
        <div className="flex gap-3">
          {item.photo}
          <div className="min-w-0">
            <a href={item.href} data-force={force?.includes('focus') ? 'focus' : undefined} className="rounded font-semibold text-fg hover:text-accent hover:underline">
              {item.name}
            </a>
            <SpecLine specs={item.specs} className="mt-0.5" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <PriceCell info={item.price} align="end" />
      </td>
      <td className="px-3 py-3 text-right">
        <OfferCount offers={item.offers} sources={item.sources} />
      </td>
    </tr>
  );
}

/** The same model as a card (phones and tablets, < 1024 px): same specs, same price cell. */
export function ProductCard({ item }: { item: ListItem }) {
  return (
    <article className="ui-card flex flex-col gap-3 p-3">
      <div className="flex gap-3">
        {item.photo}
        <div className="min-w-0">
          <a href={item.href} className="font-semibold text-fg hover:text-accent hover:underline">
            {item.name}
          </a>
          <SpecLine specs={item.specs} className="mt-0.5" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <PriceCell info={item.price} />
        <OfferCount offers={item.offers} sources={item.sources} inline />
      </div>
    </article>
  );
}

export interface Part {
  name: string;
  href: string;
  photo: ReactNode;
  specs: Spec[];
  price: PriceInfo;
  compat?: { level: CompatLevel; word?: Text; reason?: Text };
  qty?: number;
  removed?: boolean;
}

/**
 * A row of the builder's part list (PCPartPicker-style): the slot, the chosen part with its specs and
 * compatibility (badge + reason as text), price, actions. Empty slot: a "Choose" button. A part that
 * is no longer sold stays visible with a warning (UX-39).
 */
export function PartRow({
  slot,
  icon: Icon,
  part,
  onQty,
}: {
  slot: Text;
  icon: LucideIcon;
  part?: Part | null;
  onQty?: (n: number) => void;
}) {
  const lang = useLang();
  const label = tr(lang, slot);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line px-3 py-3 first:border-t-0 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-start">
      <span className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
        {label}
      </span>
      {!part ? (
        <span className="sm:col-span-2">
          <Button variant="secondary" icon={Plus}>
            {tr(lang, UI.choose)}: {label.toLowerCase()}
          </Button>
        </span>
      ) : (
        <>
          <div className="flex min-w-0 gap-3">
            {part.photo}
            <div className="flex min-w-0 flex-col gap-1">
              <a href={part.href} className={`font-medium hover:underline ${part.removed ? 'text-muted line-through' : 'text-fg hover:text-accent'}`}>
                {part.name}
              </a>
              <SpecLine specs={part.specs} />
              {part.removed ? (
                <span className="ui-badge ui-badge--warning self-start">
                  <TriangleAlert aria-hidden="true" />
                  {tr(lang, UI.noLongerSold)}
                </span>
              ) : (
                part.compat && (
                  <div className="flex flex-col items-start gap-1">
                    <CompatBadge level={part.compat.level} word={part.compat.word} />
                    {part.compat.reason && <p className="text-sm text-muted">{tr(lang, part.compat.reason)}</p>}
                  </div>
                )
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-col sm:flex-nowrap sm:items-end">
            {!part.removed && <PriceCell info={part.price} align="responsive" compact />}
            <div className="flex items-center gap-1">
              {part.qty != null && onQty && (
                <span className="mr-1 inline-flex items-center rounded-md border border-line-strong" role="group" aria-label={tr(lang, UI.quantity)}>
                  <Button variant="ghost" size="sm" icon={Minus} iconOnly disabled={part.qty <= 1} onClick={() => onQty(part.qty! - 1)}>
                    {tr(lang, UI.less)}
                  </Button>
                  <span className="ui-num w-6 text-center text-sm font-semibold" aria-live="polite">
                    {part.qty}
                  </span>
                  <Button variant="ghost" size="sm" icon={Plus} iconOnly onClick={() => onQty(part.qty! + 1)}>
                    {tr(lang, UI.more)}
                  </Button>
                </span>
              )}
              <Button variant="ghost" size="sm" icon={RefreshCw} iconOnly>
                {`${tr(lang, UI.change)}: ${label}`}
              </Button>
              <Button variant="ghost" size="sm" icon={Trash2} iconOnly>
                {`${tr(lang, UI.remove)}: ${label}`}
              </Button>
            </div>
          </div>
        </>
      )}
    </li>
  );
}
