import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { packedCollisionPlugin } from './tools/packedCollisionPlugin.js'

export default defineConfig({
  plugins: [react(), packedCollisionPlugin()],
  server: { port: 5173, open: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 1600 },
})
