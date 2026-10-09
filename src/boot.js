// The page's entry, small on purpose: the first screen (the copy in the reader's language, the header mark
// assembling) and the 3D scene sketched in pencil where it will appear. The main script (GSAP, the sections, then
// three.js and the scene) downloads alongside but only runs once the sketch is on screen: until then this thread must
// stay free, or the sketch would stay blank and then appear half drawn. main.js develops the scene inside the sketch.
import { applyText, getLang } from './core/prefs.js';
import { logoSVG, logoPiecesSVG } from './core/logo.js';
import { hasWebGL } from './core/quality.js';
import { drawSketch } from './hero/sketch.js';

const html = document.documentElement, $ = s => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-logo]').forEach(el => { el.innerHTML = logoSVG(); });
$('.nav .brand-mark').innerHTML = logoPiecesSVG(); // the header mark assembles in place on the first screen
applyText();

// the scene, in pencil (in a worker, so the drawing keeps its pace whatever the main thread is doing)
export const sketch = hasWebGL() ? drawSketch($('#boot-sketch'), { reduceMotion }) : null;

// the copy, as soon as the first screen's own (small) font files are in: it rises, the header mark assembles
function firstScreenFonts() {
  const zh = getLang() === 'zh', text = ($('.hero')?.textContent || '') + ($('.nav')?.textContent || '');
  // the Chinese sans: just its first-screen face (fonts.load() would also wait for the full face, which covers
  // every character too)
  const hero = zh ? [...document.fonts].filter(f => f.family.replace(/["']/g, '') === 'Noto Sans SC' && f.unicodeRange !== 'U+0-10FFFF') : [];
  const faces = zh ? ['600 60px Inter', '400 60px "LXGW Neo ZhiSong"', '500 12px "JetBrains Mono"'].concat(hero.length ? [] : ['600 60px "Noto Sans SC"'])
    : ['600 60px Inter', 'italic 400 60px "Instrument Serif"', '400 15px Inter', '500 12px "JetBrains Mono"'];
  const loads = faces.map(f => document.fonts.load(f, text)).concat(hero.map(f => f.load()));
  return Promise.race([Promise.all(loads.map(p => p.catch(() => {}))), new Promise(r => setTimeout(r, 1200))]);
}
export const shown = firstScreenFonts().then(() => {
  html.classList.remove('booting'); html.classList.add('intro');
  setTimeout(() => html.classList.remove('intro'), 2400); // hand the elements back to GSAP (main.js replayHero)
});

// the rest of the page, once the sketch is on screen
Promise.resolve(sketch?.ready).then(() => import('./main.js')).catch(e => { console.error(e); html.classList.remove('booting'); });
