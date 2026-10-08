// 03 Ink — a real drawing pad. The brushes follow KineX's own ink materials:
//  - graphite and colour pencil: soft dabs a tenth of the width apart whose alphas add up to a pressure coverage;
//    the paper tooth is masked inside the line, so the grain stays on the paper and the edge stays clean
//  - watercolour: one union field per stroke (the max of the dabs, never their sum, so there are no rings), a soft
//    edge, pigment pooling just inside the rim and a light paper grain; strokes then glaze over each other
//  - fountain pen: KineX's oblique nib — a rounded 3.5:1 imprint held at 45°, swept from sample to sample, so
//    strokes across the nib run thick and strokes along it run to hairlines; pressure scales the imprint
//  - highlighter: a flat translucent band
// Each stroke renders into a layer (the live canvas while drawing, or a thumbnail) and is multiplied onto the page
// canvas once it is finished.
import { gsap, ScrollTrigger, reduceMotion } from '../core/scroll.js';
import { t } from '../core/prefs.js';
import { rng } from '../hero/textures.js';

const BRUSHES = [
  { id: 'hb', label: 'ink.hb', kind: 'graphite', size: 2.8, width: p => .45 + .55 * p, cover: p => .16 + .5 * p ** 1.25, tooth: 'fine', grain: .5, color: '#3A3942', fixed: true },
  { id: '6b', label: 'ink.6b', kind: 'graphite', size: 4.6, width: p => .5 + .5 * p, cover: p => .38 + .52 * p, tooth: 'coarse', grain: .6, color: '#1E1D24', fixed: true },
  { id: 'poly', label: 'ink.poly', kind: 'graphite', size: 5.6, width: p => .5 + .5 * p, cover: p => .26 + .66 * p ** 1.1, tooth: 'coarse', grain: .72 },
  { id: 'water', label: 'ink.water', kind: 'water', size: 72 },
  { id: 'pen', label: 'ink.pen', kind: 'pen', size: 4.6 },
  { id: 'hl', label: 'ink.hl', kind: 'hl', size: 18, pal: ['#F4D35E', '#9ED6E3', '#F2B8C6'] },
];
// blue-black ink, ultramarine, cerulean, cadmium orange, vermilion, sap green
const PAL = ['#1C2B4A', '#3B5BA9', '#6FA8C9', '#E07A3F', '#C2452D', '#4F7A5A'];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const smooth01 = v => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

// ---------------------------------------------------------------- paper tooth (device pixels, tiled)
const TS = 256;
const TOOTH = (() => {
  const r = rng(5), base = Float32Array.from({ length: TS * TS }, () => r());
  const blur = (src, k) => { const out = new Float32Array(TS * TS), n = (2 * k + 1) ** 2; for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { let s = 0; for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) s += src[((y + dy + TS) % TS) * TS + ((x + dx + TS) % TS)]; out[y * TS + x] = s / n; } return out; };
  const norm = a => { let lo = 1, hi = 0; a.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); }); return a.map(v => (v - lo) / (hi - lo)); };
  const fine = norm(blur(base, 1)), coarse = norm(blur(base, 2).map((v, i) => v * .7 + fine[i] * .3));
  return { fine, coarse };
})();
const patterns = new Map();
function toothPattern(ctx, kind, grain) {
  const key = kind + grain;
  if (!patterns.has(key)) {
    const c = document.createElement('canvas'); c.width = c.height = TS;
    const x = c.getContext('2d'), img = x.createImageData(TS, TS), src = TOOTH[kind];
    for (let i = 0; i < TS * TS; i++) { const v = Math.pow(src[i], .8); img.data[i * 4 + 3] = Math.round(255 * (1 - grain * (1 - v))); }
    x.putImageData(img, 0, 0); patterns.set(key, c);
  }
  return ctx.createPattern(patterns.get(key), 'repeat');
}

