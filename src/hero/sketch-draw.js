// Draws the opening sketch's strokes with KineX's pencil, stroke by stroke, on a canvas: in a worker (on an
// OffscreenCanvas) wherever possible, so the drawing keeps its pace while the main thread builds the page.
import { pencilDabs, pencilTip, paperTooth, rng } from './pencil.js';

// width (CSS px) and strength of each kind of line: the tablet is pressed hardest, its UI drawn lightly
const STYLE = { body: [2, 1], screen: [1.5, .78], card: [1.7, .9], ui: [1.3, .52], text: [1.15, .4], link: [1.3, .58] };
// a hand's stroke: off at speed, slowing as it lands (an ease-in start reads as a blank moment)
const ease = t => 1 - (1 - t) ** 1.7;
const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

// onNearlyDone: called a moment before the last stroke ends (the render starts to develop as the lines finish)
export function runSketch(canvas, { strokes, dpr, dark, still, gate, onFirst, onNearlyDone }) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  // the dabs pile up on a layer; the visible canvas shows it through the paper tooth, so the grain sits in the lines
  const layer = mk(W, H), lx = layer.getContext('2d');
  const tip = pencilTip(dark ? '226,231,250' : '36,36,44'), tooth = ctx.createPattern(paperTooth(), 'repeat');
  const r = rng(29), K = dark ? .9 : .82;
  const S = strokes.map(s => {
    const [w, k] = STYLE[s.kind];
    return { t0: s.t0, t1: s.t1, k: k * K, n: 0, dabs: pencilDabs(s.pts.map(p => [p[0] * dpr, p[1] * dpr]), w * dpr, r, dpr * .6, [26 * dpr, 34 * dpr]) };
  });
  const end = Math.max(...S.map(s => s.t1));
  // Frames follow the display, but a worker's animation frames pause while the page's thread is busy (the scene being
  // built): a timer steps in after 34 ms, so the pencil keeps going.
  const raf = typeof requestAnimationFrame !== 'function' ? f => setTimeout(() => f(performance.now()), 16) : f => {
    let fired = false;
    const run = now => { if (fired) return; fired = true; clearTimeout(timer); f(now); };
    const timer = setTimeout(() => run(performance.now()), 34);
    requestAnimationFrame(run);
  };
  return new Promise(resolve => {
    let clock = 0, last = 0, frames = 0, open = !gate;
    gate?.then(() => { open = true; });
    const step = now => {
      // until the page says go, push empty frames (a 1 px clear) so the canvas gets onto the screen
      if (!open) { ctx.clearRect(0, 0, 1, 1); if (onFirst && ++frames === 2) { onFirst(); onFirst = null; } raf(step); return; }
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
      if (onNearlyDone && clock >= end - .25) { onNearlyDone(); onNearlyDone = null; }
      if (clock >= end) resolve(); else raf(step);
    };
    raf(step);
  });
}
