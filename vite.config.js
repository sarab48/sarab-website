import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SARAB — Vite + React. `public/` already holds the brand assets and is served at root.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0, // never inline media; keep assets cacheable
  },
})
