// Renders every brand file from the logo's own shapes (src/ui/logos.tsx), with Playwright (no Python).
//   npx tsx scripts/brand/render.mts
// public/: favicon.svg (adapts to light and dark browser tabs), favicon-32.png, apple-touch-icon.png
// (180, square: iOS rounds it), icon-512.png, og.png (1200 × 630 social image).
// public/brand/: versions for use outside the site (README, social profiles): the wordmark on light and
// on dark backgrounds (PNG, 2×), the symbol on light and on dark (SVG + 512 px PNG).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { SYMBOL, faviconSvg } from '../../src/ui/logos';

const ROOT = resolve(import.meta.dirname, '../..');
const PUBLIC = join(ROOT, 'public');
const BRAND = join(PUBLIC, 'brand');
mkdirSync(BRAND, { recursive: true });

// Colours (src/ui/tokens.css): brand-600 on light, brand-400 on dark, brand-500 where one PNG must work on both.
const C = { brand600: '#4F46E5', brand500: '#6366F1', brand400: '#818CF8', page: '#030712', ink: '#111827', snow: '#F9FAFB' };

const symbolSvg = (color: string, size?: number, small = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${size ? ` width="${size}" height="${size}"` : ''}><g style="color:${color}">` +
  `<path d="${SYMBOL.b}" fill="none" stroke="currentColor" stroke-width="${small ? 4 : 3.4}" stroke-linejoin="round"/>` +
  `<path d="${SYMBOL.dot}" fill="currentColor"/>` +
  (small ? '' : `<path d="${SYMBOL.dotPins}" fill="none" stroke="currentColor" stroke-width="1.4"/>`) +
  `</g></svg>`;

const chipDot = `<svg viewBox="0 0 10 10" style="display:inline-block;width:.42em;height:.42em;margin:0 .05em;vertical-align:-.02em"><rect x="1.9" y="1.9" width="6.2" height="6.2" rx=".7" fill="currentColor"/><path d="M3.6 0v1.9M6.4 0v1.9M3.6 8.1V10M6.4 8.1V10M0 3.6h1.9M0 6.4h1.9M8.1 3.6H10M8.1 6.4H10" stroke="currentColor" stroke-width="1"/></svg>`;
const wordmark = `<span class="wm"><b>Build</b><span style="font-weight:300">Draft</span>${chipDot}<span style="font-weight:500">gr</span></span>`;

const fonts = ['latin', 'greek']
  .map((s) => `@font-face{font-family:Inter;font-weight:100 900;src:url(${pathToFileURL(join(PUBLIC, 'fonts', `inter-${s}.woff2`)).href}) format('woff2')}`)
  .join('');
const page = (body: string, css = '') =>
  `<!doctype html><meta charset="utf-8"><style>${fonts}html,body{margin:0}body{font-family:Inter,sans-serif}.wm{white-space:nowrap;letter-spacing:-.02em;line-height:1}.wm b{font-weight:700}${css}</style>${body}`;

const tmp = join(tmpdir(), `brand-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch();

async function shot(name: string, html: string, width: number, height: number, transparent = false) {
  const file = join(tmp, `${name.replace(/[\\/]/g, '_')}.html`);
  writeFileSync(file, html);
  const p = await browser.newPage({ viewport: { width, height } });
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: name, omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
  await p.close();
  console.log('wrote', name.replace(ROOT, '').replace(/\\/g, '/'));
}

// Favicons and app icons.
writeFileSync(join(PUBLIC, 'favicon.svg'), faviconSvg(C.brand600, C.brand400) + '\n');
console.log('wrote /public/favicon.svg');
await shot(join(PUBLIC, 'favicon-32.png'), page(symbolSvg(C.brand500, 32, true)), 32, 32, true);
const appIcon = (s: number) => page(`<div style="width:${s}px;height:${s}px;background:${C.page};display:grid;place-items:center">${symbolSvg(C.brand400, Math.round(s * 0.62))}</div>`);
await shot(join(PUBLIC, 'apple-touch-icon.png'), appIcon(180), 180, 180);
await shot(join(PUBLIC, 'icon-512.png'), appIcon(512), 512, 512);

// Social image, as in the catalogue: the wordmark in white on the brand colour.
await shot(
  join(PUBLIC, 'og.png'),
  page(
    `<div class="og"><div class="wm" style="font-size:104px">${wordmark}</div><p class="t">Τιμές εξαρτημάτων PC στην Ελλάδα · PC Builder</p><p class="f">5 πηγές τιμών · 9 κατηγορίες · ενημέρωση κάθε 6 ώρες</p></div>`,
    `.og{width:1200px;height:630px;box-sizing:border-box;padding:0 96px;display:flex;flex-direction:column;justify-content:center;gap:32px;color:#fff;background-color:${C.brand600};background-image:linear-gradient(to right,rgb(255 255 255/.12) 2px,transparent 2px),linear-gradient(to bottom,rgb(255 255 255/.12) 2px,transparent 2px);background-size:48px 48px}.og p{margin:0}.t{font-size:40px;font-weight:500;line-height:1.2}.f{font-size:30px}`,
  ),
  1200,
  630,
);

// Versions for outside the site.
for (const [name, fg, bg] of [
  ['wordmark-on-light', C.ink, '#FFFFFF'],
  ['wordmark-on-dark', C.snow, C.page],
] as const) {
  await shot(join(BRAND, `${name}.png`), page(`<div style="width:1200px;height:300px;display:grid;place-items:center;background:${bg};color:${fg}"><div class="wm" style="font-size:150px">${wordmark}</div></div>`), 1200, 300);
}
for (const [name, color] of [
  ['symbol-on-light', C.brand600],
  ['symbol-on-dark', C.brand400],
] as const) {
  writeFileSync(join(BRAND, `${name}.svg`), symbolSvg(color) + '\n');
  await shot(join(BRAND, `${name}.png`), page(symbolSvg(color, 512)), 512, 512, true);
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
