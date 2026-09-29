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
    return <p className="py-16 text-center text-faint">{cfg.empty}</p>;
  }
  const th = (c: { header: string; className?: string }) => (
    <th key={c.header} className={`px-2 font-medium ${c.className ?? ''}`}>
      {c.header}
    </th>
  );
  return (
    <div className="overflow-hidden rounded-xl bg-panel ring-1 ring-line">
      <table className="w-full text-left">
        <thead className="bg-hover text-xs uppercase tracking-wide text-faint">
          <tr>
            <th className="py-2 pl-3 pr-2 font-medium">Μοντέλο</th>
            {cfg.before.map(th)}
            <th className="px-2 font-medium">Φθηνότερη</th>
            {cfg.after.map(th)}
            <th className="hidden px-2 font-medium md:table-cell">Εύρος</th>
            <th className="pr-3 text-right font-medium">Προϊόντα</th>
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
