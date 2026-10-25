// 05 Sync — a laptop and a tablet showing the same KineX board. A note added on the laptop appears on the tablet;
// a stroke written on the tablet appears on the laptop. Both screens share one board coordinate space, so a change
// lands in exactly the same place on each device.
import { t, getLang } from '../core/prefs.js';
import { reduceMotion, ScrollTrigger, gsap } from '../core/scroll.js';
import { drawScreen } from '../hero/textures.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const ICON = {
  wifi: '<svg viewBox="0 0 20 20"><path class="w3" d="M3 8a10 10 0 0 1 14 0"/><path class="w2" d="M5.5 10.6a6.5 6.5 0 0 1 9 0"/><path class="w1" d="M8 13.2a3 3 0 0 1 4 0"/><circle cx="10" cy="15.6" r="1.1"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.2 4.5 4.5 0 0 0 7 18Z"/></svg>',
  lock: '<svg viewBox="0 0 20 20"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/></svg>',
};
// the screen is drawn in a 1600×1000 design space; the tablet shows the board pane (x ≥ 752, y ≥ 52)
const LAPTOP_VB = '0 0 1600 1000', TABLET_VB = '752 52 848 948';
// what gets added: a note card under the excerpt (laptop), and a hand-drawn arrow to the lecture (tablet)
const NOTE = { x: 796, y: 590, w: 300, h: 96 };

function layer(vb) {
  return `<svg class="sy-layer" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true">
    <defs><filter id="syShadow${vb.length}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="#000" flood-opacity=".12"/></filter></defs>
    <g class="sy-add sy-note-g">
      <path class="sy-link" d="M900 430 C 900 500, 930 520, 930 ${NOTE.y}" pathLength="1"/>
      <circle class="sy-dot" cx="900" cy="430" r="5"/><circle class="sy-dot" cx="930" cy="${NOTE.y}" r="5"/>
      <g class="sy-card" filter="url(#syShadow${vb.length})"><rect x="${NOTE.x}" y="${NOTE.y}" width="${NOTE.w}" height="${NOTE.h}" rx="10"/></g>
      <rect class="sy-card-line" x="${NOTE.x + .5}" y="${NOTE.y + .5}" width="${NOTE.w - 1}" height="${NOTE.h - 1}" rx="10"/>
      <rect class="sy-hl" x="${NOTE.x - 4}" y="${NOTE.y - 4}" width="${NOTE.w + 8}" height="${NOTE.h + 8}" rx="13"/>
      <text class="sy-k" x="${NOTE.x + 20}" y="${NOTE.y + 30}"></text>
      <text class="sy-t" x="${NOTE.x + 20}" y="${NOTE.y + 64}"></text>
    </g>
    <g class="sy-add sy-ink-g">
      <path class="sy-ink" d="M1104 662 C 1126 666, 1144 682, 1168 694" pathLength="1"/>
      <path class="sy-ink" d="M1149 678 L 1168 695 L 1146 704" pathLength="1"/>
      <path class="sy-ink-hl" d="M1104 662 C 1126 666, 1144 682, 1168 694 M1149 678 L 1168 695 L 1146 704"/>
    </g>
  </svg>`;
}

// the sync packet: a lead pearl and a fading tail; each one leaves a little later than the one before,
// with the gaps widening down the tail, so the train stretches mid-flight and gathers again on arrival
const TRAIN = [[3.6, 1, 0], [2.8, .82, .055], [2.3, .64, .12], [1.9, .48, .195], [1.5, .34, .28]]; // radius, opacity, lag (s)

