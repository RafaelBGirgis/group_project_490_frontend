import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
    alias: {
      '\\.svg$': new URL('./src/test/__mocks__/svg.js', import.meta.url).pathname,
    },
  },
  server: {
    allowedHosts: ['till-failure.us'],
    proxy: {
      '/auth': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '^/me$': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        rewrite: () => '/me',
      },
      '/roles': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      // /api covers /api/foods (USDA proxy) and /api/meals (CRUD + prescribe).
      // Without this, /api/* requests fall through to Vite's SPA fallback and
      // return the index.html page as a 200, which the JSON client silently
      // turns into an empty array — searches "work" but show no results.
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
})
