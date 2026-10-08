import { applyText, bindToggles, getLang, isDark } from './core/prefs.js';
import { initScroll, gsap, ScrollTrigger, reduceMotion } from './core/scroll.js';
import { initReveal } from './core/reveal.js';
import { initLinks, initCursor } from './core/ui.js';
import { logoSVG, loaderSVG } from './core/logo.js';
import { detectTier, hasWebGL, GL_ATTRS } from './core/quality.js';
import { ALL_TEXT } from './hero/textures.js';
import { initRead } from './sections/read.js';
import { initBoard } from './sections/board.js';
import { initInk } from './sections/ink.js';
import { initRecall } from './sections/recall.js';
import { initSync } from './sections/sync.js';

const $ = s => document.querySelector(s);
const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

// The 3D chunk (three.js) starts downloading immediately, in parallel with fonts and the rest of the boot.
const scenePromise = hasWebGL() ? import('./hero/scene.js') : null;
const nextFrame = () => new Promise(r => setTimeout(r, 0));

// ---------------------------------------------------------------- static bits
document.querySelectorAll('[data-logo]').forEach(el => { el.innerHTML = logoSVG(); });
applyText();
bindToggles();
initLinks();
history.scrollRestoration = 'manual';

// ---------------------------------------------------------------- loader: the mark assembles from its pieces
// The loader animates with CSS (transform/opacity on the compositor), so it keeps moving while the main thread
// builds the page and the 3D scene.
const loader = $('#loader');
$('#loaderMark').innerHTML = loaderSVG(isDark());
const loaderStart = performance.now();
// the blurred hero preview (chosen and preloaded in index.html) covers the wait for the 3D scene
const preview = $('#preview');
preview.src = document.documentElement.dataset.preview || 'posters/preview-dark-l.jpg';
preview.classList.toggle('portrait', /-p\.jpg$/.test(preview.src));
const previewReady = preview.decode().then(() => true, () => false);
let previewOn = false;
function hidePreview() { if (!previewOn) return; previewOn = false; preview.classList.add('off'); setTimeout(() => { preview.hidden = true; }, 1300); }

async function exitLoader() {
  const minShow = reduceMotion ? 0 : 1450; // the mark finishes assembling
  await new Promise(r => setTimeout(r, Math.max(0, minShow - (performance.now() - loaderStart))));
  // lift the loader onto the preview, never onto an empty background (wait a little for it on a slow link)
  if (!scene && await Promise.race([previewReady, new Promise(r => setTimeout(() => r(false), 1500))])) {
    previewOn = true; preview.classList.add('on'); document.documentElement.classList.add('has-preview');
  }
  loader.classList.add('leaving');
  await new Promise(r => setTimeout(r, reduceMotion ? 0 : 420));
  loader.classList.add('done');
}

// ---------------------------------------------------------------- scroll
initScroll();
initCursor();

// ---------------------------------------------------------------- story overlays (driven by the scene's smoothed progress)
const beats = [...document.querySelectorAll('.stage [data-from]')];
const storyProg = $('#storyProg'), scrimL = $('#scrimL'), scrimB = $('#scrimB');
// the chapter marks under the story: the current one lights up and fills as its chapter plays
const marks = [...document.querySelectorAll('.mk')], markFill = marks.map(m => m.querySelector('.tk i'));
const MARK = [[.12, .41], [.41, .76], [.76, 1]];
let markOn = -2;
const markK = marks.map(() => -1);
function paintMarks(p) {
  const on = MARK.findIndex(([a, b], i) => p >= a && (p < b || i === MARK.length - 1));
  if (on !== markOn) { markOn = on; marks.forEach((m, i) => { m.classList.toggle('on', i === on); m.classList.toggle('past', on >= 0 && i < on); }); }
  MARK.forEach(([a, b], i) => { const k = Math.round(seg(p, a, b) * 200) / 200; if (k !== markK[i]) { markK[i] = k; markFill[i].style.transform = `scaleX(${k})`; } });
}
marks.forEach(m => m.addEventListener('click', () => {
  const story = $('#story'), y = story.offsetTop + +m.dataset.go * (story.offsetHeight - innerHeight);
  const screens = Math.abs(y - scrollY) / innerHeight;
  window.__lenis?.scrollTo(y, { duration: reduceMotion ? 0 : Math.min(2.4, 1 + screens * .3), easing: t => 1 - Math.pow(1 - t, 4) });
}));
function paintStory(p) {
  beats.forEach(el => {
    const a = +el.dataset.from, b = +el.dataset.to;
    const op = a === 0 ? 1 - seg(p, b - .06, b) : Math.min(seg(p, a, a + .05), 1 - seg(p, b - .05, b));
    el.style.opacity = op; el.style.visibility = op > .005 ? 'visible' : 'hidden';
    el.style.translate = `0 ${(1 - op) * (p > a ? -24 : 24)}px`;
  });
  storyProg.style.transform = `scaleX(${p})`;
  paintMarks(p);
  scrimL.style.opacity = Math.min(seg(p, .14, .22), 1 - seg(p, .66, .74));
  scrimB.style.opacity = seg(p, .78, .9);
}
paintStory(0);

