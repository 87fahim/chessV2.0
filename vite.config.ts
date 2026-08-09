import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

/**
 * Derive the UI label from the current git branch.
 *  main           → "" (production – no suffix)
 *  uat / staging  → "UAT"
 *  dev            → "Dev"
 *  feature/xyz    → "xyz"
 *  anything-else  → branch name as-is
 *
 * Env var VITE_APP_LABEL wins if set (deploy workflows can pin it).
 */
function detectAppLabel(): string {
  if (process.env.VITE_APP_LABEL !== undefined) return process.env.VITE_APP_LABEL
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
    if (!branch || branch === 'main') return ''
    if (branch === 'uat' || branch === 'staging') return 'UAT'
    if (branch === 'dev') return 'Dev'
    const m = branch.match(/^(?:features?|fix)\/(.+)$/)
    return m ? m[1] : branch
  } catch {
    return ''
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_LABEL__: JSON.stringify(detectAppLabel()),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
