import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The page's entry is boot.js (small); it imports main.js, and main.js the 3D scene, only once the opening sketch is
// on screen. Announce those chunks in the HTML so they download alongside the entry instead of after it.
const preloadLater = () => ({
  name: 'kinex-preload-later',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (ctx.path !== '/index.html') return html; // the terms and privacy pages have no 3D scene
      const chunks = Object.values(ctx.bundle || {}).filter(c => c.type === 'chunk'), byName = new Map(chunks.map(c => [c.fileName, c]));
      const files = new Set(), add = f => { const c = byName.get(f); if (!c || c.isEntry || files.has(f)) return; files.add(f); c.imports.forEach(add); };
      chunks.filter(c => /(^|\/)(main|scene|three)-[^/]+\.js$/.test(c.fileName)).forEach(c => add(c.fileName));
      return { html, tags: [...files].map(f => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: './' + f }, injectTo: 'head' })) };
    },
  },
});

// A683: the changelog is drawn by updates.js from api.kinexnote.com, so the page itself had no text in it: KineX's web
// import (which runs no page scripts) and search engines found nothing. The build writes the versions into the page as
// plain HTML (Chinese, the page's own language); updates.js replaces them with the live list once it has it. When the
// API cannot be reached the page is built as before. KINEX_RELEASES_FILE reads a saved /v1/releases answer instead.
const RELEASES_API = 'https://api.kinexnote.com/v1/releases';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const readReleases = async () => {
  if (process.env.KINEX_RELEASES_FILE) return JSON.parse(readFileSync(process.env.KINEX_RELEASES_FILE, 'utf8')).releases;
  const response = await fetch(RELEASES_API, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).releases;
};
const staticChangelog = releases => {
  const day = ms => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
  const groups = notes => [['新增', notes?.added], ['改进', notes?.improved], ['修复', notes?.fixed]].filter(([, items]) => items?.length)
    .map(([name, items]) => `<div class="grp"><h4>${name}</h4><ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('');
  const body = releases.map(r => `<article class="rel" id="v-${esc(r.version.replace(/[^0-9A-Za-z]+/g, '-'))}"><div class="rel-h"><span class="v">${esc(r.version)}</span> <span class="d">${day(r.releasedAt)}</span></div><h3>${esc(r.title)}</h3>${groups(r.notes)}</article>`).join('');
  return `<div class="log-body static-log"><h2 class="sr-only">更新日志</h2>${body}</div>`;
};
const prerenderChangelog = () => ({
  name: 'kinex-prerender-changelog',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    async handler(html, ctx) {
      if (ctx.path !== '/updates/index.html') return html;
      const empty = '<section class="view" id="view-changelog" hidden></section>';
      if (!html.includes(empty)) return html;
      let releases;
      try { releases = await readReleases(); } catch (error) { console.warn(`[prerender] changelog left to updates.js: ${error.message}`); return html; }
      if (!Array.isArray(releases) || !releases.length) return html;
      return html.replace(empty, `<section class="view" id="view-changelog" data-static>${staticChangelog(releases)}</section>`);
    },
  },
});

// GitHub Pages serves the site from /<repo>/ (or a custom domain), so all asset URLs are relative.
export default defineConfig({
  base: './',
  plugins: [preloadLater(), prerenderChangelog()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // A644: the terms and privacy pages beside the home page (kinexnote.com/terms/, /privacy/); A660: 动态 and 下载; 手册 (guide/, built from Markdown by npm run guide)
      input: { main: 'index.html', terms: 'terms/index.html', privacy: 'privacy/index.html', updates: 'updates/index.html', download: 'download/index.html', guide: 'guide/index.html' },
      output: { manualChunks: id => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
  server: { host: '127.0.0.1' },
});
