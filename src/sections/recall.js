// 04 Recall — a flashcard deck with grading, and an illustrative forgetting curve that flattens with each review.
import { gsap, reduceMotion } from '../core/scroll.js';
import { t } from '../core/prefs.js';

const N = 3;

export function initRecall() {
  const deck = document.getElementById('deck'), rate = document.getElementById('rate');
  const show = document.getElementById('showBtn'), grades = rate.querySelector('.grades'), count = document.getElementById('deckCount');
  const svg = document.getElementById('curve');
  // the day's queue: grading Good/Hard/Easy files a card away; Again flips it back and tucks it under the deck to
  // come round again. Cards are persistent elements, so the stack can move up smoothly instead of being rebuilt.
  let queue = [...Array(N).keys()], done = 0, flipped = false, busy = false, cards = [];
  const again = new Set();

  function cardHTML(i) {
    return `<div class="fcard" data-i="${i}"><div class="fc-in">
      <div class="face front"><div class="k"><span>${t('recall.idx')} · ${t('board.c5')}</span><span class="tag-again">${t('recall.soon')}</span></div><p class="q">${t('recall.q' + (i + 1))}</p></div>
      <div class="face back"><div class="k"><span>${t('recall.qk')}</span><span>${i + 1} / ${N}</span></div><p class="bq">${t('recall.q' + (i + 1))}</p><span class="ak">${t('recall.ak')}</span><p class="a">${t('recall.a' + (i + 1))}</p><span class="src">↩ ${t('recall.s' + (i + 1))}</span></div>
    </div></div>`;
  }
  // a card's place in the stack: 0 on top, 1–2 peeking out underneath, deeper ones hidden
  const SLOT = [{ y: 0, scale: 1, opacity: 1 }, { y: 16, scale: .955, opacity: .62 }, { y: 32, scale: .91, opacity: .3 }, { y: 40, scale: .88, opacity: 0 }];
  function layout(animate, skip) {
    queue.forEach((i, k) => {
      const el = cards[i], s = SLOT[Math.min(k, 3)];
      el.style.zIndex = 10 - k; el.classList.toggle('again', again.has(i));
      if (el === skip) return;
      if (animate && !reduceMotion) gsap.to(el, { ...s, x: 0, rotation: 0, duration: .7, delay: k * .05, ease: 'expo.out' });
      else gsap.set(el, { ...s, x: 0, rotation: 0 });
    });
  }
  function build() {
    deck.innerHTML = [...Array(N).keys()].map(cardHTML).join('');
    cards = [...deck.querySelectorAll('.fcard')];
    cards.forEach((el, i) => { if (!queue.includes(i)) el.style.display = 'none'; });
    layout(false);
    status();
  }
  function status() {
    if (!queue.length) {
      deck.insertAdjacentHTML('beforeend', `<div class="fcard fdone"><div class="fc-in"><div class="face front done"><div class="k"><span>${t('recall.idx')}</span><span>✓</span></div><p class="q">${t('recall.done')}</p></div></div></div>`);
      if (!reduceMotion) gsap.from(deck.querySelector('.fdone'), { y: 18, scale: .96, opacity: 0, duration: .7, ease: 'expo.out' });
      show.textContent = t('recall.again2'); show.hidden = false; grades.hidden = true; count.textContent = `${N} / ${N}`;
      return;
    }
    show.textContent = t('recall.show'); show.hidden = flipped; grades.hidden = !flipped;
    count.textContent = `${Math.min(done + 1, N)} / ${N}`;
  }
  const top = () => cards[queue[0]];

  // ---------------------------------------------------------------- forgetting curve (FSRS model)
  // Retention R(t) = (1 + 19/81 · t/S)^-0.5, so R falls to exactly 90% after S days — FSRS schedules the review then.
  // X: days on a square-root scale (short early intervals stay readable); Y: retention 40–100%.
  const R = (t, S) => Math.pow(1 + 19 / 81 * t / S, -.5);
  const GROW = { 1: .45, 2: 1.4, 3: 2.6, 4: 3.8 };
  const S0 = 3.2, DMAX = 180, YMIN = .4;
  let reviews = [{ d: 0, S: S0 }];
  const dueOf = r => r.d + r.S; // R hits 90% after S days
  const ZH = () => document.documentElement.dataset.lang !== 'en';
  const dayLabel = d => d < .5 ? (ZH() ? '今天' : 'Today') : (ZH() ? `第 ${Math.round(d)} 天` : `Day ${Math.round(d)}`);

  function drawCurve(animateNew) {
    const W = Math.max(320, svg.clientWidth || 560), H = 252;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const L = 44, RM = 18, T = 40, B = 50, pw = W - L - RM, ph = H - T - B, base = T + ph;
    const x = d => L + Math.sqrt(Math.min(d, DMAX) / DMAX) * pw;
    const y = r => T + (1 - (Math.max(r, YMIN - .2) - YMIN) / (1 - YMIN)) * ph;
    const curvePts = (d0, d1, S) => { const out = []; const n = 48; for (let k = 0; k <= n; k++) { const dd = d0 + (d1 - d0) * (k / n) ** 2; out.push([x(dd), y(R(dd - d0, S))]); } return out; };
    const toPath = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    // with reviews: each segment decays to 90%, then the review lifts it back to 100%
    const segs = reviews.map((r, i) => curvePts(r.d, i + 1 < reviews.length ? reviews[i + 1].d : dueOf(r), r.S));
    const joined = segs.flatMap((s, i) => i ? [[s[0][0], y(1)], ...s] : s);
    const lastStart = segs.length > 1 ? joined.length - segs.at(-1).length - 1 : 0;
    const oldPath = segs.length > 1 ? toPath(joined.slice(0, lastStart + 1)) : '';
    const newPath = toPath(joined.slice(lastStart));
    const area = toPath(joined) + ` L${joined.at(-1)[0].toFixed(1)},${base} L${x(0)},${base} Z`;
    // without reviews: the same first memory, left alone
    const never = toPath(curvePts(0, DMAX, S0));

    const due = dueOf(reviews.at(-1));
    const yt = [[1, '100%'], [.9, '90%'], [.7, '70%'], [.5, '50%']];
    // x labels: every review day + the next due day, skipping any that would collide
    const ticks = reviews.map((r, i) => ({ d: r.d, label: dayLabel(r.d), grade: r.g, cls: '' })).concat([{ d: due, label: dayLabel(due), cls: 'due' }]);
    let lastX = -1e9; const shown = [];
    ticks.forEach((tk, i) => { const px = x(tk.d); if (px - lastX >= 58 || tk.cls === 'due') { if (tk.cls === 'due' && px - lastX < 58) shown.pop(); shown.push(tk); lastX = px; } });
    const G = { 1: ZH() ? '重来' : 'Again', 2: ZH() ? '困难' : 'Hard', 3: ZH() ? '良好' : 'Good', 4: ZH() ? '简单' : 'Easy' };

    svg.innerHTML = `<defs><linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cf0"/><stop offset="1" class="cf1"/></linearGradient>
        <clipPath id="plotClip"><rect x="${L}" y="${T - 8}" width="${pw + 4}" height="${ph + 8}"/></clipPath></defs>
      <text class="ct ttl" x="0" y="12">${ZH() ? '记忆保留率' : 'Retention'}</text>
      ${yt.map(([r, s]) => `<line class="${r === .9 ? 'goal' : 'grid'}" x1="${L}" x2="${L + pw}" y1="${y(r)}" y2="${y(r)}"/><text class="ct ${r === .9 ? 'acc' : ''}" x="${L - 8}" y="${y(r) + 4}" text-anchor="end">${s}</text>`).join('')}
      <text class="ct acc" x="${L + pw}" y="${y(.9) - 7}" text-anchor="end">${ZH() ? '复习时机' : 'Review point'}</text>
      <line class="axis" x1="${L}" x2="${L + pw}" y1="${base}" y2="${base}"/>
      <g clip-path="url(#plotClip)">
        <path class="never" d="${never}"/>
        <path class="area" d="${area}"/>
        ${oldPath ? `<path class="c" d="${oldPath}"/>` : ''}<path class="c cnew" d="${newPath}"/>
      </g>
      ${reviews.slice(1).map(r => `<line class="rvl" x1="${x(r.d)}" x2="${x(r.d)}" y1="${y(1)}" y2="${base}"/><circle class="rv" cx="${x(r.d)}" cy="${y(1)}" r="4"/><text class="ct gr" x="${x(r.d)}" y="${y(1) - 10}" text-anchor="middle">${G[r.g]}</text>`).join('')}
      <circle class="rv first" cx="${x(0)}" cy="${y(1)}" r="4"/>
      <line class="rvl due" x1="${x(due)}" x2="${x(due)}" y1="${y(.9)}" y2="${base}"/>
      <circle class="duering" cx="${x(due)}" cy="${y(.9)}" r="7"/><circle class="duedot" cx="${x(due)}" cy="${y(.9)}" r="3.2"/>
      ${shown.map(tk => `<line class="tick" x1="${x(tk.d)}" x2="${x(tk.d)}" y1="${base}" y2="${base + 5}"/><text class="ct ${tk.cls}" x="${x(tk.d)}" y="${base + 20}" text-anchor="middle">${tk.label}</text>`).join('')}
      <text class="ct sub" x="${x(due)}" y="${base + 36}" text-anchor="middle">${ZH() ? '下次复习' : 'next review'}</text>
      <text class="ct" x="${L + pw}" y="${base - 8}" text-anchor="end">${ZH() ? '时间 →' : 'time →'}</text>`;
    if (!reduceMotion) {
      const c = svg.querySelector('.cnew'), len = c.getTotalLength();
      gsap.fromTo(c, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: animateNew ? 1 : 1.6, ease: 'power2.out' });
      gsap.fromTo(svg.querySelectorAll('.duering, .duedot, .due, .sub'), { opacity: 0 }, { opacity: 1, duration: .5, delay: animateNew ? .8 : 1.3 });
    }
  }


  show.addEventListener('click', () => {
    if (!queue.length) { queue = [...Array(N).keys()]; done = 0; again.clear(); reviews = [{ d: 0, S: S0 }]; drawCurve(false); build(); return; }
    if (busy) return;
    top().classList.add('flip'); flipped = true; status();
  });
  grades.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b || !flipped || busy) return;
    const g = +b.dataset.g, i = queue[0], el = cards[i];
    // a remembered card is a review on its due day (retention 90%), and the grade sets how much longer the memory
    // now lasts. Again is not a review: the card goes back into today's queue and only its final grade counts.
    if (g > 1) {
      const last = reviews.at(-1);
      reviews.push({ d: dueOf(last), S: last.S * GROW[g], g });
      drawCurve(true);
    }
    flipped = false; busy = true; grades.hidden = true;
    const finish = () => { busy = false; status(); };
    if (g === 1) {
      // Again: the card is drawn out to the side, turning back to its question, and tucked under the deck to come
      // round later today; the cards above it move up as it goes
      again.add(i); queue.push(queue.shift());
      el.classList.remove('flip');
      if (reduceMotion) { layout(false); finish(); return; }
      const end = SLOT[Math.min(queue.length - 1, 3)], out = -Math.min(300, deck.clientWidth * .46);
      gsap.timeline({ onComplete: finish })
        .to(el, { x: out, y: -12, rotation: -6, duration: .5, ease: 'power3.out' })
        .add(() => layout(true, el))
        .to(el, { x: 0, y: end.y, scale: end.scale, opacity: end.opacity, rotation: 0, duration: .75, ease: 'power3.inOut' }, '-=.05');
      return;
    }
    // remembered: the card is filed away to the side, and the stack moves up
    queue.shift(); done++; again.delete(i);
    if (reduceMotion) { el.style.display = 'none'; layout(false); finish(); return; }
    gsap.timeline({ onComplete: finish })
      .to(el, { x: 380, y: -24, rotation: 7, opacity: 0, duration: .55, ease: 'power2.in' })
      .add(() => { el.style.display = 'none'; layout(true); }, .18)
      .to({}, { duration: .45 });
  });

  build(); drawCurve(false);
  let rw = svg.clientWidth; addEventListener('resize', () => { if (Math.abs(svg.clientWidth - rw) > 2) { rw = svg.clientWidth; drawCurve(false); } });
  addEventListener('kx:lang', () => { const f = flipped; build(); drawCurve(false); if (f && queue.length) { top().classList.add('flip'); flipped = true; status(); } });
}
