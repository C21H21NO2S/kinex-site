// The promo film in a dialog. Nothing of it loads with the page: the <video> is made the first time the dialog opens.
// The cut follows the site language (config.js PROMO; a language without its own cut plays the Chinese one, with a
// note). Files come from the Tokyo server first; when that fails (every source errors, the video errors while
// playing, or nothing has arrived in 10 s) the same files from this site take over, at the same second.
import { PROMO } from '../config.js';
import { applyText, getLang } from './prefs.js';
import { gsap, lenis, reduceMotion } from './scroll.js';

const html = document.documentElement;
const cutFor = lang => (PROMO[lang] ? { lang, ...PROMO[lang] } : { lang: 'zh', ...PROMO.zh });
let dlg = null, box = null, veil = null, video = null, note = null;
let cut = null, host = 0, loads = 0, waiting = 0, closing = null;

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'film';
  dlg.setAttribute('aria-labelledby', 'filmTitle');
  dlg.innerHTML = `<div class="film-veil" data-film-close></div>
<div class="film-box">
  <div class="film-bar">
    <p class="film-k" id="filmTitle"><b></b><span data-i18n="film.title"></span></p>
    <button class="film-x" type="button" data-film-close data-i18n-aria="film.close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button>
  </div>
  <div class="film-frame"><video controls playsinline preload="metadata" crossorigin="anonymous"></video></div>
  <p class="film-note" data-i18n="film.note" hidden></p>
</div>`;
  document.body.append(dlg);
  box = dlg.querySelector('.film-box'); veil = dlg.querySelector('.film-veil');
  video = dlg.querySelector('video'); note = dlg.querySelector('.film-note');
  applyText(dlg);
  dlg.addEventListener('click', e => { if (e.target.closest('[data-film-close]')) closeFilm(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeFilm(); }); // Esc (a second Esc in a row closes at once: settle)
  dlg.addEventListener('close', settle);
  video.addEventListener('error', fail); // once a source is playing, its failures land on the video itself
}

// this cut's files from the current host; `at` resumes there after a switch
function load(at = 0) {
  const base = PROMO.hosts[host], id = ++loads;
  clearTimeout(waiting);
  video.poster = base + cut.poster;
  const sources = cut.sources.map(s => Object.assign(document.createElement('source'), { src: base + s.file, type: s.type }));
  sources.at(-1).addEventListener('error', () => { if (id === loads) fail(); }); // the last one failing = all of them
  video.replaceChildren(...sources);
  if (cut.subtitles) {
    const s = cut.subtitles;
    video.append(Object.assign(document.createElement('track'), { kind: 'subtitles', src: base + s.file, srclang: s.srclang, label: s.label, default: true }));
  }
  video.load();
  if (at) video.addEventListener('loadedmetadata', () => { video.currentTime = at; }, { once: true });
  waiting = setTimeout(() => { if (id === loads && video.readyState < 1) fail(); }, 10000);
}

function fail() {
  if (host >= PROMO.hosts.length - 1) return; // nothing left to try: the player shows its own error
  const at = video.currentTime || 0;
  host += 1;
  load(at);
  if (dlg.open && !closing) video.play().catch(() => {});
}

function paint() {
  const c = cutFor(getLang());
  document.querySelectorAll('[data-film-dur]').forEach(el => { el.textContent = c.duration; });
  if (note) note.hidden = c.lang === getLang();
}

export function openFilm() {
  if (!dlg) build();
  if (closing) return;
  const next = cutFor(getLang());
  if (!cut || next.lang !== cut.lang) { cut = next; host = 0; load(); }
  paint();
  dlg.showModal();
  html.classList.add('film-open');
  lenis?.stop();
  dispatchEvent(new CustomEvent('kx:film', { detail: { open: true } }));
  video.play().catch(() => {}); // still inside the click, so it may start with sound
  if (reduceMotion) return;
  gsap.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power2.out' });
  gsap.fromTo(box, { opacity: 0, y: 28, scale: .985 }, { opacity: 1, y: 0, scale: 1, duration: .9, delay: .06, ease: 'expo.out' });
}

export function closeFilm() {
  if (!dlg?.open || closing) return;
  video.pause();
  dispatchEvent(new CustomEvent('kx:film', { detail: { open: false } })); // the scene moves again as the veil lifts
  if (reduceMotion) { dlg.close(); return; }
  gsap.killTweensOf([veil, box]);
  closing = gsap.timeline({ onComplete: () => dlg.close() })
    .to(box, { opacity: 0, y: 14, duration: .28, ease: 'power2.in' })
    .to(veil, { opacity: 0, duration: .38, ease: 'power2.out' }, .06);
}

// the dialog has closed (after the fade, or at once)
function settle() {
  closing = null;
  video.pause();
  gsap.killTweensOf([veil, box]);
  gsap.set([veil, box], { clearProps: 'opacity,transform' });
  html.classList.remove('film-open');
  lenis?.start();
  dispatchEvent(new CustomEvent('kx:film', { detail: { open: false } }));
}

export function initFilm() {
  paint();
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-film]')) return;
    e.preventDefault();
    openFilm();
  });
  // another language may have its own cut: the next opening loads it (the dialog covers the switch while open)
  addEventListener('kx:lang', () => {
    paint();
    if (cut && cutFor(getLang()).lang !== cut.lang) { video.pause(); cut = null; }
  });
}
