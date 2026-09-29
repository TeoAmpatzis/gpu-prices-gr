import { useState } from 'react';
import type { History } from '../types';
import type { Model } from '../lib/data';
import ModelRow from './ModelRow';

export default function ModelTable({ models, history }: { models: Model[]; history: History }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!models.length) {
    return <p className="py-16 text-center text-zinc-500">Δεν βρέθηκαν κάρτες με αυτά τα φίλτρα.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
      <table className="w-full text-left">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="py-2 pl-3 pr-2 font-medium">Μοντέλο</th>
            <th className="px-2 font-medium">VRAM</th>
            <th className="px-2 font-medium">Φθηνότερη</th>
            <th className="hidden px-2 font-medium sm:table-cell">Κατασκευαστής</th>
            <th className="hidden px-2 font-medium md:table-cell">Εύρος</th>
            <th className="pr-3 text-right font-medium">Προϊόντα</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <ModelRow
              key={m.key}
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
