import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// UI-only config — no backend proxy needed (API calls are mocked).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
