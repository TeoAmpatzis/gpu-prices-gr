// ESLint (flat config): the recommended rules of ESLint, typescript-eslint and eslint-plugin-react,
// plus eslint-plugin-react-hooks' recommended set (rules of hooks, exhaustive deps and the React
// Compiler checks). Dev tooling only: nothing here reaches the site's bundle.
//
// Violations that existed when lint was added (v2 Phase 0, 2026-10-03) are recorded in
// eslint-suppressions.json (ESLint's bulk suppressions) so `npm run lint` fails only on new ones;
// `npm run lint:baseline` lists them all. Fixing them is later work.

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/',
    'node_modules/',
    'venv/',
    'public/',
    'scraper/',
    'docs/',
    'local/', // project-local scratch files and captured test output
    '.vercel/',
    '.superpowers/**',
    '.claude/', // git worktrees live in .claude/worktrees/
    'test-results/',
    'playwright-report/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [react.configs.flat.recommended, react.configs.flat['jsx-runtime'], reactHooks.configs.flat.recommended],
    settings: { react: { version: 'detect' } },
    languageOptions: { globals: globals.browser },
  },
  {
    // Build config, check scripts and test runners run in Node.
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,mts,ts}', 'tests/**/*.{ts,mts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // A leading underscore marks a deliberately unused name; rest siblings drop fields from a copy.
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
]);
