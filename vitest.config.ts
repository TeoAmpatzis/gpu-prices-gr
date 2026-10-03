// Unit tests (Vitest). Separate from vite.config.ts so tests never start the data plugin (it reads
// public/data and fetches the images index); the site's bundle is not affected.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/compat/**/*.test.ts'],
    environment: 'node',
  },
});
