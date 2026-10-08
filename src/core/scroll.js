// Smooth scroll (Lenis) wired into GSAP ScrollTrigger, anchor links, nav behaviour and the mobile menu.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export let lenis = null;

// Long jumps (back to top, nav links far away) fade the page out, land instantly and fade back in, instead of
// scrolling through every pinned section and replaying the 3D story backwards. Short hops still scroll smoothly.
let jumping = false;
export function jumpTo(target) {
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
  const dist = Math.abs(y - scrollY);
  if (reduceMotion || dist < innerHeight * 2.2) {
    lenis.scrollTo(y, { duration: Math.min(1.3, .7 + dist / innerHeight * .25), easing: t => 1 - Math.pow(1 - t, 4) });
    return;
  }
  if (jumping) return;
  jumping = true;
  const veil = document.getElementById('veil');
  const nav = document.getElementById('nav');
  gsap.timeline({ onComplete: () => { jumping = false; } })
    .set(veil, { display: 'block' })
    .fromTo(veil, { opacity: 0 }, { opacity: 1, duration: .32, ease: 'power2.in' })
    .add(() => {
      lenis.scrollTo(y, { immediate: true, force: true });
      ScrollTrigger.update();
      window.dispatchEvent(new CustomEvent('kx:jumped', { detail: { y } }));
      nav.classList.remove('hide');
    })
    .to(veil, { opacity: 0, duration: .6, ease: 'power2.out', delay: .12 })
    .set(veil, { display: 'none' });
}

export function initScroll() {
  lenis = new Lenis({ lerp: reduceMotion ? 1 : .095, smoothWheel: !reduceMotion, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add('lenis');
  window.__lenis = lenis;

  const nav = document.getElementById('nav');
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menuBtn');
  const setMenu = open => {
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { menu.hidden = false; lenis.stop(); gsap.fromTo(menu.querySelectorAll('nav a, .pill'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .05, ease: 'expo.out' }); gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' }); }
    else { lenis.start(); gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: .55, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } }); }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target == null) return;
    e.preventDefault();
    if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
    jumpTo(target);
  });

  // nav: solid after the hero, hides while scrolling down past the story, returns when scrolling up
  let last = 0;
  lenis.on('scroll', ({ scroll, direction }) => {
    nav.classList.toggle('solid', scroll > innerHeight * .6);
    const story = document.getElementById('story');
    const pastStory = story ? scroll > story.offsetTop + story.offsetHeight - innerHeight : scroll > innerHeight;
    nav.classList.toggle('hide', pastStory && direction > 0 && scroll - last > 0 && menuBtn.getAttribute('aria-expanded') !== 'true');
    last = scroll;
  });

  // active section in the nav
  document.querySelectorAll('.links a').forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: self => a.classList.toggle('on', self.isActive) });
  });
}
