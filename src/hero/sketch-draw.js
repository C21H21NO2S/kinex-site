// Draws the opening sketch's strokes with KineX's pencil, stroke by stroke, on a canvas: in a worker (on an
// OffscreenCanvas) wherever possible, so the drawing keeps its pace while the main thread builds the page.
import { pencilDabs, pencilTip, paperTooth, rng } from './pencil.js';

// width (CSS px) and strength of each kind of line: the tablet is pressed hardest, its UI drawn lightly
const STYLE = { body: [2, 1], screen: [1.5, .78], card: [1.7, .9], ui: [1.3, .52], text: [1.15, .4], link: [1.3, .58] };
const ease = t => (t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

export function runSketch(canvas, { strokes, dpr, dark, still, onFirst }) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  // the dabs pile up on a layer; the visible canvas shows it through the paper tooth, so the grain sits in the lines
  const layer = mk(W, H), lx = layer.getContext('2d');
  const tip = pencilTip(dark ? '226,231,250' : '36,36,44'), tooth = ctx.createPattern(paperTooth(), 'repeat');
  const r = rng(29), K = dark ? .9 : .82;
  const S = strokes.map(s => {
    const [w, k] = STYLE[s.kind];
    return { t0: s.t0, t1: s.t1, k: k * K, n: 0, dabs: pencilDabs(s.pts.map(p => [p[0] * dpr, p[1] * dpr]), w * dpr, r, dpr * .6) };
  });
  const end = Math.max(...S.map(s => s.t1));
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : f => setTimeout(() => f(performance.now()), 16);
  return new Promise(resolve => {
    let clock = 0, last = 0, frames = 0;
    const step = now => {
      // a stalled frame slows the drawing down instead of skipping it
      clock = still ? end : clock + (last ? Math.min(.05, (now - last) / 1000) : 0); last = now;
      for (const s of S) {
        const target = Math.round(ease(Math.min(1, Math.max(0, (clock - s.t0) / (s.t1 - s.t0)))) * s.dabs.length);
        if (target <= s.n) continue;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (; s.n < target; s.n++) {
          const [x, y, w, a] = s.dabs[s.n];
          lx.globalAlpha = a * s.k; lx.drawImage(tip, x, y, w, w);
          if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + w > x1) x1 = x + w; if (y + w > y1) y1 = y + w;
        }
        // refresh just the part of the canvas this stroke touched
        x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(W, Math.ceil(x1) + 1); y1 = Math.min(H, Math.ceil(y1) + 1);
        if (x1 <= x0 || y1 <= y0) continue;
        const w = x1 - x0, h = y1 - y0;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
        ctx.clearRect(x0, y0, w, h); ctx.drawImage(layer, x0, y0, w, h, x0, y0, w, h);
        ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = tooth; ctx.fillRect(x0, y0, w, h);
        ctx.restore();
      }
      if (onFirst && (++frames === 3 || clock >= end)) { onFirst(); onFirst = null; } // a few frames in (or done): the canvas has something to show
      if (clock >= end) resolve(); else raf(step);
    };
    raf(step);
  });
}
