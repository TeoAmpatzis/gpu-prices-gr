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
      },
    },
  },
  plugins: [],
};
