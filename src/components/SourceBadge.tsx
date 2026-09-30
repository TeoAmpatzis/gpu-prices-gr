import type { SourceName } from '../types';
import { SOURCES } from '../lib/sources';

export default function SourceBadge({ source }: { source: SourceName }) {
  const s = SOURCES[source];
  return (
    <span className={`badge ${s.badge}`}>
      {s.label}
    </span>
  );
}