// ---------------------------------------------------------------- engines
const grow = (e, x0, y0, x1, y1) => { const d = e.dirty; e.dirty = d ? [Math.min(d[0], x0), Math.min(d[1], y0), Math.max(d[2], x1), Math.max(d[3], y1)] : [x0, y0, x1, y1]; };
// walk a segment at a fixed arc-length phase, so the dab pattern does not depend on the input sample rate
function walk(e, a, b, spacing, fn) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  let d = spacing - e.rem;
  for (; d <= len; d += spacing) { const u = d / len; fn(a.x + dx * u, a.y + dy * u, a.p + (b.p - a.p) * u, e.travel + d); }
  e.rem = (e.rem + len) % spacing; e.travel += len;
}

const ENGINES = {
  graphite: {
    begin(s, L) {
      const mask = document.createElement('canvas'); mask.width = L.c.width; mask.height = L.c.height;
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
      const sx = sprite.getContext('2d'), img = sx.createImageData(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { // a soft-edged tip with a slightly irregular outline
        const px = (x + .5 - 32) / 32, py = (y + .5 - 32) / 32, ang = Math.atan2(py, px), edge = .91 + .035 * Math.sin(ang * 5 + .8) + .028 * Math.cos(ang * 11 - .3);
        img.data[(y * 64 + x) * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (edge - Math.hypot(px, py)) / .26)));
      }
      sx.putImageData(img, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = s.color; sx.fillRect(0, 0, 64, 64);
      s.e = { mask, mx: mask.getContext('2d'), sprite, rem: 0, travel: 0, dirty: null };
      if (s.pts[0]) this.seg(s, L, s.pts[0], s.pts[0]);
    },
    seg(s, L, a, b) {
      const B = s.brush, e = s.e, D = L.D, sz = B.size * L.k * (s.k || 1), spacing = Math.max(.22, sz * .1);
      const dab = (x, y, p) => {
        const w = Math.max(.5, sz * B.width(p)), al = 1 - Math.pow(1 - B.cover(p), spacing / w);
        e.mx.globalAlpha = al; e.mx.drawImage(e.sprite, (x - w / 2) * D, (y - w / 2) * D, w * D, w * D);
        grow(e, (x - w) * D, (y - w) * D, (x + w) * D, (y + w) * D);
      };
      if (a === b) dab(a.x, a.y, a.p); else walk(e, a, b, spacing, dab);
    },
    present(s, L) {
      const e = s.e; if (!e.dirty) return;
      const [x0, y0, x1, y1] = e.dirty.map(Math.floor), w = x1 - x0 + 2, h = y1 - y0 + 2; e.dirty = null;
      // clip first: destination-in would otherwise clear everything outside the rectangle
      const x = L.x; x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
      x.clearRect(x0, y0, w, h); x.drawImage(e.mask, 0, 0);
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = toothPattern(x, s.brush.tooth, s.brush.grain); x.fillRect(x0, y0, w, h);
      x.restore();
    },
  },

  water: {
    begin(s, L) {
      const n = L.c.width * L.c.height;
      s.e = { field: new Uint8ClampedArray(n), rem: 0, travel: 0, dirty: null, rgb: hex(s.color) };
      if (s.pts[0]) this.seg(s, L, s.pts[0], s.pts[0]);
    },
    seg(s, L, a, b) {
      const e = s.e, base = s.brush.size * L.k * (s.k || 1), D = L.D, Wd = L.c.width, Hd = L.c.height, F = e.field;
      const spacing = Math.max(.28, base * .045), bleed = Math.min(5, base * .12 * .48 + .45);
      const dab = (x, y, p, travel) => {
        const load = .42 + .58 * Math.exp(-.012 * travel / base);                               // the brush runs dry slowly
        const rate = (.07 + 1.34 * Math.pow(p, 1.12)) * load * (1 - .34 * .2), alpha = 1 - Math.exp(-rate);
        const r = (base * (.42 + .7 * p) / 2 + bleed) * D, cx = x * D, cy = y * D, r2 = r * r, A = alpha * 255;
        const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(Wd - 1, Math.ceil(cx + r)), ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(Hd - 1, Math.ceil(cy + r));
        for (let py = ya; py <= yb; py++) {
          const dy = py + .5 - cy, row = py * Wd;
          for (let px = xa; px <= xb; px++) {
            const dx = px + .5 - cx, q = (dx * dx + dy * dy) / r2; if (q >= 1) continue;
            const v = A * smooth01((1 - q) / .45); if (v > F[row + px]) F[row + px] = v; // union: max, not sum
          }
        }
        grow(e, xa, ya, xb + 1, yb + 1);
      };
      if (a === b) dab(a.x, a.y, a.p, 0); else walk(e, a, b, spacing, dab);
    },
    present(s, L) {
      const e = s.e; if (!e.dirty) return;
      const Wd = L.c.width, Hd = L.c.height, F = e.field, R = Math.max(2, Math.round(3 * L.D));
      const x0 = Math.max(0, e.dirty[0] - R), y0 = Math.max(0, e.dirty[1] - R), x1 = Math.min(Wd, e.dirty[2] + R), y1 = Math.min(Hd, e.dirty[3] + R); e.dirty = null;
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      // neighbourhood max and min (separable): pigment pools just inside the edge, and only where the
      // neighbourhood reaches bare paper — never along the seams inside the wash
      const qx0 = Math.max(0, x0 - R), qx1 = Math.min(Wd, x1 + R), qy0 = Math.max(0, y0 - R), qy1 = Math.min(Hd, y1 + R), qw = qx1 - qx0;
      const rowMax = new Uint8Array(qw * (qy1 - qy0)), rowMin = new Uint8Array(qw * (qy1 - qy0));
      for (let y = qy0; y < qy1; y++) { const row = y * Wd, o = (y - qy0) * qw; for (let x = qx0; x < qx1; x++) { let m = 0, n = 255; for (let k = Math.max(0, x - R), kb = Math.min(Wd - 1, x + R); k <= kb; k++) { const v = F[row + k]; if (v > m) m = v; if (v < n) n = v; } rowMax[o + x - qx0] = m; rowMin[o + x - qx0] = n; } }
      const img = L.x.createImageData(w, h), out = img.data, [cr, cg, cb] = e.rgb, T = TOOTH.fine, pool = .95 * .65, paper = .1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const a = F[y * Wd + x]; if (!a) continue;
        let d = 0, m = 255; for (let k = Math.max(qy0, y - R), kb = Math.min(qy1 - 1, y + R); k <= kb; k++) { const j = (k - qy0) * qw + x - qx0; if (rowMax[j] > d) d = rowMax[j]; if (rowMin[j] < m) m = rowMin[j]; }
        const r = a / d, rim = Math.min(1, (d - m) / d / .6), tooth = T[(y & (TS - 1)) * TS + (x & (TS - 1))];
        const v = a / 255 * (1 + pool * rim * 4 * r * (1 - r)) * (1 + paper * (tooth - .5) * 2) * .86;
        const o = ((y - y0) * w + x - x0) * 4; out[o] = cr; out[o + 1] = cg; out[o + 2] = cb; out[o + 3] = Math.min(255, v * 255);
      }
      L.x.putImageData(img, x0, y0);
    },
  },

  pen: {
    begin(s, L) { s.e = {}; if (s.pts[0]) this.seg(s, L, s.pts[0], s.pts[0]); },
    seg(s, L, a, b) {
      const base = s.brush.size * L.k * (s.k || 1), x = L.x;
      const nib = q => { // the imprint: half-length follows pressure (floor .3), never above the nominal width
        const k = Math.min(1, .3 + .75 * Math.pow(Math.max(0, q.p), .6)), A = base * .62 * k, Bn = A / 3.5;
        return NIB.map(([u, v]) => [q.x + (u * A * NC - v * Bn * NS), q.y + (u * A * NS + v * Bn * NC)]);
      };
      const poly = a === b ? nib(a) : hull(nib(a).concat(nib(b)));
      x.save(); x.setTransform(L.D, 0, 0, L.D, 0, 0); x.fillStyle = s.color;
      x.beginPath(); poly.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.fill();
      x.restore();
    },
    present() {},
  },

  hl: {
    begin(s) { s.e = {}; },
    seg() {},
    present(s, L) {
      const x = L.x, P = s.pts; if (P.length < 2) return;
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, L.c.width, L.c.height);
      x.setTransform(L.D, 0, 0, L.D, 0, 0); x.globalAlpha = .42; x.strokeStyle = s.color; x.lineWidth = s.brush.size * L.k * (s.k || 1); x.lineCap = 'butt'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) x.lineTo(P[i].x, P[i].y); x.stroke(); x.restore();
    },
  },
};
const engine = s => ENGINES[s.brush.kind];

