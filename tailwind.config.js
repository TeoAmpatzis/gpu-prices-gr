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
        skroutz: '#f68b24',
        bestprice: '#2563eb',
        // Theme tokens, defined in src/index.css for light and .dark.
        page: token('page'),
        panel: token('panel'),
        surface: token('surface'),
        sunken: token('sunken'),
        hover: token('hover'),
        line: token('line'),
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
