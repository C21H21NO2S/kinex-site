// 使用手册 (kinexnote.com/guide/): guide/zh.md and guide/en.md → guide/index.html, in the terms / privacy pages'
// frame (both languages in the page, the header switch shows one). Run after editing the Markdown:
//
//   npm run guide            (node scripts/build-guide.mjs)
//
// The Markdown stays readable on its own (Typora, GitHub…). What only makes sense there sits between
// <!-- md-only --> and <!-- /md-only -->; the "待补图 / 待补视频" (Image to add / Video to add) notes are left out of
// the page. Mermaid blocks are drawn here, once, into inline SVG whose colours are the page's CSS variables, so the
// page needs no chart library and follows the light / dark switch. Drawn diagrams are kept in guide/diagrams.json
// by source; only new or changed ones need a browser (Playwright: KINEX_PLAYWRIGHT_MODULE, a local `playwright`, or
// the global @playwright/cli's copy). The forgetting curve is drawn by public/guide.js, like the home page's.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'guide');
const require = createRequire(import.meta.url);
const LANGS = [
  { id: 'zh', file: 'zh.md', lang: 'zh-CN', prefix: '', toc: '目录', kicker: 'KineX · 手册', drop: /待补图|待补视频/ },
  { id: 'en', file: 'en.md', lang: 'en', prefix: 'en-', toc: 'Contents', kicker: 'KineX · Guide', drop: /Image to add|Video to add/ },
];
const CURVE = 'assets/fsrs-forgetting-curve.svg';

// ---------------------------------------------------------------- diagrams
// Mermaid draws with these stand-in colours; each becomes a CSS variable of the page (guide.css, .dg).
const SENTINEL = {
  '#010203': 'var(--g-node)', '#040506': 'var(--g-node-line)', '#070809': 'var(--g-text)', '#0a0b0c': 'var(--g-line)',
  '#0d0e0f': 'var(--g-node-2)', '#101112': 'var(--g-label)', '#131415': 'var(--g-group)', '#161718': 'var(--g-group-line)',
  '#191a1b': 'var(--g-note)', '#1c1d1e': 'var(--g-accent)', '#1f2021': 'var(--g-text-2)',
};
const THEME_VERSION = 'g2';
const themeVariables = {
  fontFamily: '"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif', fontSize: '14px',
  background: '#101112', primaryColor: '#010203', primaryBorderColor: '#040506', primaryTextColor: '#070809', lineColor: '#0a0b0c',
  secondaryColor: '#0d0e0f', secondaryBorderColor: '#040506', secondaryTextColor: '#070809',
  tertiaryColor: '#0d0e0f', tertiaryBorderColor: '#040506', tertiaryTextColor: '#070809',
  mainBkg: '#010203', nodeBorder: '#040506', nodeTextColor: '#070809', textColor: '#070809', titleColor: '#070809',
  edgeLabelBackground: '#101112', clusterBkg: '#131415', clusterBorder: '#161718',
  noteBkgColor: '#191a1b', noteBorderColor: '#161718', noteTextColor: '#070809',
  actorBkg: '#010203', actorBorder: '#040506', actorTextColor: '#070809', actorLineColor: '#161718',
  signalColor: '#0a0b0c', signalTextColor: '#070809', labelBoxBkgColor: '#010203', labelBoxBorderColor: '#040506',
  labelTextColor: '#070809', loopTextColor: '#070809', activationBkgColor: '#0d0e0f', activationBorderColor: '#040506', sequenceNumberColor: '#101112',
  labelBackgroundColor: '#101112', stateBkg: '#010203', stateLabelColor: '#070809', transitionColor: '#0a0b0c', transitionLabelColor: '#1f2021',
  specialStateColor: '#1c1d1e', innerEndBackground: '#1c1d1e', compositeBackground: '#131415', compositeTitleBackground: '#131415', altBackground: '#131415',
  stateBorder: '#040506', errorBkgColor: '#010203', errorTextColor: '#070809',
  sectionBkgColor: '#131415', altSectionBkgColor: '#101112', sectionBkgColor2: '#131415', gridColor: '#161718',
  taskBkgColor: '#1c1d1e', taskBorderColor: '#1c1d1e', taskTextColor: '#101112', taskTextLightColor: '#070809', taskTextOutsideColor: '#070809',
  taskTextDarkColor: '#101112', taskTextClickableColor: '#070809', activeTaskBkgColor: '#1c1d1e', activeTaskBorderColor: '#1c1d1e',
  doneTaskBkgColor: '#0d0e0f', doneTaskBorderColor: '#040506', critBkgColor: '#1c1d1e', critBorderColor: '#1c1d1e', todayLineColor: '#1c1d1e',
};
const mermaidConfig = {
  startOnLoad: false, theme: 'base', themeVariables, securityLevel: 'strict', htmlLabels: false,
  flowchart: { htmlLabels: false, wrappingWidth: 340, padding: 14, nodeSpacing: 36, rankSpacing: 44, curve: 'basis', useMaxWidth: true },
  sequence: { useMaxWidth: true, actorMargin: 60, boxMargin: 8, mirrorActors: false },
  state: { useMaxWidth: true }, gantt: { useMaxWidth: true, barHeight: 26, barGap: 8, fontSize: 13, sectionFontSize: 13, leftPadding: 96 },
};
const cacheFile = path.join(dir, 'diagrams.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const keyOf = src => crypto.createHash('sha1').update(THEME_VERSION + '\n' + src).digest('hex').slice(0, 16);

function loadPlaywright() {
  const tries = [process.env.KINEX_PLAYWRIGHT_MODULE, 'playwright'];
  try { tries.push(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '@playwright', 'cli', 'node_modules', 'playwright')); } catch { /* no npm */ }
  for (const t of tries.filter(Boolean)) { try { return require(t); } catch { /* next */ } }
  throw new Error('Drawing new diagrams needs Playwright: set KINEX_PLAYWRIGHT_MODULE to an installed playwright folder.');
}

