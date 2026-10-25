// Small UI pieces: outbound links (or a "coming soon" toast), the custom cursor and magnetic buttons.
import { LINKS } from '../config.js';
import { t } from './prefs.js';
import { gsap, reduceMotion } from './scroll.js';

let toastTimer = 0;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

export function initLinks() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-link]');
    if (!el) return;
    const kind = el.dataset.link, url = LINKS[kind];
    // a page of this site (加入内测 → download/) opens here; other sites in a new tab
    if (url && !/^https?:/.test(url)) { e.preventDefault(); location.href = url; return; }
    if (url) { e.preventDefault(); window.open(url, '_blank', 'noopener'); return; }
    // no URL yet: CTAs outside the join section just scroll there; everything else explains
    if (kind === 'beta' && el.getAttribute('href') === '#join' && !el.closest('#join')) return;
    e.preventDefault();
    toast(kind === 'film' ? t('modal.film') : kind === 'beta' ? t('modal.beta') : '—');
  });
  // the buttons point where they go (open in a new tab, copy the link)
  if (LINKS.beta) document.querySelectorAll('[data-link="beta"]').forEach(a => { if (a.tagName === 'A') a.href = LINKS.beta; });
  // hide links that have nowhere to go yet
  document.querySelectorAll('[data-link="github"]').forEach(a => { if (!LINKS[a.dataset.link]) a.style.display = 'none'; else a.href = LINKS[a.dataset.link]; });
}

// The stars that drift round a sparkle button on hover (styles/spark.css): a layer behind the button, filled with small
// sparkles at random places, each circling its own far-off centre at its own pace. Only where there is a mouse.
const STAR = '<svg viewBox="0 0 15 15" aria-hidden="true"><path d="M6.937 3.846 7.75 1l.813 2.846a4 4 0 0 0 3.09 3.09L14.5 7.75l-2.846.813a4 4 0 0 0-3.09 3.09L7.75 14.5l-.813-2.846a4 4 0 0 0-3.09-3.09L1 7.75l2.846-.813a4 4 0 0 0 3.09-3.09Z"/></svg>';
function sparkStars() {
  const R = (a, b) => a + Math.random() * (b - a), far = () => (Math.random() < .5 ? -1 : 1) * Math.round(R(300, 800)) + '%';
  document.querySelectorAll('.spark[data-stars]').forEach(btn => {
    const wrap = document.createElement('span'); wrap.className = 'spark-wrap';
    btn.replaceWith(wrap);
    const pen = document.createElement('span'); pen.className = 'sp-pen'; pen.setAttribute('aria-hidden', 'true');
    pen.innerHTML = STAR.repeat(14);
    [...pen.children].forEach(s => s.setAttribute('style', `--x:${R(20, 80).toFixed(0)};--y:${R(20, 80).toFixed(0)};--dur:${R(6, 20).toFixed(1)};--delay:${R(1, 10).toFixed(1)};--alpha:${R(.4, .9).toFixed(2)};--ox:${far()};--oy:${far()};--size:${R(.4, .85).toFixed(2)}`));
    wrap.append(pen, btn);
  });
}

export function initCursor() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const c = document.getElementById('cursor');
  if (fine && !reduceMotion) sparkStars();
  if (!fine || reduceMotion) { c.remove(); return; }
  let x = -100, y = -100, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.add('live'); }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('live'));
  document.addEventListener('pointerover', e => { c.classList.toggle('hover', !!e.target.closest('a, button, .bcard, [data-cursor="hover"]')); });
  gsap.ticker.add(() => { cx += (x - cx) * .22; cy += (y - cy) * .22; c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; });

  document.querySelectorAll('.magnetic').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .28); yTo((e.clientY - r.top - r.height / 2) * .38); });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}
