import type { SourceName } from '../types';
import { SOURCES } from '../lib/sources';

export default function SourceBadge({ source }: { source: SourceName }) {
  const s = SOURCES[source];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
      {s.label}
    </span>
  );
}
