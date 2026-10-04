// The three logo directions of the plan ("Νέα ταυτότητα και design system"), for the owner's choice at
// Phase 1 Stop 2. Every one is a single colour (currentColor), no gradients, on a 32-unit grid, with a
// simplified drawing for 20 px and below so it still reads at 16 px. After the choice, the other two go.
//   A. Blueprint — technical-drawing corner marks framing a small chip; the name beside it.
//   B. Monogram  — "BD" drawn like circuit traces, cut out of a rounded square.
//   C. Wordmark  — the name only: "Build" bold, "Draft" light, a chip for the dot of ".gr";
//                  its favicon symbol is the bold B with the chip dot.
import { useId } from 'react';

export type LogoKind = 'a' | 'b' | 'c';

const A = {
  corners: 'M3.5 10.5V3.5h7M21.5 3.5h7v7M28.5 21.5v7h-7M10.5 28.5h-7v-7',
  chip: 'M12 10.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5Zm1.75 1.9a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z',
  pins: 'M14 7.25v3.25M18 7.25v3.25M14 21.5v3.25M18 21.5v3.25M7.25 14h3.25M7.25 18h3.25M21.5 14h3.25M21.5 18h3.25',
  // 16 px: thicker corners, a bigger chip, no pins
  smallCorners: 'M3 11V3h8M21 3h8v8M29 21v8h-8M11 29H3v-8',
  smallChip: 'M10.5 9h11A1.5 1.5 0 0 1 23 10.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 9 21.5v-11A1.5 1.5 0 0 1 10.5 9Zm2.3 2.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
};
const B = {
  b: 'M7 8.5v15M7 8.5h4.6l2 2V13l-2 2H7M7 15h5.2l2.4 2.4v3.7l-2.4 2.4H7',
  d: 'M18.4 8.5v15h3.2l3.4-3.4v-8.2l-3.4-3.4h-3.2Z',
  traces: 'M7 16H4.1M25 16h2.9',
  vias: [
    [3, 16],
    [29, 16],
  ] as const,
};
const C = {
  b: 'M8 6.5v19M8 6.5h7l3 3v3.7L15 16H8M8 16h7.8l3.2 3.2v3.1l-3.2 3.2H8',
  dot: 'M22.5 20h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
  dotPins: 'M23.75 17.4V20M26.25 17.4V20M28.5 21.75h2.1M28.5 24.25h2.1',
};

/** The mark (A, B) or the favicon symbol (C) as an inline SVG in currentColor. */
export function Mark({ kind, size, className = '', title }: { kind: LogoKind; size: number; className?: string; title?: string }) {
  const mask = useId().replace(/:/g, '');
  const small = size <= 20;
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {kind === 'a' &&
        (small ? (
          <>
            <path d={A.smallCorners} fill="none" stroke="currentColor" strokeWidth={3} />
            <path d={A.smallChip} fill="currentColor" fillRule="evenodd" />
          </>
        ) : (
          <>
            <path d={A.corners} fill="none" stroke="currentColor" strokeWidth={2.25} />
            <path d={A.chip} fill="currentColor" fillRule="evenodd" />
            <path d={A.pins} fill="none" stroke="currentColor" strokeWidth={1.6} />
          </>
        ))}
      {kind === 'b' && (
        <>
          <defs>
            <mask id={mask}>
              <rect width="32" height="32" fill="#fff" />
              <g fill="none" stroke="#000" strokeWidth={small ? 2.9 : 2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d={B.b} />
                <path d={B.d} />
                {!small && <path d={B.traces} />}
              </g>
              {!small && B.vias.map(([x, y]) => <circle key={x} cx={x} cy={y} r={1.15} fill="none" stroke="#000" strokeWidth={1.1} />)}
            </mask>
          </defs>
          <rect width="32" height="32" rx="7.5" fill="currentColor" mask={`url(#${mask})`} />
        </>
      )}
      {kind === 'c' && (
        <>
          <path d={C.b} fill="none" stroke="currentColor" strokeWidth={small ? 4 : 3.4} strokeLinejoin="round" />
          <path d={C.dot} fill="currentColor" />
          {!small && <path d={C.dotPins} fill="none" stroke="currentColor" strokeWidth={1.4} />}
        </>
      )}
    </svg>
  );
}

/** The chip that stands for the dot of ".gr" in wordmark C (sized in em, sits on the baseline). */
function ChipDot() {
  return (
    <svg viewBox="0 0 10 10" className="mx-[0.05em] inline-block h-[0.42em] w-[0.42em] align-[-0.02em]" aria-hidden="true">
      <rect x="1.9" y="1.9" width="6.2" height="6.2" rx="0.7" fill="currentColor" />
      <path d="M3.6 0v1.9M6.4 0v1.9M3.6 8.1V10M6.4 8.1V10M0 3.6h1.9M0 6.4h1.9M8.1 3.6H10M8.1 6.4H10" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

/** The name as text in the logo's colour: A and B "BuildDraft.gr" next to the mark; C the wordmark itself. */
export function Name({ kind, className = '' }: { kind: LogoKind; className?: string }) {
  if (kind === 'c') {
    return (
      <span className={`whitespace-nowrap leading-none tracking-[-0.02em] ${className}`}>
        <span className="font-bold">Build</span>
        <span className="font-light">Draft</span>
        <ChipDot />
        <span className="font-medium">gr</span>
      </span>
    );
  }
  return (
    <span className={`whitespace-nowrap font-semibold leading-none tracking-[-0.015em] ${className}`}>
      BuildDraft<span className="font-normal">.gr</span>
    </span>
  );
}

/**
 * The full logo: mark + name (A, B) or wordmark (C), all in one colour (`className` sets it, e.g.
 * text-fg). `height` = the mark's size in px; the name scales with it.
 */
export function Lockup({ kind, height = 32, className = '' }: { kind: LogoKind; height?: number; className?: string }) {
  if (kind === 'c') {
    return <Name kind="c" className={className} />;
  }
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: height * 0.3 }}>
      <Mark kind={kind} size={height} />
      <Name kind={kind} />
    </span>
  );
}

/** Stand-alone SVG text for a favicon (C: its symbol); switches colour with the browser's dark mode. */
export function faviconSvg(kind: LogoKind, light: string, dark: string): string {
  const style = `<style>.m{color:${light}}@media (prefers-color-scheme:dark){.m{color:${dark}}}</style>`;
  let body = '';
  if (kind === 'a') body = `<path d="${A.smallCorners}" fill="none" stroke="currentColor" stroke-width="3"/><path d="${A.smallChip}" fill="currentColor" fill-rule="evenodd"/>`;
  if (kind === 'b')
    body = `<defs><mask id="m"><rect width="32" height="32" fill="#fff"/><g fill="none" stroke="#000" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="${B.b}"/><path d="${B.d}"/></g></mask></defs><rect width="32" height="32" rx="7.5" fill="currentColor" mask="url(#m)"/>`;
  if (kind === 'c') body = `<path d="${C.b}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="${C.dot}" fill="currentColor"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${style}<g class="m">${body}</g></svg>`;
}