export function initSync() {
  const host = document.getElementById('diagram');
  host.innerHTML = `
    <svg class="sy-lines" aria-hidden="true"><path class="sy-cloudline"/><path class="sy-cloudline"/><path class="sy-wire"/>${'<circle class="sy-end" r="2.4"/>'.repeat(6)}<circle class="sy-ripple" r="3"/>${TRAIN.map(([r], i) => `<circle class="sy-packet${i ? ' tail' : ''}" r="${r}"/>`).join('')}</svg>
    <div class="sy-dev sy-laptop">
      <div class="sy-meta"><b data-k="laptop"></b><span class="sy-os">Windows</span><span class="sy-chip" data-chip="laptop"><i></i><span></span></span></div>
      <div class="sy-lid"><div class="sy-glass"><div class="sy-screen"><canvas class="sy-scr"></canvas>${layer(LAPTOP_VB)}</div><i class="sy-cam"></i></div></div>
      <div class="sy-deck"></div>
    </div>
    <div class="sy-dev sy-tablet">
      <div class="sy-meta"><b data-k="tablet"></b><span class="sy-os">Android</span><span class="sy-chip" data-chip="tablet"><i></i><span></span></span></div>
      <div class="sy-tab"><div class="sy-glass"><div class="sy-screen"><canvas class="sy-scr"></canvas>${layer(TABLET_VB)}</div><i class="sy-cam"></i></div></div>
    </div>
    <div class="sy-pill"><span class="sy-ico">${ICON.wifi}</span><span data-k="lan"></span></div>
    <div class="sy-cloud">
      <span class="sy-cloud-ico">${ICON.cloud}</span>
      <div><b data-k="cloud"></b><span data-k="cloudsub"></span></div>
      <em class="soon" data-k="testing"></em>
    </div>
    <div class="sy-note"><span class="sy-ico">${ICON.lock}</span><span data-k="local"></span></div>`;

  const $ = s => host.querySelector(s), $$ = s => [...host.querySelectorAll(s)];
  const laptopScr = $('.sy-laptop canvas'), tabletScr = $('.sy-tablet canvas');
  const svg = $('.sy-lines'), wire = $('.sy-wire'), packets = $$('.sy-packet'), ripple = $('.sy-ripple'), cloudLines = $$('.sy-cloudline'), ends = $$('.sy-end'), pill = $('.sy-pill');
  const [L, Tb] = [$('.sy-laptop .sy-layer'), $('.sy-tablet .sy-layer')];
  const chips = { laptop: $('[data-chip="laptop"]'), tablet: $('[data-chip="tablet"]') };
  const STATE = { saved: ['本机已保存', 'Saved'], editing: ['正在编辑…', 'Editing…'], writing: ['正在书写…', 'Writing…'], syncing: ['同步中…', 'Syncing…'], synced: ['已同步 · 刚刚', 'Synced · just now'] };
  const chipState = { laptop: 'saved', tablet: 'synced' };
  const setChip = (k, s) => { chipState[k] = s; const c = chips[k]; c.dataset.state = s; c.lastElementChild.textContent = T(...STATE[s]); };

  function text() {
    const M = { laptop: T('电脑', 'Laptop'), tablet: T('平板', 'Tablet'), lan: T('局域网同步', 'Local network sync'),
      cloud: T('你自己的云', 'Your own cloud'), cloudsub: 'S3 · WebDAV', testing: t('sync.testing'), local: T('数据存在你的设备上，离线也能用', 'Stored on your devices · works offline') };
    $$('[data-k]').forEach(el => { el.textContent = M[el.dataset.k]; });
    $$('.sy-k').forEach(el => { el.textContent = T('笔记', 'NOTE'); });
    Object.keys(chips).forEach(k => setChip(k, chipState[k]));
  }
  const noteText = () => T('红巨星：体积可达太阳的几百倍', 'Red giants dwarf the Sun');

  let painted = '';
  function paint() {
    if (painted === getLang()) return;
    const W = 1600, H = 1000, src = document.createElement('canvas'); src.width = W; src.height = H;
    drawScreen(src.getContext('2d'), W, H, getLang());
    laptopScr.width = W; laptopScr.height = H; laptopScr.getContext('2d').drawImage(src, 0, 0);
    tabletScr.width = 848; tabletScr.height = 948; tabletScr.getContext('2d').drawImage(src, 752, 52, 848, 948, 0, 0, 848, 948);
    painted = getLang();
  }

  // a hairline between the two screens; the sync packet runs along it
  function measure() {
    const hr = host.getBoundingClientRect(), lr = laptopScr.getBoundingClientRect(), tr = tabletScr.getBoundingClientRect(), cr = $('.sy-cloud').getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${hr.width} ${hr.height}`);
    const narrow = hr.width < 760;
    const lid = $('.sy-lid').getBoundingClientRect(), tab = $('.sy-tab').getBoundingClientRect();
    pill.classList.toggle('compact', narrow);
    let a, b, c;
    if (!narrow) {
      // desktop: an arc over the gap; its control point sits so the apex lands centred between the two bodies
      a = [lr.right - hr.left, lr.top - hr.top + lr.height * .52]; b = [tr.left - hr.left, tr.top - hr.top + tr.height * .5];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bow = Math.max(64, len * .46);
      const gap = (lid.right + tab.left) / 2 - hr.left;
      c = [2 * gap - mid[0], mid[1] - bow];
    } else {
      // phones: the tablet sits below the laptop; the link leaves the laptop's base on the left and turns into the
      // tablet's side, clear of the tablet's status line
      a = [tab.left - hr.left - 24, lid.bottom - hr.top + 12]; b = [tab.left - hr.left - 2, tab.top - hr.top + tab.height * .35];
      c = [a[0], b[1]];
    }
    wire.setAttribute('d', `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`);
    // the pill rides on the arc's apex (on phones, on the straight drop between the two devices)
    const at = t => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
    const apex = at(narrow ? .26 : .5);
    // the pill rides just above the apex (on phones, an icon on it), so the packets stay visible
    if (narrow) { // in the clear gap between the laptop's base and the tablet's status line
      const meta = $('.sy-tablet .sy-meta').getBoundingClientRect();
      pill.style.left = a[0] + 'px'; pill.style.top = (lid.bottom + meta.top) / 2 - hr.top + 'px';
    } else { pill.style.left = apex[0] + 'px'; pill.style.top = apex[1] - pill.offsetHeight / 2 - 10 + 'px'; }
    // the cloud links to both devices: out of the laptop's side and the tablet's side, arriving square on the card
    const H = r => ({ l: r.left - hr.left, r: r.right - hr.left, t: r.top - hr.top, b: r.bottom - hr.top, cx: r.left - hr.left + r.width / 2, cy: r.top - hr.top + r.height / 2, h: r.height });
    const L2 = H(lid), T2 = H(tab), C2 = H(cr), pts = [a, b];
    if (!narrow) {
      const p0 = [L2.r, L2.t + Math.min(36, L2.h * .1)], p1 = [C2.l, C2.cy], d = (p1[0] - p0[0]) * .45;
      cloudLines[0].setAttribute('d', `M${p0} C${p0[0] + d},${p0[1]} ${p1[0] - d},${p1[1]} ${p1}`);
      const q0 = [T2.r, T2.t + T2.h * .22], q1 = [Math.max(C2.cx, T2.r + 40), C2.b];
      cloudLines[1].setAttribute('d', `M${q0} Q${q1[0]},${q0[1]} ${q1}`);
      pts.push(p0, p1, q0, q1);
    } else { // phones: the cloud sits above the laptop
      const x = Math.min(C2.r - 24, L2.r - 24), p0 = [x, C2.b], p1 = [x, L2.t];   // down the right side, clear of the laptop's label
      cloudLines[0].setAttribute('d', `M${p0} L${p1}`);
      cloudLines[1].setAttribute('d', '');
      pts.push(p0, p1);
    }
    ends.forEach((e, i) => { const q = pts[i]; e.style.display = q ? '' : 'none'; if (q) { e.setAttribute('cx', q[0]); e.setAttribute('cy', q[1]); } });
  }

  // ---------------------------------------------------------------- the loop
  const typeInto = (els, str, dur) => { const o = { n: 0 }; return gsap.to(o, { n: str.length, duration: dur, ease: 'none', onUpdate: () => els.forEach(e => { e.textContent = str.slice(0, Math.round(o.n)); }) }); };
  function sendPacket(fromLaptop) {
    const len = wire.getTotalLength(), at = u => wire.getPointAtLength((fromLaptop ? u : 1 - u) * len);
    const tl = gsap.timeline(), DUR = .74;
    packets.forEach((el, i) => {
      const [, op, lag] = TRAIN[i], P = { u: 0 };
      const place = () => { const pt = at(P.u); el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y); };
      place();
      tl.fromTo(el, { opacity: 0 }, { opacity: op, duration: .14, ease: 'none' }, lag)
        .to(P, { u: 1, duration: DUR, ease: 'power3.inOut', onUpdate: place }, lag)
        .to(el, { opacity: 0, duration: .16, ease: 'power1.in' }, lag + DUR - .12);
    });
    // a soft ring where the lead lands
    const end = at(1);
    tl.fromTo(ripple, { attr: { cx: end.x, cy: end.y, r: 3 }, opacity: .9 }, { attr: { r: 20 }, opacity: 0, duration: .8, ease: 'power2.out', immediateRender: false }, DUR - .06);
    return tl;
  }
  function reset() {
    $$('.sy-note-g, .sy-ink-g').forEach(g => gsap.set(g, { opacity: 0 }));
    $$('.sy-link, .sy-ink').forEach(p => gsap.set(p, { strokeDasharray: 1, strokeDashoffset: 1 }));
    $$('.sy-hl, .sy-ink-hl').forEach(h => gsap.set(h, { opacity: 0 }));
    $$('.sy-t').forEach(e => { e.textContent = ''; });
    setChip('laptop', 'saved'); setChip('tablet', 'synced'); pill.classList.remove('busy');
  }
  let tl = null;
  function build() {
    tl?.kill();
    const lNote = L.querySelector('.sy-note-g'), tNote = Tb.querySelector('.sy-note-g');
    const lInk = L.querySelector('.sy-ink-g'), tInk = Tb.querySelector('.sy-ink-g');
    tl = gsap.timeline({ repeat: -1, repeatDelay: .4, paused: true, onRepeat: reset });
    tl.add(reset)
      // 1. a note is added on the laptop
      .add(() => setChip('laptop', 'editing'), .6)
      .to(lNote, { opacity: 1, duration: .35, ease: 'power2.out' }, .6)
      .to(lNote.querySelector('.sy-link'), { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }, .6)
      .add(() => typeInto([lNote.querySelector('.sy-t')], noteText(), 1.1), .95)
      // 2. it syncs to the tablet and appears in the same place
      .add(() => pill.classList.add('busy'), 1.9) // the link brightens just before the change leaves
      .add(() => { setChip('laptop', 'saved'); setChip('tablet', 'syncing'); }, 2.2)
      .add(() => sendPacket(true), 2.2)
      .add(() => { tNote.querySelector('.sy-t').textContent = noteText(); gsap.set(tNote.querySelector('.sy-link'), { strokeDashoffset: 0 }); }, 2.9)
      .to(tNote, { opacity: 1, duration: .45, ease: 'power2.out' }, 2.9)
      .fromTo(tNote.querySelector('.sy-hl'), { opacity: 1 }, { opacity: 0, duration: 1.2, ease: 'power2.out' }, 2.9)
      .add(() => { setChip('tablet', 'synced'); pill.classList.remove('busy'); }, 3.15)
      // 3. a stroke is written on the tablet
      .add(() => setChip('tablet', 'writing'), 4.3)
      .set(tInk, { opacity: 1 }, 4.3)
      .to(tInk.querySelectorAll('.sy-ink')[0], { strokeDashoffset: 0, duration: .7, ease: 'power1.inOut' }, 4.3)
      .to(tInk.querySelectorAll('.sy-ink')[1], { strokeDashoffset: 0, duration: .35, ease: 'power1.inOut' }, 5.05)
      // 4. and syncs back to the laptop
      .add(() => pill.classList.add('busy'), 5.3)
      .add(() => { setChip('tablet', 'saved'); setChip('laptop', 'syncing'); }, 5.6)
      .add(() => sendPacket(false), 5.6)
      .add(() => lInk.querySelectorAll('.sy-ink').forEach(p => gsap.set(p, { strokeDashoffset: 0 })), 6.3)
      .to(lInk, { opacity: 1, duration: .45, ease: 'power2.out' }, 6.3)
      .fromTo(lInk.querySelector('.sy-ink-hl'), { opacity: .9 }, { opacity: 0, duration: 1.2, ease: 'power2.out' }, 6.3)
      .add(() => { setChip('laptop', 'synced'); pill.classList.remove('busy'); }, 6.55)
      // 5. hold, then clear both
      .to([lNote, tNote, lInk, tInk], { opacity: 0, duration: .5, ease: 'power2.in' }, 9.2);
  }

  text(); paint(); measure(); build(); reset();
  if (reduceMotion) { // show the end state
    $$('.sy-note-g, .sy-ink-g').forEach(g => gsap.set(g, { opacity: 1 }));
    $$('.sy-link, .sy-ink').forEach(p => gsap.set(p, { strokeDashoffset: 0 }));
    $$('.sy-t').forEach(e => { e.textContent = noteText(); });
  } else ScrollTrigger.create({ trigger: host, start: 'top 80%', end: 'bottom 10%', onToggle: self => self.isActive ? tl.play() : tl.pause() });
  document.fonts.ready.then(() => { painted = ''; paint(); measure(); });
  addEventListener('kx:lang', () => { text(); paint(); requestAnimationFrame(measure); if (reduceMotion) $$('.sy-t').forEach(e => { e.textContent = noteText(); }); });
  addEventListener('resize', measure);
}
