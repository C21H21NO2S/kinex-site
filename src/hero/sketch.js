// The opening sketch: while three.js downloads and the scene builds, the tablet, its screen and the three cards
// around it are drawn in pencil exactly where the rendered scene will put them (same pose, same camera, from
// pose.js). When the scene is ready, the render develops inside the lines and the lines fade away.
import { TABLET, LINKED_POSE, heroPose, rotXYZ, mul, camera, roundRect } from './pose.js';
import { runSketch } from './sketch-draw.js';
import SketchWorker from './sketch.worker.js?worker&inline';

// the reader pane's text lines on the screen texture (textures.js drawScreen): [baseline, width] in its design space
const READER = {
  zh: { x: 110, mid: 9, lines: [[246, 528], [290, 552], [334, 144], [394, 528], [438, 408], [482, 312], [526, 144], [586, 552], [630, 528]] },
  en: { x: 110, mid: 7, lines: [[246, 505], [284, 481], [322, 380], [376, 490], [414, 484], [452, 314], [490, 232], [544, 507], [582, 518], [620, 174]] },
};

// evenly spaced points along a polyline (the pencil smooths through its points with Catmull-Rom, which overshoots
// where long and short segments meet)
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = Math.hypot(x1 - x0, y1 - y0);
    let s = step - carry;
    for (; s <= d; s += step) out.push([x0 + (x1 - x0) * s / d, y0 + (y1 - y0) * s / d]);
    carry = d - (s - step);
  }
  if (carry > step * .25) out.push(pts[pts.length - 1]);
  return out;
}

// the strokes in CSS px, each with the time (s) it starts and ends
function strokes(W, H, lang, still) {
  const HP = heroPose(W / H);
  // the scene's camera at its first frame (its slow sway starts at +0.06 in y)
  const cam = camera({ ...HP.P0, pos: [HP.P0.pos[0], HP.P0.pos[1] + (still ? 0 : .06), HP.P0.pos[2]] }, W, H);
  const RT = rotXYZ(HP.TROT), T = HP.TPOS;
  const onTablet = (x, y, z) => { const w = mul(RT, [x, y, z]); return cam([w[0] + T[0], w[1] + T[1], w[2] + T[2]]); };
  const { W: TW, H: TH, CR, SW, SH, FRONT } = TABLET;
  // the tablet UI's 1600-wide design space, as drawn on the screen texture
  const VH = 1600 * SH / SW, ui = (x, y) => onTablet((x / 1600 - .5) * SW, (.5 - y / VH) * SH, FRONT + .006);
  const uiRound = (x, y, w, h, r) => roundRect(w, h, r, 3).map(([px, py]) => ui(x + w / 2 + px, y + h / 2 - py));
  const curve = (x0, y0, x1, y1) => Array.from({ length: 17 }, (_, i) => { // the board's link: bezierCurveTo((x0+x1)/2, y0, (x0+x1)/2, y1, x1, y1)
    const t = i / 16, u = 1 - t, mx = (x0 + x1) / 2;
    return ui(u * u * u * x0 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1);
  });
  // closed outlines run on a little past their start, as a hand closes a shape
  const closed = pts => pts.concat(pts.slice(1, 3));

  const S = [];
  const add = (pts, kind, t0, dur) => S.push({ pts: resample(pts, 4), kind, t0, t1: t0 + dur });
  add(closed(roundRect(TW - .012, TH - .012, CR, 8).map(([x, y]) => onTablet(x, y, FRONT))), 'body', 0, .95);
  add(closed(roundRect(SW, SH, .05, 4).map(([x, y]) => onTablet(x, y, FRONT + .004))), 'screen', .2, .8);
  // the three cards around the tablet, where their slow float has them at the scene's first frame
  LINKED_POSE.forEach((c, i) => {
    const f = still ? 0 : 1, d = Math.sin(c.phase) * f;
    const b = mul(RT, c.local), center = [b[0] + T[0] + Math.cos(c.phase) * .06 * f, b[1] + T[1] + d * .12, b[2] + T[2]];
    const R = rotXYZ([HP.TROT[0] + c.tilt[0] + d * .04, HP.TROT[1] + c.tilt[1] + d * .05, c.tilt[2]]);
    const pts = roundRect(c.w, c.h, Math.min(c.w, c.h) * .045, 3).map(([x, y]) => { const w = mul(R, [x, y, 0]); return cam([w[0] + center[0], w[1] + center[1], w[2] + center[2]]); });
    add(closed(pts), 'card', .32 + i * .12, .62);
  });
  // the workspace: top bar, the page in the reader, the divider, the text, the board's cards and links
  add([ui(0, 52), ui(1600, 52)], 'ui', .5, .3);
  add([ui(64, VH), ui(64, 104), ui(684, 104), ui(684, VH)], 'ui', .58, .42);
  add([ui(750, 52), ui(750, VH)], 'ui', .62, .3);
  const R0 = READER[lang] || READER.zh;
  R0.lines.forEach(([y, w], i) => add([ui(R0.x, y - R0.mid), ui(R0.x + w, y - R0.mid)], 'text', .74 + i * .055, .26));
  [[800, 270, 320, 160], [1250, 165, 280, 120], [1180, 520, 330, 250]].forEach(([x, y, w, h], i) => add(closed(uiRound(x, y, w, h, 10)), 'ui', .86 + i * .1, .45));
  add(curve(1120, 330, 1250, 225), 'link', 1.22, .28);
  add(curve(1050, 430, 1180, 640), 'link', 1.3, .3);
  return S;
}

export function drawSketch(host, { reduceMotion = false } = {}) {
  const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  const root = document.documentElement;
  const cv = document.createElement('canvas');
  cv.className = 'boot-sketch-cv' + (reduceMotion ? ' still' : '');
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  host.replaceChildren(cv);
  const job = { strokes: strokes(W, H, root.dataset.lang, reduceMotion), dpr, dark: root.dataset.theme !== 'light', still: reduceMotion };
  let done, onScreen, worker = null;
  const drawn = new Promise(r => (done = r)), ready = new Promise(r => (onScreen = r));
  setTimeout(() => done(), 4000); // never hold the scene back
  setTimeout(() => onScreen(), 2000);
  // off the main thread when the browser can hand the canvas to a worker; on it otherwise
  if (cv.transferControlToOffscreen) {
    try {
      worker = new SketchWorker();
      const off = cv.transferControlToOffscreen();
      // the worker's first frames, then two frames of this thread: the canvas is composited, and from then on the
      // worker's frames reach the screen without this thread (which the scene build is about to keep busy). Released
      // from a task of its own: resolved inside a frame callback, the heavy work would run before that frame commits.
      worker.onmessage = e => { if (e.data === 'first') requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(onScreen, 0))); else done(); };
      worker.onerror = () => done();
      worker.postMessage({ canvas: off, ...job }, [off]);
    } catch (e) { worker?.terminate(); worker = null; }
  }
  // drawn on this thread: the heavy work waits until the lines are done, or it would stall them
  if (!worker) runSketch(cv, job).then(() => done(), () => done()).then(() => onScreen());
  return {
    // resolves once the lines are drawn (the render waits for it, so it develops inside a finished sketch)
    drawn,
    // resolves once the drawing is on screen and no longer needs this thread: heavy work may start
    ready,
    hide() { host.classList.add('off'); setTimeout(() => { worker?.terminate(); host.hidden = true; host.replaceChildren(); }, 1200); },
  };
}
