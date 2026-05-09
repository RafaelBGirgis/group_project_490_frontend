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
      '/me': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
      '/roles': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
})
