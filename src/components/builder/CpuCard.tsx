import type { ReactNode } from 'react';

/** Versions stay inside one chip's card; each keeps its own compatibility, price and selection. */
export default function CpuCard({ chip, children }: { chip: string; children: ReactNode }) {
  return <li className="card min-w-0 p-3" data-card="cpu"><h3 className="font-semibold">{chip}</h3><ul className="mt-2 flex flex-col gap-2">{children}</ul></li>;
}
