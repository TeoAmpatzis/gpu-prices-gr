/**
 * BuildDraft.gr mark: a price tag with chip pins on its edges and a falling price line.
 * Drawn in `currentColor`, so it takes the accent colour of the surrounding text in light and dark mode.
 * Built on a 32px grid; the same shape is in public/favicon-mark.svg and the OG image (scripts/brand/).
 */
export default function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h13.1a2.5 2.5 0 0 1 1.9.9l6.3 7.5a1.5 1.5 0 0 1 0 1.9l-6.3 7.5a2.5 2.5 0 0 1-1.9.9H6.5A2.5 2.5 0 0 1 4 23.1Z" />
        <path d="M9 3.5V7M14 3.5V7M9 25.3v3.2M14 25.3v3.2" />
        <path d="M8.5 13 12 17 14.5 15 18 19" />
      </g>
      <circle cx="22.5" cy="16.25" r="1.6" fill="currentColor" />
    </svg>
  );
}
