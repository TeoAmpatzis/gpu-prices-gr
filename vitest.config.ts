// Unit tests (Vitest). Separate from vite.config.ts so tests never start the data plugin (it reads
// public/data and fetches the images index); the site's bundle is not affected.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/compat/**/*.test.ts'],
    environment: 'node',
    // Tests over the real data take seconds on GitHub's runners (first CI run 2026-11-11: 5006 ms against the 5 s default).
    testTimeout: 30_000,
    // facets, modelChunks and listFile each load the real data (218 MB) and compute for 20-30 s. With a worker per
    // runner core they starve vitest's main thread on GitHub's 4-core runners, and its 60 s RPC to the workers times out
    // ("Timeout calling onTaskUpdate", every CI run since 2026-11-14 15:12). Two workers keep it answering.
    maxWorkers: process.env.CI ? 2 : undefined,
  },
});
