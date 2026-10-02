import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.FITKARTA_API_URL || 'http://localhost:4310'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    open: true,
    proxy: {
      // `timeout`/`proxyTimeout` bound how long the proxy will wait on the
      // upstream server before giving up — without them, a request that the
      // dev proxy never gets a response for (seen intermittently under load,
      // especially navigating away mid-request) hangs the browser's fetch()
      // forever instead of failing with a clear error, occupying one of the
      // browser's 6 connections-per-origin until the page is hard-refreshed.
      '/api': { target: API_TARGET, changeOrigin: true, timeout: 10000, proxyTimeout: 10000 },
      '/media': { target: API_TARGET, changeOrigin: true, timeout: 10000, proxyTimeout: 10000 },
      '/thumb': { target: API_TARGET, changeOrigin: true, timeout: 10000, proxyTimeout: 10000 },
    },
  },
})
