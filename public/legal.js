// The terms and privacy pages (A644): language and theme switches with the home page's stored choice ('kx-prefs'),
// and the contents following the reading. Both languages' text is in the page itself. A classic script in public/,
// not a Vite module: a module entry here, or a module shared with the home page, makes Vite split the home page's
// boot script (and its modulepreload polyfill) into shared chunks.
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => (root.dataset.lang === 'en' ? 'en' : 'zh');
  const save = () => { try { localStorage.setItem('kx-prefs', JSON.stringify({ theme: root.dataset.theme, lang: root.dataset.lang })); } catch (e) { /* private mode */ } };

  function applyLang() {
    const en = lang() === 'en';
    root.lang = en ? 'en' : 'zh-CN';
    document.title = root.dataset[en ? 'titleEn' : 'titleZh'];
    document.querySelector('meta[name="description"]')?.setAttribute('content', root.dataset[en ? 'descEn' : 'descZh']);
    document.querySelectorAll('[data-zh]').forEach(el => { el.textContent = el.dataset[en ? 'en' : 'zh']; });
    document.querySelectorAll('[data-aria-zh]').forEach(el => { el.setAttribute('aria-label', el.dataset[en ? 'ariaEn' : 'ariaZh']); });
    document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang())));
  }

  // as on the home page: the new theme opens in a circle from the button
  function setTheme(next, x, y) {
    const apply = () => { root.dataset.theme = next; save(); };
    if (!document.startViewTransition || reduce) { apply(); return; }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  }

  document.addEventListener('click', e => {
    const theme = e.target.closest('[data-toggle-theme]');
    if (theme) { const r = theme.getBoundingClientRect(); setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', r.left + r.width / 2, r.top + r.height / 2); }
    const pick = e.target.closest('[data-set-lang]');
    if (pick && pick.dataset.setLang !== lang()) { root.dataset.lang = pick.dataset.setLang; applyLang(); save(); }
  });
  applyLang();

  // the contents follow the reading: the section in view is marked
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const doc = entry.target.closest('.lg-doc');
        doc.querySelectorAll('.toc a.on').forEach(a => a.classList.remove('on'));
        doc.querySelector(`.toc a[href="#${entry.target.id}"]`)?.classList.add('on');
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.lg-body section[id]').forEach(section => seen.observe(section));
  }
})();
