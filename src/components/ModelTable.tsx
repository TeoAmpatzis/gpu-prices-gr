import { useState } from 'react';
import { RotateCcw, SearchX } from 'lucide-react';
import type { BaseListing, DailyLow } from '../types';
import type { Model } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import { T, tr, useLang, type Text } from '../lib/i18n';
import { useMedia } from '../lib/useMedia';
import ModelRow, { ModelCard } from './ModelRow';
import { productImage } from '../lib/images';

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  models: Model<L>[];
  history: Record<string, DailyLow[]>;
  /** Model key → stored photo (list.json `img`). */
  img: Record<string, string>;
  /** Resets every filter (the empty state's "Clear filters" button). */
  onReset: () => void;
}

export default function ModelTable<L extends BaseListing>({ cfg, models, history, img, onReset }: Props<L>) {
  const lang = useLang();
  const [openKey, setOpenKey] = useState<string | null>(null);
  // The table needs a desktop-wide column (≥ 1024px); phones and tablets get cards.
  const wide = useMedia('(min-width: 1024px)');

  if (!models.length) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-hover text-faint">
          <SearchX className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold">{tr(lang, cfg.empty)}</p>
          <p className="mt-1 text-sm text-muted">{tr(lang, T.emptyHint)}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="tap mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 transition-colors duration-150 hover:bg-accent/15"
        >
          <RotateCcw className="h-4 w-4" /> {tr(lang, T.clearFilters)}
        </button>
      </div>
    );
  }
  if (!wide) {
    // Phones (one column) and tablets (two): cards instead of a table, so nothing scrolls sideways.
    return (
      <ul className="grid items-start gap-2 sm:grid-cols-2">
        {models.map((m) => (
          <ModelCard
            key={m.key}
            cfg={cfg}
            model={m}
            history={history[m.key]}
            image={productImage(cfg.id, m.cheapest, img[m.key])}
            open={openKey === m.key}
            onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
          />
        ))}
      </ul>
    );
  }
  const th = (c: { header: Text; className?: string; numeric?: boolean }) => (
    <th key={tr('en', c.header)} className={`px-2 font-semibold ${c.numeric ? 'text-right' : ''} ${c.className ?? ''}`}>
      {tr(lang, c.header)}
    </th>
  );
  return (
    // Scrolls sideways instead of clipping if a row ever gets wider than the screen.
    <div className="card overflow-x-auto">
      <table className="w-full text-left tabular-nums">
        <thead className="border-b border-line bg-sunken text-[11px] uppercase tracking-wider text-faint">
          <tr>
            <th className="py-3 pl-4 pr-2 font-semibold">{tr(lang, T.colModel)}</th>
            {cfg.before.map(th)}
            <th className="px-2 text-right font-semibold">{tr(lang, T.colCheapest)}</th>
            {cfg.after.map(th)}
            <th className="hidden px-2 text-right font-semibold xl:table-cell">{tr(lang, T.colRange)}</th>
            <th className="pl-2 pr-4 text-right font-semibold">{tr(lang, T.colOffers)}</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <ModelRow
              key={m.key}
              cfg={cfg}
              model={m}
              history={history[m.key]}
              image={productImage(cfg.id, m.cheapest, img[m.key])}
              open={openKey === m.key}
              onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
