import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    tailwindcss()
  ],
  base: '/ffxiv-item-search-tc/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    // Let Vite handle WASM optimization
  },
})
