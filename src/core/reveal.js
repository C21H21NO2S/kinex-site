// Headline line-masks and fade-ups; titles are re-split when the language changes.
import { gsap, ScrollTrigger, reduceMotion } from './scroll.js';

function splitLines(el) {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts.map(p => `<span class="split-line"><span>${p}</span></span>`).join('');
  return [...el.querySelectorAll('.split-line > span')];
}

const state = new WeakMap(); // el -> { st, done }
function revealTitle(el) {
  const prev = state.get(el);
  prev?.st?.kill();
  const lines = splitLines(el);
  if (reduceMotion || prev?.done) { state.set(el, { done: true }); return; }
  gsap.set(lines, { yPercent: 112 });
  const s = { done: false };
  s.st = ScrollTrigger.create({
    trigger: el, start: 'top 86%', once: true,
    onEnter: () => { s.done = true; gsap.to(el.querySelectorAll('.split-line > span'), { yPercent: 0, duration: 1.25, stagger: .09, ease: 'expo.out' }); },
  });
  state.set(el, s);
}

export function initReveal() {
  document.querySelectorAll('.sec-title, .join .display').forEach(el => {
    revealTitle(el);
    el.addEventListener('kx:retext', () => revealTitle(el));
  });
  if (reduceMotion) return;
  const fades = '.sec-idx, .sec-lede, .feats li, .badge, .minis > div, .board-tools, .rail-foot, .paper-note, .join .kicker, .join .lede, .join .row, .foot-grid > div';
  document.querySelectorAll(fades).forEach(el => {
    gsap.from(el, { y: 26, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  document.querySelectorAll('.boardstage, .paper, .diagram, .deck-wrap').forEach(el => {
    gsap.from(el, { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.from('.wordmark', { yPercent: 40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });
}
