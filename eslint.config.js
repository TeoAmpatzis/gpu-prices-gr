import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'public', 'scraper', 'venv', 'scripts'] },
  {
    // The site (browser code).
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Same convention as tsc's noUnusedParameters: a leading _ marks a deliberately unused name.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Build config and the build-time data plugin (Node).
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
)
