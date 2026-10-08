// Theme + language: state, persistence, DOM text, and the circular theme reveal.
import { DICT } from '../i18n.js';

const root = document.documentElement;
const save = () => { try { localStorage.setItem('kx-prefs', JSON.stringify({ theme: root.dataset.theme, lang: root.dataset.lang })); } catch (e) { /* private mode */ } };

export const getLang = () => (root.dataset.lang === 'en' ? 'en' : 'zh');
export const isDark = () => root.dataset.theme !== 'light';
export const t = key => DICT[getLang()][key] ?? DICT.zh[key] ?? key;

export function applyText(scope = document) {
  const L = getLang();
  scope.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); el.dispatchEvent(new CustomEvent('kx:retext', { bubbles: false })); });
  scope.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  if (scope === document) {
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.desc'));
    root.lang = L === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === L)));
  }
}

export function setLang(lang) {
  if (lang === getLang()) return;
  root.dataset.lang = lang;
  applyText();
  save();
  window.dispatchEvent(new CustomEvent('kx:lang', { detail: lang }));
}

export function setTheme(next, origin) {
  const apply = () => {
    root.dataset.theme = next;
    save();
    window.dispatchEvent(new CustomEvent('kx:theme', { detail: next }));
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) { apply(); return; }
  const x = origin ? origin.x : innerWidth - 60, y = origin ? origin.y : 40;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => {
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}

export function bindToggles() {
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-toggle-theme]');
    if (tb) { const r = tb.getBoundingClientRect(); setTheme(isDark() ? 'light' : 'dark', { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
    const lb = e.target.closest('[data-set-lang]');
    if (lb) setLang(lb.dataset.setLang);
  });
}
