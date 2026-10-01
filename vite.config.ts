import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dataFiles from './vite-plugin-data';

// Product photos live in the images repo's GitHub Pages site; Vercel serves them as /img/ (vercel.json),
// and dev/preview forward the same path.
const img = {
  '/img': {
    target: 'https://teoampatzis.github.io',
    changeOrigin: true,
    rewrite: (path: string) => `/builddraft-images${path}`,
  },
};

export default defineConfig({
  plugins: [react(), dataFiles()],
  server: { port: 5174, host: true, proxy: img },
  preview: { proxy: img },
});
