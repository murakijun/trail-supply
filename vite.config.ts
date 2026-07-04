import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/trail-supply/',
  build: {
    rollupOptions: {
      output: {
        // ハッシュなし固定名 → SWがURLを事前に知れる
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [react()],
})
