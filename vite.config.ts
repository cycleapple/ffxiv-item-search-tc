import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ffxiv-item-search-tc/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
