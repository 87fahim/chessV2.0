import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'server/dist',
    'server/**',
    '.github/**',
    'docs/**',
    // Nested Ludo app: keep client UI linted; ignore its own server/tooling.
    'src/ludo/server/**',
    'src/ludo/dist-server/**',
    'src/ludo/node_modules/**',
    'src/ludo/vite.config.ts',
    'src/ludo/eslint.config.js',
    'src/ludo/src/main.tsx',
  ]),
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Vendored Ludo client uses localStorage hydrate / repair effects that trip this rule.
  {
    files: ['src/ludo/src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