// ---------------------------------------------------------------- 3D scene
let scene = null;
const canvas = $('#gl');
async function bootScene() {
  // the one WebGL context: it answers whether WebGL works, names the GPU for the tier, and the renderer reuses it
  let gl = null;
  try { gl = hasWebGL() ? canvas.getContext('webgl2', GL_ATTRS) : null; } catch (e) { gl = null; }
  if (!gl) { canvas.remove(); fallbackPoster(); return; }
  // canvas textures need their fonts; the scene builds everything else (and warms its GPU programs) meanwhile
  const faces = ['400 30px "Noto Serif SC"', '500 30px "Noto Sans SC"', '700 30px "Noto Sans SC"', '400 30px Inter', '500 30px Inter', '600 30px Inter', '400 30px "Instrument Serif"', 'italic 400 30px "Instrument Serif"', '500 30px "JetBrains Mono"'];
  const fontsReady = Promise.race([Promise.all(faces.map(f => document.fonts.load(f, ALL_TEXT).catch(() => {}))), new Promise(r => setTimeout(r, 5000))]);
  const { createScene } = await scenePromise;
  const tier = detectTier(gl);
  document.documentElement.dataset.tier = tier;
  scene = await createScene({ canvas, context: gl, tier, getLang, isDark, reduceMotion, fontsReady });
  scene.onStory = paintStory;
  scene.onDowngrade = () => { if (tier !== 'low' && !new URLSearchParams(location.search).get('q')) { try { sessionStorage.setItem('kx-q', 'low'); } catch (e) {} } };
  addEventListener('kx:lang', () => scene.refreshTextures());
  addEventListener('kx:theme', () => gsap.to(scene.T, { k: isDark() ? 1 : 0, duration: 1.1, ease: 'power2.inOut', onUpdate: () => scene.applyTheme(scene.T.k) }));
  scene.start();
  wireSceneScroll();
  // with the preview up, the live scene appears under it already in its final pose and the preview fades off it
  // (a focus pull); without one, the canvas fades in as the tablet flies in
  if (previewOn) scene.state.intro = 1;
  requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.classList.add('gl-on'); hidePreview(); }));
  // after a long jump, land on the new story position instead of animating the 3D story through to it
  addEventListener('kx:jumped', () => { scene.snap(); paintStory(scene.state.p); if (scene.state.p < .02) replayHero(); });
  window.__scene = scene;
}

function wireSceneScroll() {
  let inStory = true, inJoin = false;
  const sync = () => scene.setMode(inJoin ? 'join' : inStory ? 'story' : 'off');
  ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: self => scene.setStory(self.progress) });
  // keep rendering until the first section fully covers the canvas
  ScrollTrigger.create({ trigger: '#read', start: 'top top', onEnter: () => { inStory = false; sync(); }, onLeaveBack: () => { inStory = true; sync(); } });
  ScrollTrigger.create({ trigger: '#join', start: 'top bottom', end: 'bottom top', onToggle: self => { inJoin = self.isActive; scene.setJoin(inJoin ? 1 : 0); sync(); } }); // the orbit is the join section's alone: it must not follow the camera back up the story
  sync();
}

function fallbackPoster() {
  hidePreview();
  const img = $('#poster');
  img.src = `posters/hero-${isDark() ? 'dark' : 'light'}.jpg`;
  img.hidden = false;
  ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: self => paintStory(self.progress) });
}

function replayHero() {
  if (reduceMotion) return;
  gsap.fromTo('.hero > *', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .07, ease: 'expo.out', delay: .25, clearProps: 'transform,opacity' });
}

// ---------------------------------------------------------------- go
(async () => {
  // Progressive start: the page (copy, fonts, sections) is revealed as soon as it is ready, and the 3D scene,
  // the heaviest part of the boot (GPU programs compile on first draw), builds behind it and fades in when done.
  // The hero copy animates in CSS, on the compositor, so the scene's long tasks cannot stall it.
  for (const init of [initRead, initBoard, initInk, initRecall, initSync]) { init(); await nextFrame(); }
  await document.fonts.ready;
  initReveal();
  // until the scene drives the story overlays, the scroll position does
  ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: self => { if (scene) return; paintStory(self.progress); if (self.progress > .04) hidePreview(); } });
  addEventListener('kx:theme', () => { if (previewOn) preview.src = preview.src.replace(/preview-(dark|light)/, `preview-${isDark() ? 'dark' : 'light'}`); });
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  await exitLoader();
  document.documentElement.classList.add('intro');
  setTimeout(() => document.documentElement.classList.remove('intro'), 2400); // hand the elements back to GSAP (replayHero)
  await nextFrame();
  try { await bootScene(); } catch (e) { console.error(e); fallbackPoster(); }
  ScrollTrigger.refresh();
  if (scene && !reduceMotion && scene.state.intro < 1) gsap.to(scene.state, { intro: 1, duration: 2.6, ease: 'power2.out' });
  else if (scene) scene.state.intro = 1;
})();
