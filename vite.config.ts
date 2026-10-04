import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
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

/**
 * Real URLs: the host answers unknown addresses with 404.html (vercel.json rewrites only the app's own
 * addresses to index.html), so 404.html is the app itself, which then shows its 404 page.
 */
function notFoundPage(): Plugin {
  let outDir = 'dist';
  return {
    name: 'builddraft-404',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), dataFiles(), notFoundPage()],
  server: { port: 5174, host: true, proxy: img },
  preview: { proxy: img },
});
