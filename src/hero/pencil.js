// KineX's pencil, with no DOM: used by the canvas textures and by the opening sketch, which runs in a worker.
// A graphite line drawn the way KineX's pencil draws it: a hand-smoothed path (Catmull-Rom with a slight tremor),
// pressure that builds in and lifts off, soft dabs a tenth of the width apart whose alphas add up to a pressure
// coverage, and the paper tooth masked inside the line, so the grain sits in the stroke and its edge stays clean.

export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// soft: for drawing into a software canvas (the textures; see textures.js) — mixing GPU and software canvases reads
// pixels back on every draw
const toothTiles = {};
export function paperTooth(soft = false) {
  if (toothTiles[soft]) return toothTiles[soft];
  const n = 128, c = new OffscreenCanvas(n, n), x = c.getContext('2d', soft ? { willReadFrequently: true } : undefined), img = x.createImageData(n, n), r = rng(11);
  const base = Float32Array.from({ length: n * n }, () => r());
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    let sum = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += base[((y + dy + n) % n) * n + ((xx + dx + n) % n)];
    const v = Math.min(1, Math.max(0, (sum / 9 - .3) / .4));
    img.data[(y * n + xx) * 4 + 3] = Math.round(255 * (1 - .55 * (1 - v)));
  }
  x.putImageData(img, 0, 0);
  return (toothTiles[soft] = c);
}
const tips = new Map();
export function pencilTip(color, soft = false) { // a soft-edged round tip with a faintly irregular outline, tinted
  const key = color + soft;
  if (tips.has(key)) return tips.get(key);
  const c = new OffscreenCanvas(64, 64), x = c.getContext('2d', soft ? { willReadFrequently: true } : undefined), img = x.createImageData(64, 64);
  for (let y = 0; y < 64; y++) for (let xx = 0; xx < 64; xx++) {
    const px = (xx + .5 - 32) / 32, py = (y + .5 - 32) / 32, a = Math.atan2(py, px), edge = .91 + .035 * Math.sin(a * 5 + .8) + .028 * Math.cos(a * 11 - .3);
    img.data[(y * 64 + xx) * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (edge - Math.hypot(px, py)) / .3)));
  }
  x.putImageData(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${color})`; x.fillRect(0, 0, 64, 64);
  tips.set(key, c); return c;
}

// the dabs of one stroke through pts, in drawing order: [x, y, size, alpha] (top-left corner of each dab)
// taper: [in, out] in px for the pressure to build in and lift off (default: a share of the stroke's length)
export function pencilDabs(pts, width, r, tremor = 1, taper = null) {
  const P = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, cr = j => .5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3);
      P.push([cr(0), cr(1)]);
    }
  }
  P.push(pts[pts.length - 1].slice());
  let len = 0; const arc = P.map((q, i) => (len += i ? Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0));
  const f1 = r() * 6.28, f2 = r() * 6.28, f3 = r() * 6.28;
  const spacing = Math.max(.6, width * .1), dabs = [];
  let next = 0;
  for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], seg = arc[i] - arc[i - 1]; if (seg <= 0) continue;
    const nx = -(y1 - y0) / seg, ny = (x1 - x0) / seg;
    for (; next <= arc[i]; next += spacing) {
      const u = (next - arc[i - 1]) / seg, sA = next, q = sA / (len || 1);
      const env = taper ? Math.min(1, sA / taper[0]) ** .8 * Math.min(1, (len - sA) / taper[1]) ** 1.2   // builds in, lifts off
        : Math.min(1, q / .14) ** .8 * Math.min(1, (1 - q) / .12) ** 1.2;
      const p = Math.max(.12, .3 + .62 * env * (1 + .08 * Math.sin(sA / 29 + f3)));
      const wob = (.7 * Math.sin(sA / 21 + f1) + .35 * Math.sin(sA / 7.5 + f2)) * tremor; // the hand's tremor
      const x = x0 + (x1 - x0) * u + nx * wob, y = y0 + (y1 - y0) * u + ny * wob;
      const w = width * (.42 + .58 * p), cover = .32 + .62 * p;
      dabs.push([x - w / 2, y - w / 2, w, 1 - Math.pow(1 - cover, spacing / w)]);
    }
  }
  return dabs;
}

export function pencil(ctx, pts, width, r, color = '42,40,56') {
  const soft = !!ctx.getContextAttributes?.().willReadFrequently;
  const W = ctx.canvas.width, H = ctx.canvas.height, mask = new OffscreenCanvas(W, H), m = mask.getContext('2d', soft ? { willReadFrequently: true } : undefined), T = pencilTip(color, soft);
  for (const [x, y, w, a] of pencilDabs(pts, width, r)) { m.globalAlpha = a; m.drawImage(T, x, y, w, w); }
  m.globalAlpha = 1; m.globalCompositeOperation = 'destination-in'; m.fillStyle = m.createPattern(paperTooth(soft), 'repeat'); m.fillRect(0, 0, W, H);
  ctx.drawImage(mask, 0, 0);
}
