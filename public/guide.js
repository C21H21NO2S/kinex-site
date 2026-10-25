// 使用手册 (guide/): the forgetting curve in each language's copy, and links that keep their place across the language
// switch. legal.js (loaded first) does the switches and the contents. A classic script for the same reason as legal.js.
(function () {
  const root = document.documentElement;
  const isEn = () => root.dataset.lang === 'en';

  // ---------------------------------------------------------------- forgetting curve: the home page's model
  // (src/sections/recall.js). Retention R(t) = (1 + 19/81 · t/S)^-0.5 falls to 90% after S days, when FSRS schedules
  // the review. X: days on a square-root scale; Y: retention 40–100%. Four reviews: Hard, Good, Good, Easy.
  const R = (t, S) => Math.pow(1 + 19 / 81 * t / S, -.5);
  const GROW = { 1: .45, 2: 1.4, 3: 2.6, 4: 3.8 };
  const S0 = 3.2, DMAX = 180, YMIN = .4, GRADES = [2, 3, 3, 4];
  const reviews = [{ d: 0, S: S0 }];
  GRADES.forEach(g => { const last = reviews[reviews.length - 1]; reviews.push({ d: last.d + last.S, S: last.S * GROW[g], g }); });
  const TEXT = {
    zh: { ttl: '记忆保留率', point: '复习时机', next: '下次复习', time: '时间 →', today: '今天', day: d => `第 ${d} 天`,
      g: { 1: '遗忘', 2: '困难', 3: '一般', 4: '容易' }, on: '按时复习', off: '不复习', note: 'FSRS 记忆模型示意 · 每次评分后间隔重新计算' },
    en: { ttl: 'Retention', point: 'Review point', next: 'next review', time: 'time →', today: 'Today', day: d => `Day ${d}`,
      g: { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }, on: 'Reviewed on time', off: 'Never reviewed', note: 'FSRS memory model, illustrative · each grade resets the interval' },
  };

  function draw(fig) {
    const svg = fig.querySelector('svg'), T_ = TEXT[fig.closest('[lang]').lang === 'en' ? 'en' : 'zh'];
    const W = Math.max(300, svg.clientWidth || 700), H = svg.clientHeight || 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const L = 44, RM = 14, T = 40, B = 50, pw = W - L - RM, ph = H - T - B, base = T + ph;
    const x = d => L + Math.sqrt(Math.min(d, DMAX) / DMAX) * pw;
    const y = r => T + (1 - (Math.max(r, YMIN - .2) - YMIN) / (1 - YMIN)) * ph;
    const pts = (d0, d1, S) => { const out = []; for (let k = 0; k <= 48; k++) { const dd = d0 + (d1 - d0) * (k / 48) ** 2; out.push([x(dd), y(R(dd - d0, S))]); } return out; };
    const path = p => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
    const segs = reviews.map((r, i) => pts(r.d, i + 1 < reviews.length ? reviews[i + 1].d : r.d + r.S, r.S));
    const joined = segs.flatMap((s, i) => (i ? [[s[0][0], y(1)], ...s] : s));
    const last = joined[joined.length - 1];
    const area = path(joined) + ` L${last[0].toFixed(1)},${base} L${x(0)},${base} Z`;
    const due = reviews[reviews.length - 1].d + reviews[reviews.length - 1].S;
    const label = d => (d < .5 ? T_.today : T_.day(Math.round(d)));
    const ticks = reviews.map(r => ({ d: r.d, cls: '' })).concat([{ d: due, cls: 'due' }]);
    let lastX = -1e9; const shown = [];
    ticks.forEach(tk => { const px = x(tk.d); if (px - lastX >= 58 || tk.cls === 'due') { if (tk.cls === 'due' && px - lastX < 58) shown.pop(); shown.push(tk); lastX = px; } });
    const yt = [[1, '100%'], [.9, '90%'], [.7, '70%'], [.5, '50%']];
    const clip = 'gdClip' + (fig.closest('[lang]').lang === 'en' ? 'En' : 'Zh');
    svg.innerHTML = `<defs><linearGradient id="gdCurveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cf0"/><stop offset="1" class="cf1"/></linearGradient><clipPath id="${clip}"><rect x="${L}" y="${T - 8}" width="${pw + 4}" height="${ph + 8}"/></clipPath></defs>
      <text class="ct ttl" x="0" y="12">${T_.ttl}</text>
      ${yt.map(([r, s]) => `<line class="${r === .9 ? 'goal' : 'grid'}" x1="${L}" x2="${L + pw}" y1="${y(r)}" y2="${y(r)}"/><text class="ct${r === .9 ? ' acc' : ''}" x="${L - 8}" y="${y(r) + 4}" text-anchor="end">${s}</text>`).join('')}
      <text class="ct acc" x="${L + 8}" y="${y(.9) + 16}">${T_.point}</text>
      <line class="axis" x1="${L}" x2="${L + pw}" y1="${base}" y2="${base}"/>
      <g clip-path="url(#${clip})"><path class="never" d="${path(pts(0, DMAX, S0))}"/>
      <path class="area" d="${area}"/><path class="c" d="${path(joined)}"/></g>
      ${reviews.slice(1).map(r => `<line class="rvl" x1="${x(r.d)}" x2="${x(r.d)}" y1="${y(1)}" y2="${base}"/><circle class="rv" cx="${x(r.d)}" cy="${y(1)}" r="4"/><text class="ct gr" x="${x(r.d)}" y="${y(1) - 10}" text-anchor="middle">${T_.g[r.g]}</text>`).join('')}
      <circle class="rv" cx="${x(0)}" cy="${y(1)}" r="4"/>
      <line class="rvl" x1="${x(due)}" x2="${x(due)}" y1="${y(.9)}" y2="${base}"/>
      <circle class="duering" cx="${x(due)}" cy="${y(.9)}" r="7"/><circle class="duedot" cx="${x(due)}" cy="${y(.9)}" r="3.2"/>
      ${shown.map(tk => `<line class="tick" x1="${x(tk.d)}" x2="${x(tk.d)}" y1="${base}" y2="${base + 5}"/><text class="ct${tk.cls ? ' ' + tk.cls : ''}" x="${x(tk.d)}" y="${base + 20}" text-anchor="middle">${label(tk.d)}</text>`).join('')}
      <text class="ct sub" x="${x(due)}" y="${base + 36}" text-anchor="middle">${T_.next}</text>
      <text class="ct" x="${L + pw}" y="${base - 8}" text-anchor="end">${T_.time}</text>`;
    if (!fig.querySelector('.lgd')) fig.insertAdjacentHTML('beforeend', `<figcaption class="lgd"><span class="lg on"><i></i>${T_.on}</span><span class="lg off"><i></i>${T_.off}</span><span class="lg-note">${T_.note}</span></figcaption>`);
  }
  // only the copy on screen has a size; the other is drawn when the language switches to it
  const drawShown = () => document.querySelectorAll('.curve').forEach(fig => { if (fig.offsetParent) draw(fig); });
  drawShown();
  let w = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - w) > 2) { w = innerWidth; drawShown(); } });

  // ---------------------------------------------------------------- the same place in the other language
  // Chinese ids are plain (#sync), English ones carry "en-" (#en-sync). On a switch, the chapter in view comes along.
  const idFor = id => (isEn() ? (id.startsWith('en-') ? id : 'en-' + id) : id.replace(/^en-/, ''));
  function follow() {
    if (location.hash) {
      const want = idFor(decodeURIComponent(location.hash.slice(1)));
      const el = document.getElementById(want);
      if (el) { history.replaceState(null, '', '#' + want); el.scrollIntoView(); }
    }
  }
  if (location.hash) requestAnimationFrame(follow);
  // capture phase: runs before legal.js switches the language, while the current copy is still laid out
  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-set-lang]');
    if (!pick || (pick.dataset.setLang === 'en') === isEn()) return;
    const was = [...document.querySelectorAll('.lg-doc')].find(doc => doc.lang === (isEn() ? 'en' : 'zh-CN'));
    const inView = was && [...was.querySelectorAll('.lg-body section[id]')].filter(s => s.getBoundingClientRect().top < innerHeight * .4).pop();
    requestAnimationFrame(() => {
      drawShown();
      if (inView) { const target = document.getElementById(idFor(inView.id)); if (target) { history.replaceState(null, '', '#' + target.id); target.scrollIntoView(); } }
      else if (location.hash) follow();
    });
  }, true);
})();
