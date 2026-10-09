import { defineConfig } from 'vite';

// The page's entry is boot.js (small); it imports main.js, and main.js the 3D scene, only once the opening sketch is
// on screen. Announce those chunks in the HTML so they download alongside the entry instead of after it.
const preloadLater = () => ({
  name: 'kinex-preload-later',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const chunks = Object.values(ctx.bundle || {}).filter(c => c.type === 'chunk'), byName = new Map(chunks.map(c => [c.fileName, c]));
      const files = new Set(), add = f => { const c = byName.get(f); if (!c || c.isEntry || files.has(f)) return; files.add(f); c.imports.forEach(add); };
      chunks.filter(c => /(^|\/)(main|scene|three)-[^/]+\.js$/.test(c.fileName)).forEach(c => add(c.fileName));
      return { html, tags: [...files].map(f => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: './' + f }, injectTo: 'head' })) };
    },
  },
});

// GitHub Pages serves the site from /<repo>/ (or a custom domain), so all asset URLs are relative.
export default defineConfig({
  base: './',
  plugins: [preloadLater()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: id => (id.includes('node_modules/three') ? 'three' : undefined) } },
  },
  server: { host: '127.0.0.1' },
});
