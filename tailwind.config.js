/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // v2 type scale: xs 12, sm 14, base 16, lg 18, 2xl 24 (Tailwind's) + display 32.
      fontSize: {
        display: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      },
      colors: {
        // Design tokens, defined in src/index.css for light and .dark — no raw palette colours in components.
        ok: token('ok'),
        warn: token('warn'),
        idle: token('idle'),
        'warn-bg': token('warn-bg'),
        'warn-fg': token('warn-fg'),
        'danger-bg': token('danger-bg'),
        'danger-fg': token('danger-fg'),
        'sale-bg': token('sale-bg'),
        'sale-fg': token('sale-fg'),
        'low-bg': token('low-bg'),
        'low-fg': token('low-fg'),
        'skroutz-bg': token('skroutz-bg'),
        'skroutz-fg': token('skroutz-fg'),
        'bestprice-bg': token('bestprice-bg'),
        'bestprice-fg': token('bestprice-fg'),
        'eshop-bg': token('eshop-bg'),
        'eshop-fg': token('eshop-fg'),
        'shopflix-bg': token('shopflix-bg'),
        'shopflix-fg': token('shopflix-fg'),
        'snif-bg': token('snif-bg'),
        'snif-fg': token('snif-fg'),
        page: token('page'),
        panel: token('panel'),
        surface: token('surface'),
        sunken: token('sunken'),
        hover: token('hover'),
        line: token('line'),
        edge: token('edge'),
        'edge-hover': token('edge-hover'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-soft': token('fg-soft'),
        muted: token('muted'),
        faint: token('faint'),
        accent: token('accent'),
        up: token('up'),
        // v2 design system (src/ui/tokens.css)
        overlay: token('overlay'),
        focus: token('focus'),
        'brand-solid': token('brand-solid'),
        'brand-solid-hover': token('brand-solid-hover'),
        'on-brand': token('on-brand'),
        'brand-subtle': token('brand-subtle'),
        'brand-subtle-line': token('brand-subtle-line'),
        'danger-solid-hover': token('danger-solid-hover'),
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, token(`brand-${n}`)])),
        ...Object.fromEntries(
          ['success', 'warning', 'danger', 'info'].flatMap((m) =>
            ['fg', 'strong', 'bg', 'line', 'solid'].map((r) => [`${m}-${r}`, token(`${m}-${r}`)]),
          ),
        ),
      },
    },
  },
  plugins: [],
};
