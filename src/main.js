import { bindToggles, getLang, isDark } from './core/prefs.js';
import { initScroll, gsap, ScrollTrigger, reduceMotion } from './core/scroll.js';
import { initReveal } from './core/reveal.js';
import { initLinks, initCursor } from './core/ui.js';
import { detectTier, hasWebGL, GL_ATTRS } from './core/quality.js';
import { ALL_TEXT } from './hero/textures.js';
import { sketch, shown } from './boot.js';
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

// ---------------------------------------------------------------- static bits (the logos and the copy: boot.js)
bindToggles();
initLinks();
history.scrollRestoration = 'manual';

// ---------------------------------------------------------------- opening
// No loading screen. boot.js shows the first screen and sketches the 3D scene in pencil where it will appear; the
// render develops inside the lines once it is ready.
const html = document.documentElement;

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
async function bootScene(sketch) {
  // the one WebGL context: it answers whether WebGL works, names the GPU for the tier, and the renderer reuses it
  let gl = null;
  try { gl = hasWebGL() ? canvas.getContext('webgl2', GL_ATTRS) : null; } catch (e) { gl = null; }
  if (!gl) { canvas.remove(); fallbackPoster(sketch); return; }
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
  // the render develops inside the finished sketch (same pose: the scene's clock starts at its first frame), the
  // lines fade off it, then the threads draw out of the screen and the pointer starts to sway the camera
  await sketch?.drawn;
  scene.start();
  wireSceneScroll();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    html.classList.add('gl-on'); sketch?.hide();
    if (!reduceMotion) {
      gsap.to(scene.state, { links: 1, duration: 2.9, delay: .55, ease: 'none' }); // each thread eases within its own window
      gsap.to(scene.state, { par: 1, duration: 2.4, delay: 1.3, ease: 'power1.inOut' });
    }
  }));
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

function fallbackPoster(sketch) {
  sketch?.hide();
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
// until the scene drives the story overlays, the scroll position does
ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: self => { if (!scene) paintStory(self.progress); } });
(async () => {
  // 1. the first screen is up (or coming up) from boot.js, with the scene sketched; three.js, preloaded with the
  //    scripts, arrives and the scene builds
  const booting = bootScene(sketch).catch(e => { console.error(e); fallbackPoster(sketch); });
  // 2. the sections below the fold are set up between the scene's build steps
  await shown;
  for (const init of [initRead, initBoard, initInk, initRecall, initSync]) { init(); await nextFrame(); }
  await document.fonts.ready;
  initReveal();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  await booting;
  ScrollTrigger.refresh();
  // 3. the page is built: the pointer's follower can appear (it would stutter while the scene was building)
  requestAnimationFrame(() => html.classList.add('settled'));
})();
