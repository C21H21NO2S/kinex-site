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
    if (url) { e.preventDefault(); window.open(url, '_blank', 'noopener'); return; }
    // no URL yet: CTAs outside the join section just scroll there; everything else explains
    if (kind === 'beta' && el.getAttribute('href') === '#join' && !el.closest('#join')) return;
    e.preventDefault();
    toast(kind === 'film' ? t('modal.film') : kind === 'beta' ? t('modal.beta') : '—');
  });
  // hide links that have nowhere to go yet
  document.querySelectorAll('[data-link="github"], [data-link="privacy"]').forEach(a => { if (!LINKS[a.dataset.link]) a.style.display = 'none'; else a.href = LINKS[a.dataset.link]; });
}

export function initCursor() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const c = document.getElementById('cursor');
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
