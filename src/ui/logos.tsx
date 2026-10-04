// The BuildDraft.gr logo (direction C, chosen by the owner on 2026-10-05): the wordmark — "Build" bold,
// "Draft" light, a chip for the dot of ".gr" — and its own symbol for favicons and app icons, the bold
// B with the chip dot. One colour (currentColor), no gradients, on a 32-unit grid; the symbol has a
// simpler drawing at 20 px and below so it reads at 16 px. Image versions for use outside the site
// (README, social): public/brand/, rendered by scripts/brand/render.py from the same shapes.

export const SYMBOL = {
  b: 'M8 6.5v19M8 6.5h7l3 3v3.7L15 16H8M8 16h7.8l3.2 3.2v3.1l-3.2 3.2H8',
  dot: 'M22.5 20h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
  dotPins: 'M23.75 17.4V20M26.25 17.4V20M28.5 21.75h2.1M28.5 24.25h2.1',
};

/** The symbol (favicon, app icon) as an inline SVG in currentColor. */
export function BrandMark({ size, className = '', title }: { size: number; className?: string; title?: string }) {
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
      <path d={SYMBOL.b} fill="none" stroke="currentColor" strokeWidth={small ? 4 : 3.4} strokeLinejoin="round" />
      <path d={SYMBOL.dot} fill="currentColor" />
      {!small && <path d={SYMBOL.dotPins} fill="none" stroke="currentColor" strokeWidth={1.4} />}
    </svg>
  );
}

/** The chip that stands for the dot of ".gr" (sized in em, sits on the baseline). */
function ChipDot() {
  return (
    <svg viewBox="0 0 10 10" className="mx-[0.05em] inline-block h-[0.42em] w-[0.42em] align-[-0.02em]" aria-hidden="true">
      <rect x="1.9" y="1.9" width="6.2" height="6.2" rx="0.7" fill="currentColor" />
      <path d="M3.6 0v1.9M6.4 0v1.9M3.6 8.1V10M6.4 8.1V10M0 3.6h1.9M0 6.4h1.9M8.1 3.6H10M8.1 6.4H10" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

/** The wordmark in the colour of the surrounding text (`className` sets size and colour). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span role="img" aria-label="BuildDraft.gr" className={`whitespace-nowrap leading-none tracking-[-0.02em] ${className}`}>
      <span aria-hidden="true">
        <span className="font-bold">Build</span>
        <span className="font-light">Draft</span>
        <ChipDot />
        <span className="font-medium">gr</span>
      </span>
    </span>
  );
}

/** Stand-alone favicon SVG: the symbol in the brand colour, darker on light browser tabs, lighter on dark ones. */
export function faviconSvg(light: string, dark: string): string {
  const style = `<style>.m{color:${light}}@media (prefers-color-scheme:dark){.m{color:${dark}}}</style>`;
  const body = `<path d="${SYMBOL.b}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="${SYMBOL.dot}" fill="currentColor"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${style}<g class="m">${body}</g></svg>`;
}
