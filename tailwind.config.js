/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        skroutz: '#f68b24',
        bestprice: '#2563eb',
      },
    },
  },
  plugins: [],
};
