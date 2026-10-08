// The 3D story: a Galaxy Tab–style tablet, paper fragments, glowing threads; scroll drives the camera.
// Modes: 'story' (scroll progress 0..1), 'join' (constellation bookend), 'off' (nothing rendered).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { makePage, makeCard, drawScreen, SCREEN, rng, VARIANTS } from './textures.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function createScene({ canvas, context, tier = 'high', getLang, isDark, reduceMotion = false, fontsReady = Promise.resolve() }) {
  const yieldTask = () => new Promise(r => setTimeout(r, 0));
  const DBG0 = new URLSearchParams(location.search);
  // ---------------------------------------------------------------- renderer
  // Rendered straight to the canvas (no post-processing chain): native MSAA stays on, the screen and the
  // threads skip tone mapping, and nothing is re-uploaded while scrolling.
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.autoClear = false;
  const DPR = { high: Math.min(devicePixelRatio, 2), mid: Math.min(devicePixelRatio, 1.5), low: 1 }[tier];
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .4, 120);
  const pmrem = new THREE.PMREMGenerator(renderer);
  await yieldTask();
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  await yieldTask();

  const bgCanvas = document.createElement('canvas'); bgCanvas.width = 1024; bgCanvas.height = 640;
  const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;
  let grain = null;
  function grainTile() {
    const t = document.createElement('canvas'); t.width = t.height = 128;
    const x = t.getContext('2d'), img = x.createImageData(128, 128), r = rng(3);
    for (let i = 0; i < img.data.length; i += 4) { const n = r() - .5, v = n > 0 ? 255 : 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.round(Math.abs(n) * 2.2 / 255 * 255 * 1.1); }
    x.putImageData(img, 0, 0); return t;
  }
  function paintBackground(k) {
    const c = bgCanvas.getContext('2d'), w = 1024, h = 640, mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const base = mix([205, 207, 214], [6, 6, 10]), glow = mix([232, 235, 242], [44, 38, 120]), glow2 = mix([214, 226, 240], [12, 60, 90]);
    c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, w, h);
    let g = c.createRadialGradient(w * .92, -h * .1, 0, w * .92, -h * .1, w * .9); g.addColorStop(0, `rgba(${glow},${.9 - k * .5})`); g.addColorStop(1, `rgba(${glow},0)`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    g = c.createRadialGradient(w * .62, h * .55, 0, w * .62, h * .55, w * .5); g.addColorStop(0, `rgba(${glow2},${.35 + k * .1})`); g.addColorStop(1, `rgba(${glow2},0)`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.1 + k * .31})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = grain || (grain = c.createPattern(grainTile(), 'repeat')); c.fillRect(0, 0, w, h); // dithers the gradients
    bgTex.needsUpdate = true;
  }
  scene.fog = new THREE.FogExp2(0x06060a, .035);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 7, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x67e8f9, 1.4); rim.position.set(-6, 2, -6); scene.add(rim);
  const fill = new THREE.HemisphereLight(0x9aa6ff, 0x0a0a12, .35); scene.add(fill);

  // ---------------------------------------------------------------- tablet
  const tablet = new THREE.Group(); scene.add(tablet);
  const TW = 3.3, TH = 2.07, TD = .056, BEZ = .075, SW = TW - 2 * BEZ, SH = TH - 2 * BEZ, CR = .13;
  const rrShape = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const planeUV = (geo, w, h) => { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return geo; };
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3b40, metalness: 1, roughness: .36 });
  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(TW - .012, TH - .012, CR), { depth: TD, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 4, curveSegments: 32 });
  bodyGeo.translate(0, 0, -TD / 2);
  const FRONT = TD / 2 + .006;
  tablet.add(new THREE.Mesh(bodyGeo, bodyMat));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(TW - .016, TH - .016, CR - .008), 32), new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: .12, metalness: .1 }));
  glass.position.z = FRONT + .001; tablet.add(glass);
  const scrCanvas = document.createElement('canvas'); scrCanvas.width = { high: 2560, mid: 2048, low: 1536 }[tier]; scrCanvas.height = Math.round(scrCanvas.width * SH / SW);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = maxAniso;
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const screen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(SW, SH, .05), 24), SW, SH), scrMat); screen.position.z = FRONT + .004; tablet.add(screen);
  const camDot = new THREE.Mesh(new THREE.CircleGeometry(.012, 24), new THREE.MeshStandardMaterial({ color: 0x0b0d16, roughness: .2 }));
  camDot.position.set(0, TH / 2 - BEZ / 2, FRONT + .004); tablet.add(camDot);
  const sheenC = document.createElement('canvas'); sheenC.width = 512; sheenC.height = 512; { const c = sheenC.getContext('2d'), g = c.createLinearGradient(0, 0, 512, 512); g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(.42, 'rgba(255,255,255,.5)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 512, 512); }
  const sheen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(SW, SH, .05), 24), SW, SH), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sheenC), transparent: true, opacity: .025, blending: THREE.AdditiveBlending, depthWrite: false }));
  sheen.position.z = FRONT + .007; tablet.add(sheen);
  // The screen UI is painted once per language. Uploading a 2D canvas to WebGL costs ~90 ms, so nothing on the
  // screen texture changes while scrolling; the pen's ink is a ribbon mesh revealed with a draw range.
  let screenInfo = null, screenLang = '';
  function paintScreen() {
    if (screenLang === getLang()) return;
    const ctx = scrCanvas.getContext('2d'); ctx.clearRect(0, 0, scrCanvas.width, scrCanvas.height);
    screenInfo = drawScreen(ctx, scrCanvas.width, scrCanvas.height, getLang(), 0, 'light');
    screenLang = getLang();
    scrTex.needsUpdate = true;
  }
  const scrToLocal = (px, py) => V((px / scrCanvas.width - .5) * SW, (.5 - py / scrCanvas.height) * SH, FRONT + .008);
  // ink: the pen underlines the concept card's title and adds a small star — short strokes, like marking a book
  const VH = 1600 * scrCanvas.height / scrCanvas.width;
  const toLocal = (x, y) => [(x / 1600 - .5) * SW, (.5 - y / VH) * SH];
  const STROKES = [];
  { const pts = []; for (let i = 0; i < 46; i++) { const t = i / 45; pts.push([1268 + t * 178, 249 - t * 4 - Math.sin(t * Math.PI) * 2.5, .3 + .7 * Math.sin(Math.PI * Math.min(1, t * 1.12))]); } STROKES.push(pts); }
  { const cx = 1484, cy = 222, R = 15, v = [0, 2, 4, 1, 3, 0].map(k => [cx + Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 5) * R, cy + Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 5) * R]);
    const pts = []; for (let e = 0; e < 5; e++) for (let i = 0; i < 9; i++) { const t = i / 9; pts.push([v[e][0] + (v[e + 1][0] - v[e][0]) * t, v[e][1] + (v[e + 1][1] - v[e][1]) * t, .75]); }
    pts.push([...v[5], .5]); pts.forEach((p, i) => { p[2] *= .45 + .55 * Math.sin(Math.PI * Math.min(1, (i + 1) / pts.length * 1.05)); }); STROKES.push(pts); }
  const LIFT = 10, inkPos = [], inkIdx = [], timeline = [];
  let vbase = 0;
  STROKES.forEach((pts, si) => {
    if (si > 0) for (let k = 1; k <= LIFT; k++) timeline.push({ lift: k / (LIFT + 1), a: STROKES[si - 1].at(-1), b: pts[0], count: inkIdx.length });
    pts.forEach((p, i) => {
      const [x, y] = toLocal(p[0], p[1]), w = (1.4 + p[2] * 3.2) * SW / 1600;
      const pa = toLocal(...pts[Math.max(0, i - 1)]), pb = toLocal(...pts[Math.min(pts.length - 1, i + 1)]);
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      inkPos.push(x - ty * w / 2, y + tx * w / 2, 0, x + ty * w / 2, y - tx * w / 2, 0);
      if (i > 0) { const o = vbase + (i - 1) * 2; inkIdx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      timeline.push({ p, count: inkIdx.length });
    });
    vbase += pts.length * 2;
  });
  const inkGeo = new THREE.BufferGeometry(); inkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(inkPos), 3)); inkGeo.setIndex(inkIdx); inkGeo.setDrawRange(0, 0);
  const inkMesh = new THREE.Mesh(inkGeo, new THREE.MeshBasicMaterial({ color: 0x1E1B4B, transparent: true, opacity: .94, toneMapped: false, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  inkMesh.position.z = FRONT + .0045; inkMesh.renderOrder = 2; tablet.add(inkMesh);
  const PEN_Z = FRONT + .008;
  const inkStart = V(...toLocal(STROKES[0][0][0], STROKES[0][0][1]), PEN_Z), inkEnd = V(...toLocal(...STROKES.at(-1).at(-1).slice(0, 2)), PEN_Z);
  let inkTip = null;
  function setInk(ink) {
    const n = Math.floor(timeline.length * Math.min(1, ink));
    const e = n > 0 ? timeline[n - 1] : null;
    inkGeo.setDrawRange(0, e ? e.count : 0);
    if (!e || ink >= 1) { inkTip = null; return; }
    if (e.lift) { const a = toLocal(e.a[0], e.a[1]), b = toLocal(e.b[0], e.b[1]); inkTip = V(a[0] + (b[0] - a[0]) * e.lift, a[1] + (b[1] - a[1]) * e.lift, PEN_Z + Math.sin(Math.PI * e.lift) * .035); }
    else inkTip = V(...toLocal(e.p[0], e.p[1]), PEN_Z);
  }

  // stylus — S Pen–like: slim, matte
  const stylus = new THREE.Group(); scene.add(stylus);
  const penMat = new THREE.MeshStandardMaterial({ color: 0x5a5b60, roughness: .62, metalness: .25 });
  const nibMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: .7 });
  const L = 1.42;
  const addPen = (geo, mat, y, x = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); stylus.add(m); };
  addPen(new THREE.CylinderGeometry(.027, .027, L, 40, 1), penMat, L / 2 + .11);
  addPen(new THREE.CylinderGeometry(.024, .027, .012, 40, 1), penMat, L + .116);
  addPen(new THREE.CylinderGeometry(.027, .008, .1, 40, 1), penMat, .06);
  addPen(new THREE.CylinderGeometry(.008, .003, .022, 16, 1), nibMat, .011);
  addPen(new THREE.BoxGeometry(.01, .1, .006), penMat, .42, 0, .027);

  // ---------------------------------------------------------------- fragments
  // ordered so the low and mid tiers (the first 12 / 20) still get a varied mix; with each kind's variants counted
  // in order, no two fragments carry the same content. Variant 0 of quote and flash belongs to the hero cards.
  const KINDS = ['page', 'quote', 'page', 'video', 'concept', 'page', 'flash', 'note', 'page', 'quote', 'concept', 'page', 'video', 'flash', 'page', 'note', 'quote', 'page', 'concept', 'video', 'page', 'flash', 'note', 'quote', 'concept', 'video'];
  const FIRST = { quote: 1, flash: 1 };
  const backMat = new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: .95 });
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.filter = 'blur(14px)'; x.fillStyle = '#000'; x.fillRect(30, 30, 68, 68); const t = new THREE.CanvasTexture(c); return t; })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: .3, depthWrite: false, toneMapped: false });
  // a card is a front plane (its texture) and a back plane; two draw calls instead of six
  const rrGeos = new Map();
  const rrGeo = (w, h) => { const k = `${w.toFixed(3)}x${h.toFixed(3)}`; if (!rrGeos.has(k)) rrGeos.set(k, planeUV(new THREE.ShapeGeometry(rrShape(w, h, Math.min(w, h) * .045), 6), w, h)); return rrGeos.get(k); };
  function cardMesh(w, h, mat) {
    const g = new THREE.Group();
    const geo = rrGeo(w, h);
    const front = new THREE.Mesh(geo, mat); g.add(front);
    const back = new THREE.Mesh(geo, backMat); back.rotation.y = Math.PI; back.position.z = -.002; g.add(back);
    const sh = new THREE.Mesh(planeGeo, shadowMat); sh.scale.set(w * 1.9, h * 1.75, 1); sh.position.set(w * .03, -h * .06, -.06); sh.renderOrder = -1; g.add(sh);
    return g;
  }
  // cheap depth of field: sample the card texture from a blurrier mip level the further it is from focus
  const blurHook = function (shader) {
    shader.uniforms.uBias = this.userData.bias;
    shader.fragmentShader = 'uniform float uBias;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n  vec4 sampledDiffuseColor = texture2D( map, vMapUv, uBias );\n  diffuseColor *= sampledDiffuseColor;\n#endif')
      .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n  vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv, uBias );\n  totalEmissiveRadiance *= emissiveColor.rgb;\n#endif');
  };
  const blurMat = params => { const m = new THREE.MeshStandardMaterial(params); m.userData.bias = { value: 0 }; m.onBeforeCompile = blurHook; return m; };
  const texCache = new Map();
  const texSize = tier === 'low' ? .6 : 1;
  function fragTexture(kind, i) {
    const k = `${kind}|${i}|${getLang()}`;
    if (texCache.has(k)) return texCache.get(k);
    const c = kind === 'page' ? makePage(i, getLang(), 100 + i) : makeCard(kind, getLang(), 200 + i, i);
    let src = c;
    if (texSize < 1) { const s = new OffscreenCanvas(Math.round(c.width * texSize), Math.round(c.height * texSize)); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); src = s; }
    const t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); texCache.set(k, t); return t;
  }
  // Everything above needs no fonts. While the text faces are still downloading, draw each material once off
  // screen: ANGLE compiles the real GPU program on the first draw, which is the slowest step of the boot.
  {
    const dummy = new THREE.CanvasTexture(document.createElement('canvas')); dummy.colorSpace = THREE.SRGBColorSpace;
    const pre = new THREE.Scene(); pre.environment = scene.environment; pre.fog = scene.fog; pre.background = scene.background;
    scene.children.filter(o => o.isLight).forEach(l => pre.add(l.clone()));
    [blurMat({ map: dummy, roughness: .9, metalness: 0, emissive: 0xffffff, emissiveMap: dummy, emissiveIntensity: .2 }),
     blurMat({ map: dummy, roughness: .8, emissive: 0xffffff, emissiveMap: dummy, emissiveIntensity: .4, toneMapped: false }),
     backMat, shadowMat, bodyMat, penMat, scrMat].forEach((m, i) => { const q = new THREE.Mesh(planeGeo, m); q.position.set(i * .1, 0, -2); q.frustumCulled = false; pre.add(q); });
    pre.add(tablet.clone()); pre.add(stylus.clone());
    camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    await renderer.compileAsync(pre, camera);
    renderer.setRenderTarget(null); renderer.render(pre, camera);
    await yieldTask();
  }
  await fontsReady;

  const N = { high: 26, mid: 20, low: 12 }[tier];
  const frags = [];
  const R0 = rng(7);
  const seen = {};
  for (let i = 0; i < N; i++) {
    const kind = KINDS[i % KINDS.length], variant = (seen[kind] = (seen[kind] ?? (FIRST[kind] || 0) - 1) + 1) % (VARIANTS[kind] || 1);
    if (!texCache.has(`${kind}|${variant}|${getLang()}`)) await yieldTask();
    const tex = fragTexture(kind, variant);
    const w = kind === 'page' ? .78 : .84, h = w * tex.image.height / tex.image.width;
    const mat = blurMat({ map: tex, roughness: .9, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .2 });
    const m = cardMesh(w, h, mat);
    m.scale.setScalar(.7 + R0() * .4);
    frags.push({ m, kind, variant, mat, w, h, s0: m.scale.x, base: V(0, 0, 0), rot: new THREE.Euler((R0() - .5) * 1.0, (R0() - .5) * 1.4, (R0() - .5) * .7), phase: R0() * 6.28, speed: .15 + R0() * .2, graph: V(0, 0, 0) });
    scene.add(m);
  }
  const LINKED = [
    ['ink', V(-1.32, 1.4, .55), new THREE.Euler(.06, .2, .05), 'hl', V(-.12, -.24, 0), 1],
    ['cover', V(1.22, 1.5, .6), new THREE.Euler(.04, -.1, -.06), [1500, 200], V(.1, -.24, 0), -1],
    ['flash', V(2.12, -.78, .55), new THREE.Euler(-.05, -.25, .04), [1420, 640], V(-.36, -.04, 0), -1],
  ];
  const linkedCards = LINKED.map(([kind, local, tilt, src, anchor, bow], j) => {
    const tex = fragTexture(kind, 0), w = .78, h = w * tex.image.height / tex.image.width;
    const mat = blurMat({ map: tex, roughness: .85, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12 });
    const m = cardMesh(w, h, mat);
    const f = { m, kind, variant: 0, mat, w, h, s0: 1, local, tilt, base: V(0, 0, 0), rot: new THREE.Euler(), phase: j * 2, speed: .25, graph: V(0, 0, 0), linked: true, src, anchor, bow };
    frags.push(f); scene.add(m); return f;
  });
  const liftTex = fragTexture('quote', 0);
  const liftMat = blurMat({ map: liftTex, roughness: .8, emissive: 0xffffff, emissiveMap: liftTex, emissiveIntensity: .42, toneMapped: false }); // untonemapped like the screen, so the paper stays as white as it
  const lift = cardMesh(1.15, 1.15 * liftTex.image.height / liftTex.image.width, liftMat);
  scene.add(lift);
  function refreshTextures() {
    texCache.clear();
    frags.forEach(f => { const tx = fragTexture(f.kind, f.variant); f.mat.map = tx; f.mat.emissiveMap = tx; f.mat.needsUpdate = true; });
    liftMat.map = liftMat.emissiveMap = fragTexture('quote', 0); liftMat.needsUpdate = true;
    paintScreen();
  }

  // ---------------------------------------------------------------- layout (landscape vs portrait)
  // Cards must never pass through each other: any two whose extents overlap while sitting at nearly the same depth
  // are pushed apart along the axis that needs the smallest move (usually depth, so the layout barely changes).
  function separate(items, depth) {
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const A = items[i], B = items[j];
        if (A.fixed && B.fixed) continue;
        const dx = B.p.x - A.p.x, dy = B.p.y - A.p.y, dz = B.p.z - A.p.z;
        const ox = (A.w + B.w) / 2 + .05 - Math.abs(dx), oy = (A.h + B.h) / 2 + .05 - Math.abs(dy), oz = depth - Math.abs(dz);
        if (ox <= 0 || oy <= 0 || oz <= 0) continue;
        const m = Math.min(ox, oy, oz), axis = m === oz ? 'z' : m === ox ? 'x' : 'y';
        const sign = (axis === 'z' ? dz : axis === 'x' ? dx : dy) >= 0 ? 1 : -1, share = A.fixed || B.fixed ? 1 : .5;
        if (!A.fixed) A.p[axis] -= sign * (m + .01) * share;
        if (!B.fixed) B.p[axis] += sign * (m + .01) * share;
        moved = true;
      }
      if (!moved) break;
    }
  }
  const LY = {};
  const hubTargets = [];
  const heroCam = new THREE.PerspectiveCamera(20, 1, .1, 120);
  function layout() {
    const aspect = innerWidth / innerHeight, portrait = aspect < .95;
    LY.portrait = portrait;
    if (!portrait) {
      LY.TPOS = V(1.95, -.18, 0); LY.TROT = new THREE.Euler(-.2, -.3, 0);
      LY.P0 = { pos: V(-.7, 1.7, 12.6), look: V(1.05, -.12, 0), fov: 20 };
      LY.P3 = { pos: V(.85, 4.1, 21), look: V(1.2, 1.15, -2), fov: 28 };
      LY.look1 = V(-1.6, -.45, 0); LY.d1 = 7.9; LY.look2 = V(-.62, -.1, 0); LY.d2 = 5.6;
      LY.hub = V(1.25, 1.65, -3.4); LY.textZone = (sx, sy) => sx < .47 && sy > .3;
    } else {
      const H = 4.6 / aspect, d = H / (2 * Math.tan(THREE.MathUtils.degToRad(13)));
      LY.TPOS = V(.25, .7, 0); LY.TROT = new THREE.Euler(-.18, -.22, 0);
      LY.P0 = { pos: V(-.3, 1.6, d), look: V(.25, -.95 * H / 4.6 + .1, 0), fov: 26 };
      LY.P3 = { pos: V(.2, 3.2, 30 + 6 / aspect), look: V(.2, 1.4, -2), fov: 30 };
      LY.look1 = V(0, -1.5, 0); LY.d1 = 8.6; LY.look2 = V(0, -1.25, 0); LY.d2 = 8.2;
      LY.hub = V(.2, 2.2, -3.4); LY.textZone = (sx, sy) => sy > .52;
    }
    heroCam.aspect = aspect; heroCam.fov = LY.P0.fov; heroCam.position.copy(LY.P0.pos); heroCam.lookAt(LY.P0.look); heroCam.updateProjectionMatrix(); heroCam.updateMatrixWorld();
    tablet.position.copy(LY.TPOS); tablet.rotation.copy(LY.TROT); tablet.scale.setScalar(1); tablet.updateMatrixWorld(true);
    // linked cards hang off the tablet
    linkedCards.forEach(f => { f.base.copy(tablet.localToWorld(f.local.clone())); f.rot.set(LY.TROT.x + f.tilt.x, LY.TROT.y + f.tilt.y, f.tilt.z); });
    // loose fragments: keep clear of the copy, the nav, the tablet and the linked cards
    const R = rng(7), RL = rng(91);
    const ok = q => {
      const sp = q.clone().project(heroCam), sx = (sp.x + 1) / 2, sy = (1 - sp.y) / 2;
      if (Math.abs(sp.x) > 1.12 || Math.abs(sp.y) > 1.12) return false;
      if (LY.textZone(sx, sy) || (sy < .13 && (sx < .16 || (sx > .25 && sx < .75)))) return false;
      const tp = LY.TPOS.clone().project(heroCam);
      if (q.z > -2 && Math.abs(sp.x - tp.x) < (portrait ? .95 : .55) && Math.abs(sp.y - tp.y) < (portrait ? .32 : .72)) return false;
      if (linkedCards.some(c => { const cp = c.base.clone().project(heroCam); return Math.hypot((sp.x - cp.x) * aspect, sp.y - cp.y) < .5; })) return false;
      return true;
    };
    frags.forEach(f => {
      if (f.linked) return;
      let q = null;
      for (let k = 0; k < 400 && !q; k++) { const c = V(-6.5 + R() * 14.5, -4 + R() * 8.5, -10 + R() * 11.5); if (ok(c)) q = c; }
      f.base.copy(q || V(-4 + RL() * 10, -3 + RL() * 6, -12));
    });
    separate(frags.map(f => ({ p: f.base, w: f.w * f.s0, h: f.h * f.s0, fixed: !!f.linked })), .72);
    // constellation: a loose spiral around the hub
    const RG = rng(31);
    frags.forEach((f, i) => {
      const a = i * 2.39996 + RG() * .6, r = 2.4 + Math.sqrt((i + .5) / frags.length) * 3.6 + RG() * .5;
      const sx = portrait ? .62 : 1.4, sy = portrait ? 1.25 : .55;
      f.graph.set(LY.hub.x + Math.cos(a) * r * sx, LY.hub.y + Math.sin(a) * r * sy, LY.hub.z + (RG() - .5) * 3.0);
    });
    separate(frags.map(f => ({ p: f.graph, w: f.w * f.s0 * 1.38, h: f.h * f.s0 * 1.38 })).concat([{ p: LY.hub.clone(), w: TW * .75 + .1, h: TH * .75 + .1, fixed: true }]), .5);
    // hub threads fan out evenly as seen from the constellation camera: for each direction, the card nearest an
    // ideal point on a ring around the tablet (straight down is left to the headline)
    const cam3 = new THREE.PerspectiveCamera(LY.P3.fov, aspect, .1, 120);
    cam3.position.copy(LY.P3.pos); cam3.lookAt(LY.P3.look); cam3.updateMatrixWorld(); cam3.updateProjectionMatrix();
    const scr = v => { const q = v.clone().project(cam3); return [q.x * aspect, q.y]; };
    const hs = scr(LY.hub), fs = frags.map(f => scr(f.graph));
    hubTargets.length = 0;
    [0, 40, 90, 140, 180, 220, 320].forEach(deg => {
      const ix = hs[0] + Math.cos(deg * Math.PI / 180) * (portrait ? .42 : .62), iy = hs[1] + Math.sin(deg * Math.PI / 180) * (portrait ? .5 : .5);
      let best = null, bd = 1e9;
      frags.forEach((f, i) => { if (hubTargets.includes(f)) return; const d = Math.hypot(fs[i][0] - ix, fs[i][1] - iy) + Math.abs(f.graph.z - LY.hub.z) * .03; if (d < bd) { bd = d; best = f; } });
      if (best) hubTargets.push(best);
    });
    graphEdges.length = 0;
    frags.forEach((f, i) => { let best = -1, bd = 1e9; frags.forEach((g, j) => { if (j === i) return; const dd = f.graph.distanceTo(g.graph); if (dd < bd && !graphEdges.some(e => e[0] === j && e[1] === i)) { bd = dd; best = j; } }); if (best >= 0) graphEdges.push([i, best]); });
  }

  // ---------------------------------------------------------------- threads
  const lineMats = [];
  const lineScene = new THREE.Scene();
  const haloMats = [];
  function makeLine(width = .9, halo = false) {
    const g = new LineGeometry(); g.setPositions(new Array(24 * 3).fill(0));
    const mat = new LineMaterial({ color: 0x22d3ee, linewidth: width, transparent: true, opacity: 0, worldUnits: false, toneMapped: false, depthTest: true, depthWrite: false });
    mat.resolution.set(innerWidth, innerHeight); lineMats.push(mat);
    const l = new Line2(g, mat); l.frustumCulled = false; lineScene.add(l);
    l.userData.buf = g.attributes.instanceStart.data; // reused every frame: setPositions() would allocate a new GPU buffer
    if (halo) { // same geometry, wider and additive: the glow that bloom used to add
      const hm = new LineMaterial({ color: 0x22d3ee, linewidth: width * 2.6, transparent: true, opacity: 0, worldUnits: false, toneMapped: false, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending });
      hm.resolution.set(innerWidth, innerHeight); haloMats.push(hm);
      const h = new Line2(g, hm); h.frustumCulled = false; h.renderOrder = -.5; lineScene.add(h); l.userData.halo = h;
    }
    return l;
  }
  const heroLinks = [0, 1, 2].map(() => makeLine(1.6, true));
  const graphEdges = [];
  const graphLines = frags.map(() => makeLine());
  const hubLines = [0, 1, 2, 3, 4, 5, 6].map(() => makeLine(.9, true));
  const pulseGeo = new THREE.SphereGeometry(.022, 12, 8);
  const pulseColor = new THREE.Color(2.2, 4.5, 5);
  const pulseHaloMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false, transparent: true, opacity: 0, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pulseHaloMats = [];
  const pulses = heroLinks.concat(hubLines).map((_, i) => {
    const s = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: pulseColor, toneMapped: false, transparent: true, depthTest: true, depthWrite: false }));
    const hm = pulseHaloMat.clone(); pulseHaloMats.push(hm);
    const h = new THREE.Mesh(pulseGeo, hm); h.scale.setScalar(2.6); s.add(h); s.userData.halo = h;
    s.scale.setScalar(1.35);
    s.userData.ph = i * .37 % 1; lineScene.add(s); return s;
  });
  const tA = V(0, 0, 0), tC = V(0, 0, 0);
  const PTS = new Float32Array(24 * 3);
  function arc(line, a, b, lift, opacity, pulse, t, ctrl) {
    line.visible = opacity > .01;
    if (line.userData.halo) line.userData.halo.visible = line.visible && T.k > .02;
    if (pulse) pulse.visible = line.visible;
    if (!line.visible) return;
    tC.copy(a).lerp(b, .5); if (ctrl) tC.add(ctrl); else { tC.y += lift; tC.z += lift * .6; }
    for (let i = 0; i < 24; i++) { const u = i / 23, v = 1 - u, j = i * 3; PTS[j] = v * v * a.x + 2 * v * u * tC.x + u * u * b.x; PTS[j + 1] = v * v * a.y + 2 * v * u * tC.y + u * u * b.y; PTS[j + 2] = v * v * a.z + 2 * v * u * tC.z + u * u * b.z; }
    const buf = line.userData.buf, arr = buf.array;
    for (let i = 0; i < 23; i++) { const o = i * 6, j = i * 3; arr[o] = PTS[j]; arr[o + 1] = PTS[j + 1]; arr[o + 2] = PTS[j + 2]; arr[o + 3] = PTS[j + 3]; arr[o + 4] = PTS[j + 4]; arr[o + 5] = PTS[j + 5]; }
    buf.needsUpdate = true;
    line.material.opacity = Math.min(1, opacity * (1 + (1 - T.k) * 1.4));
    if (line.userData.halo) line.userData.halo.material.opacity = opacity * .07 * T.k;
    if (pulse) { const u = (t * .35 + pulse.userData.ph) % 1, v = 1 - u; pulse.position.set(v * v * a.x + 2 * v * u * tC.x + u * u * b.x, v * v * a.y + 2 * v * u * tC.y + u * u * b.y, v * v * a.z + 2 * v * u * tC.z + u * u * b.z); pulse.material.opacity = opacity * Math.sin(u * Math.PI); pulse.userData.halo.material.opacity = pulse.material.opacity * (.35 * T.k + .28 * (1 - T.k)); pulse.visible = opacity > .01; }
  }

  // ---------------------------------------------------------------- render
  // The scene is drawn, depth is cleared, then the threads are drawn on top. Only the stylus occludes them, through
  // a depth-only copy in the line scene that writes the nearest possible depth.
  const occMat = new THREE.ShaderMaterial({
    colorWrite: false,
    vertexShader: 'void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); p.z = -p.w * .999; gl_Position = p; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.); }',
  });
  const stylusOcc = new THREE.Group();
  stylus.children.forEach(c => { const m = new THREE.Mesh(c.geometry, occMat); m.position.copy(c.position); m.renderOrder = -1; stylusOcc.add(m); });
  lineScene.add(stylusOcc);
  function render() {
    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(lineScene, camera); // depth kept: cards in front hide the threads behind them
  }

  // ---------------------------------------------------------------- theme
  const T = { k: isDark() ? 1 : 0 };
  function applyTheme(k) {
    T.k = k;
    paintBackground(k);
    scene.fog.color.setRGB(.9 * (1 - k) + .024 * k, .9 * (1 - k) + .024 * k, .91 * (1 - k) + .04 * k);
    scene.fog.density = .004 + k * .034;
    scene.environmentIntensity = .55 - k * .35;
    key.intensity = 2.6 - k * 1.2; rim.intensity = .25 + k * .95; fill.intensity = .75 - k * .6;
    shadowMat.opacity = .26 + k * .2;
    pulseHaloMats.forEach(m => { m.blending = k > .5 ? THREE.AdditiveBlending : THREE.NormalBlending; m.color.set(k > .5 ? 0x22d3ee : 0x2563eb); m.needsUpdate = true; });
    bodyMat.color.setRGB(.8 - k * .56, .81 - k * .56, .83 - k * .55);
    penMat.color.setRGB(.82 - k * .5, .82 - k * .5, .84 - k * .5);
    pulseColor.setRGB(.07 + k * 2.1, .3 + k * 4.2, .92 + k * 4.1);
    linkedCards.forEach(f => { f.mat.emissiveIntensity = .18 + k * .0; });
    frags.forEach(f => { if (!f.linked) f.mat.emissiveIntensity = .2 - k * .05; });
    heroLinks.forEach(l => { l.material.linewidth = 2.1 - k * .5; });
    lineMats.forEach(m => m.color.setRGB(.11 + .02 * k, .3 + .53 * k, .85 + .08 * k).multiplyScalar(1 + k * .25));
    haloMats.forEach(m => m.color.setRGB(.13, .83, .93));
    backMat.color.setRGB(.94 - k * .1, .92 - k * .1, .87 - k * .1);
    liftMat.emissiveIntensity = .3 + k * .32; // the lifted excerpt is the subject: at least as bright as the screen it came from
    renderer.toneMappingExposure = 1.0 - k * .08;
  }

  // ---------------------------------------------------------------- frame
  const S = { p: 0, target: 0, intro: reduceMotion ? 1 : 0, mode: 'story', joinK: 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0), qWorld = new THREE.Quaternion(), qFace = new THREE.Quaternion();
  let onStory = null;

  const PROF = DBG0.has('prof') ? (window.__ft = []) : null;
  // the point on a card's border facing `toward`, so threads join cards edge to edge instead of crossing their faces
  const eA = V(0, 0, 0), eB = V(0, 0, 0), eT = V(0, 0, 0);
  function edgeOf(f, toward, out) {
    const lp = f.m.worldToLocal(eT.copy(toward));
    const k = 1 / Math.max(Math.abs(lp.x) / (f.w / 2), Math.abs(lp.y) / (f.h / 2), 1e-3);
    return f.m.localToWorld(out.set(lp.x * k, lp.y * k, 0)).clone();
  }
  const camWorld = V(0, 0, 0), tmpW = V(0, 0, 0);
  function frame(t, p) {
    const _t0 = performance.now();
    const ink = smooth(seg(p, .16, .33));
    setInk(ink);
    const _t1 = performance.now();
    // pose the tablet first (it moves into the constellation hub at the end)
    const hubK = ease(seg(p, .7, .97));
    tablet.position.set(LY.TPOS.x + (LY.hub.x - LY.TPOS.x) * hubK, LY.TPOS.y + (LY.hub.y - LY.TPOS.y) * hubK + (reduceMotion ? 0 : Math.sin(t * .5) * .03), LY.hub.z * hubK);
    tablet.rotation.set(LY.TROT.x * (1 - hubK) - .1 * hubK, LY.TROT.y * (1 - hubK) - .05 * hubK, reduceMotion ? 0 : Math.sin(t * .37) * .006);
    tablet.scale.setScalar(1 - hubK * .25);
    tablet.updateMatrixWorld(true);
    const normal = V(0, 0, 1).applyQuaternion(tablet.getWorldQuaternion(qWorld));
    const circleC = tablet.localToWorld(scrToLocal(SCREEN.concept[0] * screenInfo.scale, SCREEN.concept[1] * screenInfo.scale));
    const hlB = screenInfo.hl[0], hlPt = tablet.localToWorld(scrToLocal(hlB[0] + hlB[2] * .5, hlB[1] + hlB[3] * .9));

    // camera
    const P1 = { pos: circleC.clone().addScaledVector(normal, LY.d1).add(V(.1, .5, .2)), look: circleC.clone().add(LY.look1), fov: LY.portrait ? 30 : 22 };
    const cardEnd = hlPt.clone().addScaledVector(normal, 1.7).add(V(-.2, .35, .25));
    const P2 = { pos: cardEnd.clone().add(V(LY.portrait ? -.4 : -1.2, .3, LY.d2)), look: cardEnd.clone().add(LY.look2), fov: LY.portrait ? 32 : 24 };
    const P0 = { pos: LY.P0.pos.clone().add(LY.P0.pos.clone().sub(LY.P0.look).multiplyScalar((1 - smooth(S.intro)) * .18)), look: LY.P0.look, fov: LY.P0.fov };
    const keys = [[0, P0], [.3, P1], [.36, P1], [.6, P2], [.68, P2], [1, LY.P3]];
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i][0] && p <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
    const u = ease(seg(p, a[0], b[0]));
    camPos.lerpVectors(a[1].pos, b[1].pos, u); camLook.lerpVectors(a[1].look, b[1].look, u);
    camera.fov = a[1].fov + (b[1].fov - a[1].fov) * u;
    // join bookend: a slow orbit around the constellation
    if (S.joinK > 0) {
      // a slow sway that always stays in front of the constellation (behind it, the cards show their rim-lit backs)
      const r = LY.P3.pos.z - LY.P3.look.z;
      tA.set(LY.P3.pos.x + Math.sin(t * .09) * r * .12, LY.P3.pos.y + .4 + Math.sin(t * .07) * .5, LY.P3.look.z + r * (.9 + .04 * Math.cos(t * .05)));
      camPos.lerp(tA, S.joinK);
    }
    if (!reduceMotion) {
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
      camPos.x += Math.sin(t * .13) * .1 + mouse.x * .6; camPos.y += Math.cos(t * .11) * .06 - mouse.y * .4;
    }
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateProjectionMatrix();
    const focusDist = camera.position.distanceTo(p < .42 ? (p < .3 ? tablet.position : circleC) : (p < .72 ? lift.position : tablet.position));
    const dofK = tier === 'low' ? 0 : (1 - seg(p, .66, .8)); // the constellation is shown sharp

    // stylus
    const tipLocal = inkTip ? inkTip.clone() : (ink >= 1 ? inkEnd.clone() : inkStart.clone());
    if (!inkTip) tipLocal.z += ink >= 1 ? .03 + seg(p, .33, .4) * .1 : .025 + (1 - seg(p, .1, .16)) * .1;
    stylus.position.copy(tablet.localToWorld(tipLocal));
    stylus.quaternion.setFromUnitVectors(V(0, 1, 0), V(.62, .28, .73).normalize().applyQuaternion(qWorld));
    const showPen = 1 - seg(p, .4, .5);
    stylus.visible = showPen > .01; stylus.scale.setScalar(.999 * showPen + .001);
    stylusOcc.position.copy(stylus.position); stylusOcc.quaternion.copy(stylus.quaternion); stylusOcc.scale.copy(stylus.scale); stylusOcc.visible = stylus.visible;

    // lifted card
    const lu = ease(seg(p, .4, .62));
    lift.position.lerpVectors(hlPt.clone().addScaledVector(normal, .02), cardEnd, lu);
    lift.position.y += Math.sin(lu * Math.PI) * .25;
    qFace.copy(camera.quaternion);
    lift.quaternion.copy(qWorld).slerp(qFace, lu * .85);
    if (!reduceMotion) lift.rotateZ(Math.sin(t * .6) * .02 * lu);
    lift.scale.setScalar(.25 + .75 * smooth(seg(p, .4, .52)));
    lift.visible = p > .4;
    const toGraph = ease(seg(p, .7, .95));
    if (toGraph > 0) { tA.set(LY.hub.x - 2.85, LY.hub.y + .55, LY.hub.z + 1.2); lift.position.lerp(tA, toGraph); }

    // fragments
    frags.forEach((f, i) => {
      const d = reduceMotion ? 0 : Math.sin(t * f.speed + f.phase);
      tA.copy(f.base); tA.y += d * .12; tA.x += reduceMotion ? 0 : Math.cos(t * f.speed * .7 + f.phase) * .06;
      f.m.position.lerpVectors(tA, f.graph, toGraph);
      f.m.rotation.set(f.rot.x * (1 - toGraph) + d * .04, f.rot.y * (1 - toGraph) + (reduceMotion ? 0 : Math.sin(t * .2 + i) * .05), f.rot.z * (1 - toGraph * .8));
      if (toGraph > 0) f.m.quaternion.slerp(camera.quaternion, toGraph * .8);
      f.m.scale.setScalar(f.s0 * (1 + toGraph * .38)); // cards grow a little in the constellation so they stay readable
      f.m.updateMatrixWorld();
      f.mat.userData.bias.value = Math.min(3.2, Math.max(0, Math.abs(camera.position.distanceTo(f.m.position) - focusDist) * .34 - .35)) * dofK;
    });

    // threads
    const heroOn = (1 - seg(p, .08, .2)) * smooth(S.intro);
    const camFwd = V(0, 0, -1).applyQuaternion(camera.quaternion);
    linkedCards.forEach((f, i) => {
      const reveal = smooth(clamp(S.intro * 3 - i * .55));
      const a0 = f.src === 'hl' ? tablet.localToWorld(scrToLocal(hlB[0] + 4, hlB[1] + hlB[3] * .55)) : tablet.localToWorld(scrToLocal(f.src[0] * screenInfo.scale, f.src[1] * screenInfo.scale));
      a0.addScaledVector(normal, .02);
      const b0 = f.anchor.clone().applyQuaternion(f.m.quaternion).add(f.m.position);
      const dv = V(0, 0, 0).subVectors(b0, a0), len = dv.length();
      const ctrl = V(0, 0, 0).crossVectors(camFwd, dv).normalize().multiplyScalar(-f.bow * len * .42).addScaledVector(normal, .22);
      b0.lerpVectors(a0, b0, reveal); // draw out from the screen
      arc(heroLinks[i], a0, b0, 0, heroOn * .95 * (reveal > .02 ? 1 : 0), pulses[i], t, ctrl.multiplyScalar(reveal));
    });
    const g = smooth(seg(p, .78, .98));
    graphLines.forEach((l, i) => { const e = graphEdges[i]; if (!e || g <= 0) { l.visible = false; return; } const A = frags[e[0]], B = frags[e[1]]; arc(l, edgeOf(A, B.m.position, eA), edgeOf(B, A.m.position, eB), .08, g * (.3 + (i % 4 === 0 ? .2 : 0)), null, t); });
    hubLines.forEach((l, i) => { const f = hubTargets[i]; if (!f) { l.visible = false; if (l.userData.halo) l.userData.halo.visible = false; pulses[heroLinks.length + i].visible = false; return; } const lp = tablet.worldToLocal(f.m.position.clone()); const k2 = 1 / Math.max(Math.abs(lp.x) / (TW / 2), Math.abs(lp.y) / (TH / 2), 1e-3); const edge = tablet.localToWorld(V(lp.x * k2, lp.y * k2, 0)); arc(l, edge, edgeOf(f, edge, eB), .3, g * .55, pulses[heroLinks.length + i], t); });
    scrMat.color.setScalar(1 - T.k * .05 - hubK * (.43 * T.k + .08 * (1 - T.k))); // in the constellation the screen settles to the cards' brightness

    const _t2 = performance.now();
    render();
    const _t3 = performance.now();
    if (onStory) onStory(p);
    if (PROF) PROF.push([+p.toFixed(3), +(_t1 - _t0).toFixed(1), +(_t2 - _t1).toFixed(1), +(_t3 - _t2).toFixed(1), 0, _t0]);
  }

  function resize() {
    const prev = LY.portrait;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    lineMats.concat(haloMats).forEach(m => m.resolution.set(innerWidth, innerHeight));
    if (prev === undefined || prev !== (innerWidth / innerHeight < .95)) layout();
    else { heroCam.aspect = innerWidth / innerHeight; heroCam.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------- loop + quality watchdog
  let running = false, raf = 0, frozen = null;
  const t0 = performance.now();
  let slow = 0, samples = 0, lastT = 0;
  const listeners = { downgrade: null };
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (frozen) return;
    const dt = lastT ? now - lastT : 16; lastT = now;
    if (samples < 150 && S.mode !== 'off') { samples++; if (dt > 34) slow++; if (samples === 150 && slow > 60 && listeners.downgrade) listeners.downgrade(); }
    if (S.mode === 'off') return;
    S.p += (S.target - S.p) * (reduceMotion ? 1 : .085);
    frame((now - t0) / 1000, S.mode === 'join' ? 1 : S.p);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }

  if (DBG0.has('prof')) window.__dbg = { scene, lineScene, tablet, stylus, frags, renderer, camera, frame, glass, screen, sheen, lift, render };
  addEventListener('resize', resize);
  paintScreen(); layout(); resize(); applyTheme(T.k); setInk(0);
  // Warm-up while the loader covers the page: draw every object once (hidden and off-screen ones included) so
  // shader compilation and texture uploads happen now. Chrome on Windows compiles shaders at the first draw,
  // so renderer.compile() alone still left 0.5–0.8 s hitches mid-scroll.
  async function warmUp() {
    // shaders compile in parallel off the main thread (KHR_parallel_shader_compile); then textures upload one per task
    const restore = [];
    [scene, lineScene].forEach(sc => sc.traverse(o => { restore.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; }));
    await renderer.compileAsync(scene, camera);
    await renderer.compileAsync(lineScene, camera);
    const textures = new Set();
    scene.traverse(o => { const m = o.material; if (!m) return; [m.map, m.emissiveMap].forEach(t => t && textures.add(t)); });
    if (scene.background) textures.add(scene.background);
    for (const t of textures) { renderer.initTexture(t); await yieldTask(); }
    inkGeo.setDrawRange(0, Infinity);
    camera.position.set(0, 0, 14); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    render();
    restore.forEach(([o, v, c]) => { o.visible = v; o.frustumCulled = c; });
    setInk(0);
  }
  await yieldTask();
  await warmUp();

  return {
    renderer,
    refreshTextures,
    applyTheme, T,
    start,
    stop() { cancelAnimationFrame(raf); running = false; },
    setStory(p) { S.target = clamp(p); },
    snap() { S.p = S.target; }, // land on the current scroll position without animating through the story
    setMode(m) { S.mode = m; canvas.style.visibility = m === 'off' ? 'hidden' : 'visible'; },
    setJoin(k) { S.joinK = clamp(k); },
    get state() { return S; },
    set onStory(fn) { onStory = fn; },
    set onDowngrade(fn) { listeners.downgrade = fn; },
    seek(p, t, intro = 1) { frozen = true; S.intro = intro; frame(t, p); },
    unfreeze() { frozen = null; },
    dispose() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