async function drawDiagrams(sources) {
  const todo = [...new Set(sources)].filter(src => !cache[keyOf(src)]);
  if (!todo.length) return;
  const { chromium } = loadPlaywright();
  const inter = fs.readFileSync(path.join(root, 'public', 'fonts', 'inter.woff2')).toString('base64');
  const page_ = path.join(os.tmpdir(), `kinex-guide-diagrams-${process.pid}.html`);
  fs.writeFileSync(page_, `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:"Inter";src:url(data:font/woff2;base64,${inter}) format("woff2");font-weight:400 800}
    body{margin:0;font-family:${themeVariables.fontFamily}}</style><body><script src="${pathToFileURL(path.join(root, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'))}"></script></body>`);
  const browser = await chromium.launch({ headless: true, channel: process.env.KINEX_GUIDE_BROWSER || 'chrome' });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(page_).href);
    await page.evaluate(() => document.fonts.load('14px Inter'));
    for (const [i, src] of todo.entries()) {
      const svg = await page.evaluate(async ({ src, config, id }) => {
        mermaid.initialize(config);
        const { svg } = await mermaid.render(id, src);
        return svg;
      }, { src, config: mermaidConfig, id: `dg${keyOf(src)}` });
      cache[keyOf(src)] = svg;
      process.stdout.write(`  drew diagram ${i + 1}/${todo.length}\n`);
    }
  } finally {
    await browser.close();
    fs.rmSync(page_, { force: true });
  }
}

