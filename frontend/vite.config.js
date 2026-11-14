// =============================================================================
// vite.config.js — settings for Vite, the tool that runs the website in
// development (npm run dev) and bundles it for production (npm run build).
// =============================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()], // enables React/JSX support
  server: {
    // The website runs on port 5173 and the backend on port 5001.
    // This forwards any request starting with /api to the backend, so the
    // frontend code can simply call fetch("/api/sessions").
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
})
