import { copyFileSync, existsSync, readFileSync } from 'node:fs';
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

const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const securityHeaders = Object.fromEntries((vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]));

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
      // A failed build has no index.html: copying would hide the build's own error (the data check's reason).
      if (existsSync(join(outDir, 'index.html'))) copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), dataFiles(), notFoundPage()],
  // The dev server is reachable from other devices only on request (phone testing): DEV_HOST=1 npm run dev.
  server: { port: 5174, host: !!process.env.DEV_HOST, proxy: img },
  // The preview sends the site's security headers (vercel.json), so the browser tests run under the live policy.
  preview: { proxy: img, headers: securityHeaders },
});
