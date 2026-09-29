import { useState } from 'react';
import type { BaseListing, History } from '../types';
import type { Model } from '../lib/data';
import type { CategoryConfig } from '../lib/categories';
import ModelRow from './ModelRow';

interface Props<L extends BaseListing> {
  cfg: CategoryConfig<L>;
  models: Model<L>[];
  history: History;
}

export default function ModelTable<L extends BaseListing>({ cfg, models, history }: Props<L>) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!models.length) {
    return <p className="card py-16 text-center text-faint">{cfg.empty}</p>;
  }
  const th = (c: { header: string; className?: string }) => (
    <th key={c.header} className={`px-2 font-semibold ${c.className ?? ''}`}>
      {c.header}
    </th>
  );
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left">
        <thead className="border-b border-line bg-sunken text-[11px] uppercase tracking-wider text-faint">
          <tr>
            <th className="py-3 pl-4 pr-2 font-semibold">Μοντέλο</th>
            {cfg.before.map(th)}
            <th className="px-2 font-semibold">Φθηνότερη</th>
            {cfg.after.map(th)}
            <th className="hidden px-2 font-semibold md:table-cell">Εύρος</th>
            <th className="pr-4 text-right font-semibold">Προϊόντα</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <ModelRow
              key={m.key}
              cfg={cfg}
              model={m}
              history={history[m.key]}
              open={openKey === m.key}
              onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
