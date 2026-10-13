import type { ReactNode } from 'react';

/** Placeholder in the shape of a category page (filter sidebar, status line, table rows) while data loads. */
export default function Skeleton() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]" aria-busy="true">
      <SkeletonFilters />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-7 w-56 rounded-full" />
        </div>
        <SkeletonTable />
      </div>
    </div>
  );
}

/** The filter sidebar's placeholder (`top`: something real above the bars, e.g. pick mode's switch). */
export function SkeletonFilters({ top }: { top?: ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      {top}
      <div className="skeleton h-5 w-24" />
      <div className="skeleton h-9 w-full" />
      <div className="skeleton h-9 w-full" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[16, 14, 18, 12].map((w, i) => (
          <div key={i} className="skeleton h-7" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

/** The model table's placeholder: a header and nine rows. */
export function SkeletonTable() {
  return (
    <div className="card overflow-hidden">
      <div className="h-10 border-b border-line bg-sunken" />
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-line px-4 py-3.5 first:border-t-0">
          <div className="skeleton h-4" style={{ width: `${30 + ((i * 37) % 25)}%` }} />
          <div className="skeleton ml-auto h-4 w-12" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton hidden h-4 w-16 md:block" />
          <div className="skeleton h-4 w-6" />
        </div>
      ))}
    </div>
  );
}
