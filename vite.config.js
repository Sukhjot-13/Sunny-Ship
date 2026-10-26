import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  server: { port: Number(process.env.SUNNY_PORT || 5173), open: false, strictPort: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
})