// stand-in colours → CSS variables; any colour left over is reported, so the theme map can be extended.
// Mermaid also derives a few colours from the stand-ins (the inverse of the label background for arrowheads, a
// half-transparent label background). Left as they are: presentation attributes the stylesheet overrides (sequence
// actors and notes) and rules for features not used here (gantt exclusions, alternate composite states, popup menus).
const DERIVED = { '#efeeed': 'var(--g-line)', 'rgba(16, 17, 18, 0.5)': 'var(--g-label)' };
const IGNORED = new Set(['#000', '#000000', '#fff', '#ffffff', '#999', '#666', '#eaeaea', '#edf2ae', '#eeeeee', '#e0e0e0', 'rgba(0,0,0,0.2)', 'rgb(0 0 0 / 0.4)']);
function themed(svg) {
  let out = svg.replace(/#[0-9a-f]{6}\b/gi, hex => SENTINEL[hex.toLowerCase()] ?? DERIVED[hex.toLowerCase()] ?? hex);
  for (const [from, to] of Object.entries(DERIVED)) out = out.split(from).join(to);
  out = out.replace(/\s*style="max-width:\s*([\d.]+)px;?"/, (_, w) => ` style="max-width:${Math.round(+w)}px"`);
  const left = [...new Set(out.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) || [])].filter(c => !IGNORED.has(c.toLowerCase()));
  if (left.length) console.warn('  diagram colours not mapped:', left.join(' '));
  return out;
}

// every diagram of a kind carries the same stylesheet: keep one per kind for the page, scoped by data-dg
const pageStyles = new Map();
function diagramHtml(key, lang) {
  let svg = themed(cache[key]);
  const kind = (svg.match(/aria-roledescription="([^"]+)"/) || [, 'diagram'])[1];
  svg = svg.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => {
    pageStyles.set(kind, css.split(`#dg${key}`).join(`.dg svg[data-dg="${kind}"]`));
    return '';
  });
  return svg.replace('<svg ', `<svg data-dg="${kind}" `).replace(/id="dg/g, `id="${lang}-dg`).replace(/#dg([0-9a-f]{16})/g, `#${lang}-dg$1`);
}

// ---------------------------------------------------------------- Markdown → page
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(cfg) {
  const file = path.join(dir, cfg.file);
  if (!fs.existsSync(file)) return null;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  src = src.replace(/<!-- md-only -->[\s\S]*?<!-- \/md-only -->\n?/g, '');
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  const diagrams = [];
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const t = tokens[idx];
    if (t.info.trim() !== 'mermaid') return fence(tokens, idx, opts, env, self);
    diagrams.push(t.content);
    return `<figure class="dg">@@DG${diagrams.length - 1}@@</figure>\n`;
  };
  let html = md.render(src);
  return { cfg, html, diagrams };
}

