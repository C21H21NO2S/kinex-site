import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/, so all asset URLs are relative.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: id => (id.includes('node_modules/three') ? 'three' : undefined) } },
  },
  server: { host: '127.0.0.1' },
});