// a 16-vertex superellipse (exponent 2.8) on a unit nib, and the 45° axis it is held at (up and to the right)
const NIB = Array.from({ length: 16 }, (_, i) => { const t = i / 16 * Math.PI * 2, c = Math.cos(t), n = Math.sin(t); return [Math.sign(c) * Math.abs(c) ** (2 / 2.8), Math.sign(n) * Math.abs(n) ** (2 / 2.8)]; });
const NC = Math.cos(-Math.PI / 4), NS = Math.sin(-Math.PI / 4);
// the area swept by a scaled convex nib between two samples is the convex hull of the two imprints
function hull(P) {
  P.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cross(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cross(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------------------------------------------------------------- hand-drawn strokes for the demo sketch
// Sparse control points become a Catmull-Rom line with a slow tremor; the pressure builds in, breathes with the
// line, rises where the hand slows for a turn, and lifts off at the end.
function hand(ctrl, { step = 2.2, wobble = .7, p0 = .25, pk = .8, seed = 1, taper = .16 } = {}) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const a = ctrl[Math.max(0, i - 1)], b = ctrl[i], c = ctrl[i + 1], d = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, cr = j => .5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3);
      pts.push([cr(0), cr(1)]);
    }
  }
  pts.push(ctrl.at(-1).slice());
  const f1 = r() * 6.28, f2 = r() * 6.28, f3 = r() * 6.28;
  let len = 0; const arc = pts.map((p, i) => (len += i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0));
  return pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
    const sA = arc[i], u = sA / (len || 1), w = wobble * (Math.sin(sA / 23 + f1) * .65 + Math.sin(sA / 8.5 + f2) * .35);
    const prev = pts[Math.max(0, i - 3)], next = pts[Math.min(pts.length - 1, i + 3)];
    const turn = Math.abs(Math.atan2(next[1] - p[1], next[0] - p[0]) - Math.atan2(p[1] - prev[1], p[0] - prev[0]));
    const bend = Math.min(1, (turn > Math.PI ? 2 * Math.PI - turn : turn) * 1.3);
    const env = smooth01(u / taper) * smooth01((1 - u) / (taper * .8));
    const pr = p0 + (pk - p0) * env * (1 + .1 * Math.sin(sA / 31 + f3)) + .12 * bend * env;
    return { x: p[0] - ty / tl * w, y: p[1] + tx / tl * w, p: Math.max(0, Math.min(1, pr)) };
  });
}

