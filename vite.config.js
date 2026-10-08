import { defineConfig } from 'vite';

// boot.js (the first screen and the opening sketch) is an entry of its own, so it arrives long before the main
// script; main.js imports it too and shares its one instance. The 3D scene is imported dynamically, so the browser
// would only discover three.js after the main script has run: announce both chunks in the HTML instead.
const bootAndPreload = () => ({
  name: 'kinex-boot-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const chunks = Object.values(ctx.bundle || {}).filter(c => c.type === 'chunk');
      const boot = chunks.find(c => c.isEntry && c.name === 'boot');
      const scene = chunks.filter(c => /(^|\/)(scene|three)-[^/]+\.js$/.test(c.fileName)).map(c => c.fileName);
      // module scripts run in document order: boot's must come before the main script's
      const main = html.match(/<script type="module" crossorigin src="[^"]*">/);
      if (boot && main) {
        const pre = boot.imports.map(f => `<link rel="modulepreload" crossorigin href="./${f}">
`).join('');
        html = html.replace(main[0], `${pre}<script type="module" crossorigin src="./${boot.fileName}"></script>
${main[0]}`);
      }
      return { html, tags: scene.map(f => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: './' + f }, injectTo: 'head' })) };
    },
  },
});

// GitHub Pages serves the site from /<repo>/ (or a custom domain), so all asset URLs are relative.
export default defineConfig({
  base: './',
  plugins: [bootAndPreload()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: { index: 'index.html', boot: 'src/boot.js' },
      output: { manualChunks: id => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
  server: { host: '127.0.0.1' },
});