function assemble({ cfg, html, diagrams }) {
  const p = cfg.prefix;
  html = html.replace(/@@DG(\d+)@@/g, (_, i) => diagramHtml(keyOf(diagrams[+i]), cfg.id));
  // notes for the screenshots still to be made stay in the Markdown only
  html = html.replace(/<blockquote>[\s\S]*?<\/blockquote>\n?/g, q => (cfg.drop.test(q) ? '' : q));
  // the forgetting curve is drawn live (public/guide.js); the SVG file is for Markdown readers
  html = html.replace(new RegExp(`<p><img src="${CURVE}" alt="([^"]*)"\\s*/?></p>`), (_, alt) => `<figure class="curve" role="img" aria-label="${alt}"><svg aria-hidden="true"></svg></figure>`);
  // a paragraph that is all italics is a caption for the figure or diagram above it
  html = html.replace(/<p><em>((?:(?!<\/p>)[\s\S])*?)<\/em><\/p>/g, (all, text) => (text.includes('<em>') ? all : `<p class="gd-cap">${text}</p>`));
  html = html.replace(/<img src="(assets\/[^"]+)"/g, '<img loading="lazy" decoding="async" src="$1"');
  html = html.replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" rel="noopener"');
  // anchors: <a id="x"></a> before a heading becomes the heading's id; the English copy's ids carry "en-"
  html = html.replace(/(?:<p>)?<a id="([^"]+)"><\/a>(?:<\/p>)?\s*<(h[23])>/g, (_, id, h) => `<${h} id="${p}${id}">`);
  if (p) html = html.replace(/href="#([^"]+)"/g, `href="#${p}$1"`);

  // head: the title and the first two paragraphs; everything else before the first chapter is the introduction
  const firstH2 = html.indexOf('<h2');
  const pre = html.slice(0, firstH2), body = html.slice(firstH2);
  const title = pre.match(/<h1>([\s\S]*?)<\/h1>/)[1];
  const paras = [...pre.matchAll(/<p>([\s\S]*?)<\/p>/g)].slice(0, 2);
  let intro = pre.replace(/<h1>[\s\S]*?<\/h1>\n?/, '');
  paras.forEach(m => { intro = intro.replace(m[0], ''); });
  const meta = intro.match(/<p>([^<]*(?:2026|20\d\d)[^<]*)<\/p>\n?/);
  if (meta) intro = intro.replace(meta[0], '');

  const toc = [];
  const sections = body.split(/(?=<h2 id=")/).map(part => {
    const m = part.match(/^<h2 id="([^"]+)">(\d+)\.\s*([\s\S]*?)<\/h2>/);
    if (!m) throw new Error(`${cfg.file}: every chapter needs <a id> and "N. title": ${part.slice(0, 80)}`);
    const [, id, n, text] = m, no = n.padStart(2, '0');
    toc.push(`      <li><a href="#${id}"><i>${no}</i>${text}</a></li>`);
    return `    <section id="${id}">\n      <h2><span class="no">${no}</span>${text}</h2>\n${part.slice(m[0].length).trim()}\n    </section>`;
  });
  return `<article class="lg-doc gd-doc" lang="${cfg.lang}">
  <header class="lg-head">
    <p class="kicker"><b></b><span>${cfg.kicker}</span></p>
    <h1>${title}</h1>
    ${paras.map((m, i) => `<p class="lg-lead${i ? '' : ' gd-tag'}">${m[1]}</p>`).join('\n    ')}
    ${meta ? `<p class="lg-meta"><span>${meta[1]}</span></p>` : ''}
  </header>

  <nav class="toc" aria-label="${cfg.toc}">
    <h2>${cfg.toc}</h2>
    <ol>
${toc.join('\n')}
    </ol>
  </nav>

  <div class="lg-body">
    <section class="gd-intro">
${intro.trim()}
    </section>
${sections.join('\n\n')}
  </div>
</article>`;
}

const docs = LANGS.map(render).filter(Boolean);
await drawDiagrams(docs.flatMap(d => d.diagrams));
// keep only diagrams still in use, in a stable order
const used = new Set(docs.flatMap(d => d.diagrams.map(keyOf)));
fs.writeFileSync(cacheFile, JSON.stringify(Object.fromEntries(Object.keys(cache).filter(k => used.has(k)).sort().map(k => [k, cache[k]])), null, 0) + '\n');

const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const articles = docs.map(d => `<!-- ======================================================================== ${d.cfg.id === 'zh' ? '中文' : 'English'} (from guide/${d.cfg.file}) -->\n${assemble(d)}`).join('\n\n');
const styles = [...pageStyles].sort(([a], [b]) => a.localeCompare(b)).map(([kind, css]) => `/* ${kind} */ ${css}`).join('\n');
const out = template.replace('<!-- @@ARTICLES@@ -->', `<style>/* diagrams, as Mermaid draws them (colours: guide.css) */\n${styles}\n</style>\n${articles}`);
fs.writeFileSync(path.join(dir, 'index.html'), out);
console.log(`guide/index.html: ${docs.map(d => `${d.cfg.id} ${d.diagrams.length} diagrams`).join(', ')}, ${(out.length / 1024).toFixed(0)} KiB`);