export function initInk() {
  const paper = document.getElementById('paper'), cv = document.getElementById('inkCanvas'), ctx = cv.getContext('2d');
  const live = document.createElement('canvas'), lctx = live.getContext('2d');
  live.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply';
  paper.insertBefore(live, cv.nextSibling);
  const hint = document.getElementById('paperHint');
  const cursor = document.getElementById('cursor');
  const L = { c: live, x: lctx, D: 1, k: 1 };
  let W = 0, H = 0;
  let brush = BRUSHES[0], color = PAL[0];
  const strokes = [];
  let cur = null, demoDone = false, userDrew = false;

  function size() {
    const r = paper.getBoundingClientRect();
    L.D = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    for (const c of [cv, live]) { c.width = Math.round(W * L.D); c.height = Math.round(H * L.D); }
    redraw();
  }

  // a stroke is drawn into the live layer, then multiplied onto the page
  function start(s) { engine(s).begin(s, L); engine(s).present(s, L); }
  function add(s, a, b) { engine(s).seg(s, L, a, b); }
  function show(s) { engine(s).present(s, L); }
  function commit(s) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(live, 0, 0); ctx.restore();
    lctx.save(); lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, live.width, live.height); lctx.restore();
    s.e = null;
  }
  function render(s) { const pts = s.pts; s.pts = [pts[0]]; start(s); for (let i = 1; i < pts.length; i++) { s.pts.push(pts[i]); add(s, pts[i - 1], pts[i]); } show(s); commit(s); }
  function redraw() { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); strokes.forEach(render); }

  // ---------------------------------------------------------------- input
  let lastP = .5, lastPt = null;
  function sample(e) {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let p;
    if (e.pointerType === 'pen' && e.pressure > 0) p = e.pressure;
    else { // simulate pressure from speed: slow = heavier
      const v = lastPt ? Math.hypot(x - lastPt.x, y - lastPt.y) / Math.max(1, e.timeStamp - lastPt.t) : 0;
      p = Math.min(1, Math.max(.22, 1.05 - v * .55));
    }
    lastP += (p - lastP) * .35;
    lastPt = { x, y, t: e.timeStamp };
    return { x, y, p: lastP };
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    stopDemo(); userDrew = true; hint.classList.add('gone');
    lastPt = null; lastP = e.pointerType === 'pen' ? e.pressure || .5 : .6;
    cur = { brush, color: brush.fixed ? brush.color : color, pts: [sample(e)] };
    start(cur);
  });
  cv.addEventListener('pointermove', e => {
    moveCursor(e);
    if (!cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const pt = sample(ev), prev = cur.pts[cur.pts.length - 1];
      if (Math.hypot(pt.x - prev.x, pt.y - prev.y) < .8) continue;
      cur.pts.push(pt); add(cur, prev, pt);
    }
    show(cur);
  });
  const end = () => {
    if (!cur) return;
    show(cur); commit(cur); strokes.push(cur); cur = null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  // brush outline cursor
  function moveCursor() { if (cursor) { cursor.classList.add('pen'); cursor.style.setProperty('--bs', Math.max(6, brush.size * (brush.kind === 'water' ? .9 : brush.kind === 'hl' ? 1 : 1.2)) + 'px'); } }
  paper.addEventListener('pointerleave', () => cursor?.classList.remove('pen'));
  paper.querySelector('.brushes').addEventListener('pointerenter', () => cursor?.classList.remove('pen'));

  // ---------------------------------------------------------------- toolbar
  const list = document.getElementById('brushList'), sw = document.getElementById('swatches');
  function buildTools() {
    list.innerHTML = BRUSHES.map(b => `<button class="brush" data-b="${b.id}" aria-pressed="${b === brush}"><canvas width="124" height="44"></canvas><span>${t(b.label)}</span></button>`).join('');
    list.querySelectorAll('.brush').forEach((el, i) => {
      const c = el.querySelector('canvas'), B = BRUSHES[i];
      // the thumbnail is the brush itself, at a smaller nib, drawn on the dark toolbar
      const T = { c, x: c.getContext('2d'), D: 2, k: B.kind === 'water' ? .3 : B.kind === 'hl' ? .45 : .8 };
      const s = { brush: B, color: B.fixed ? '#D8D6DE' : B.kind === 'hl' ? B.pal[0] : '#7DD3FC', pts: [] };
      const pts = Array.from({ length: 25 }, (_, k) => { const u = k / 24; return { x: 6 + u * 50, y: 11 + Math.sin(u * 6.283) * 4.5, p: .35 + .65 * Math.sin(u * Math.PI) }; });
      const E = ENGINES[B.kind];
      s.pts = [pts[0]]; E.begin(s, T);
      for (let k = 1; k < pts.length; k++) { s.pts.push(pts[k]); E.seg(s, T, pts[k - 1], pts[k]); }
      E.present(s, T);
      el.addEventListener('click', () => { brush = B; buildSwatches(); list.querySelectorAll('.brush').forEach(x => x.setAttribute('aria-pressed', String(x === el))); });
    });
    buildSwatches();
  }
  function buildSwatches() {
    const pal = brush.pal || PAL;
    if (brush.fixed) { sw.innerHTML = `<button style="background:${brush.color}" aria-pressed="true" disabled></button>`; return; }
    if (!pal.includes(color)) color = pal[0];
    sw.innerHTML = pal.map(c => `<button style="background:${c}" data-c="${c}" aria-pressed="${c === color}" aria-label="${c}"></button>`).join('');
    sw.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { color = b.dataset.c; sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  }
  document.getElementById('inkUndo').addEventListener('click', () => { stopDemo(); strokes.pop(); redraw(); });
  document.getElementById('inkClear').addEventListener('click', () => { stopDemo(); strokes.length = 0; redraw(); hint.classList.remove('gone'); });

  // ---------------------------------------------------------------- demo drawing: a page of observing notes
  // A nebula washed in with back-and-forth strokes, a red giant scrubbed in circles, its orbit sketched in HB, an
  // arrow and ²⁶Fe in fountain pen, a loose 6B ring, colour-pencil glints, a highlighter swipe and a scale bar.
  let demoTl = null;
  function demo() {
    if (demoDone || userDrew) return;
    demoDone = true; hint.classList.add('gone');
    const S = Math.min(W / 1080, (H - 120) / 560), cx = W / 2, cy = (H - 96) / 2 + 22;
    const at = (x, y) => [cx + x * S, cy + y * S];
    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    // back-and-forth passes filling an ellipse: the way a wash is laid
    const zig = (x0, y0, w, h, n, tilt, seed) => { const r = rng(seed); return Array.from({ length: n + 1 }, (_, i) => { const u = i / n, side = i % 2 ? 1 : -1, span = Math.sqrt(Math.max(.08, 1 - (2 * u - 1) ** 2 * .7)); const [x, y] = rot(side * w / 2 * span * (.8 + r() * .25), -h / 2 + u * h + (r() - .5) * 10, tilt); return at(x0 + x, y0 + y); }); };
    // round and round, spiralling in: a scrubbed disc
    const loop = (x0, y0, r0, r1, turns, seed, ry = 1, tilt = 0, a0 = -1.9) => { const r = rng(seed), n = Math.round(turns * 9); return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + t * turns * Math.PI * 2, rad = r0 + (r1 - r0) * t + (r() - .5) * 5; const [x, y] = rot(Math.cos(a) * rad, Math.sin(a) * rad * ry, tilt); return at(x0 + x, y0 + y); }); };
    const pts = list => list.map(([x, y]) => at(x, y));
    const plan = [
      // nebula: ultramarine, then a lighter cerulean veil across it
      { b: 'water', c: '#3B5BA9', k: .95, pts: hand(zig(-300, -30, 250, 170, 8, -.2, 3), { seed: 3, p0: .45, pk: .72, wobble: 2, taper: .06 }) },
      { b: 'water', c: '#6FA8C9', k: .8, pts: hand(zig(-230, 30, 190, 110, 5, -.1, 4), { seed: 4, p0: .4, pk: .62, wobble: 2, taper: .08 }) },
      // red giant: cadmium orange scrubbed round, a vermilion shadow on its lower right
      { b: 'water', c: '#E07A3F', k: .9, pts: hand(loop(190, -40, 66, 22, 2.6, 5), { seed: 5, p0: .5, pk: .75, wobble: 1.5, taper: .05 }) },
      { b: 'water', c: '#C2452D', k: .3, pts: hand(loop(190, -40, 76, 74, .28, 6, 1, 0, -.1), { seed: 6, p0: .2, pk: .38, wobble: .8, taper: .35 }) },
      // its orbit, sketched twice in HB
      { b: 'hb', pts: hand(loop(190, -40, 150, 150, 1.06, 7, .3, -.16, 2.4), { seed: 7, p0: .2, pk: .55, wobble: .9 }) },
      { b: 'hb', pts: hand(loop(192, -38, 153, 151, .38, 8, .3, -.16, 3.1), { seed: 8, p0: .15, pk: .4, wobble: .8 }) },
      // an arrow from the nebula to the star, in fountain pen
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[-150, -86], [-80, -128], [0, -138], [72, -114]]), { seed: 9, p0: .2, pk: .7, wobble: .5 }) },
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[52, -132], [74, -113], [48, -100]]), { seed: 10, p0: .3, pk: .75, wobble: .3, taper: .25 }) },
      // ²⁶Fe
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[150, 104], [149, 132], [147, 158]]), { seed: 11, p0: .4, pk: .85, wobble: .4, taper: .2 }) },
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[150, 104], [166, 102], [180, 101]]), { seed: 12, p0: .35, pk: .7, wobble: .3, taper: .25 }) },
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[149, 129], [160, 128], [170, 128]]), { seed: 13, p0: .35, pk: .7, wobble: .3, taper: .25 }) },
      { b: 'pen', c: '#1C2B4A', pts: hand(pts([[186, 141], [205, 139], [206, 128], [195, 123], [185, 131], [184, 147], [194, 156], [210, 152]]), { seed: 14, p0: .3, pk: .8, wobble: .3, taper: .12 }) },
      { b: 'pen', c: '#1C2B4A', k: .7, pts: hand(pts([[114, 100], [119, 94], [125, 96], [125, 102], [114, 113], [127, 112]]), { seed: 15, p0: .35, pk: .75, wobble: .2, taper: .15 }) },
      { b: 'pen', c: '#1C2B4A', k: .7, pts: hand(pts([[138, 94], [131, 101], [130, 110], [136, 114], [140, 108], [134, 104], [130, 108]]), { seed: 16, p0: .35, pk: .75, wobble: .2, taper: .15 }) },
      // a loose 6B ring around it, and a highlighter swipe beneath
      { b: '6b', pts: hand(loop(168, 128, 62, 66, 1.12, 17, .62, -.08, -2.6), { seed: 17, p0: .3, pk: .75, wobble: 1.4 }) },
      { b: 'hl', c: '#F4D35E', k: .9, pts: hand(pts([[132, 176], [180, 174], [226, 171]]), { seed: 18, p0: .7, pk: .7, wobble: .6 }) },
      // colour-pencil glints around the star
      ...[[300, -132, 12], [334, -96, 8], [276, -168, 7]].flatMap(([x, y, r0], i) => [
        { b: 'poly', c: '#C2452D', pts: hand(pts([[x, y - r0], [x + 1, y + r0]]), { seed: 20 + i, p0: .3, pk: .8, wobble: .2, taper: .3 }) },
        { b: 'poly', c: '#C2452D', pts: hand(pts([[x - r0, y + 1], [x + r0, y]]), { seed: 30 + i, p0: .3, pk: .8, wobble: .2, taper: .3 }) },
      ]),
      // a scale bar in HB: a line, three ticks
      { b: 'hb', pts: hand(pts([[-420, 196], [-330, 194], [-240, 191]]), { seed: 40, p0: .3, pk: .6, wobble: .4 }) },
      ...[-420, -330, -240].map((x, i) => ({ b: 'hb', pts: hand(pts([[x, 186 - (i === 1 ? 2 : 0)], [x + .5, 202]]), { seed: 41 + i, p0: .3, pk: .6, wobble: .2, taper: .3 }) })),
    ];
    demoTl = gsap.timeline();
    let t0 = 0;
    plan.forEach(st => {
      const B = BRUSHES.find(b => b.id === st.b), s = { brush: B, color: B.fixed ? B.color : st.c, k: (st.k || 1) * S, pts: [st.pts[0]] };
      let len = 0; st.pts.forEach((q, i) => { if (i) len += Math.hypot(q.x - st.pts[i - 1].x, q.y - st.pts[i - 1].y); });
      const speed = B.kind === 'water' ? 900 : B.kind === 'pen' ? 420 : 520, dur = Math.min(1.6, .12 + len / speed);
      const prog = { i: 0 };
      let begun = false;
      const feed = upto => { while (s.pts.length < Math.min(st.pts.length, upto + 1)) { const prev = s.pts[s.pts.length - 1], pt = st.pts[s.pts.length]; s.pts.push(pt); add(s, prev, pt); } };
      demoTl.to(prog, { i: st.pts.length - 1, duration: dur, ease: 'sine.inOut', lazy: false,
        onUpdate: () => { if (!begun) { begun = true; start(s); } feed(Math.floor(prog.i)); show(s); },
        onComplete: () => { if (!begun) start(s); feed(st.pts.length); show(s); commit(s); strokes.push(s); } }, t0);
      t0 += dur + (B.kind === 'pen' ? .05 : .12);
    });
  }
  function stopDemo() { if (demoTl) { demoTl.progress(1); demoTl.kill(); demoTl = null; } }

  buildTools();
  size();
  addEventListener('resize', () => { if (cur) return; size(); });
  addEventListener('kx:lang', buildTools);
  ScrollTrigger.create({ trigger: paper, start: 'top 65%', once: true, onEnter: () => { if (reduceMotion) { demo(); stopDemo(); } else gsap.delayedCall(.5, demo); } });
}
