import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist', // Output to extension root
    emptyOutDir: false,
    rollupOptions: {
      input: {
        sidepanel: 'index.html'
        // sidepanel: 'sidepanel-react/index.html'
      },
      output: {
        entryFileNames: 'sidepanel.bundle.js'
      }
    }
  }
});
