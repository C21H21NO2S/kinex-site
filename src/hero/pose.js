// The hero's opening pose, shared by the 3D scene and by the line sketch that is drawn before the scene exists.
// Plain numbers only (no three.js), so the sketch can be placed while three.js is still downloading.

export const TABLET = { W: 3.3, H: 2.07, D: .056, BEZ: .075, CR: .13 };
TABLET.SW = TABLET.W - 2 * TABLET.BEZ;
TABLET.SH = TABLET.H - 2 * TABLET.BEZ;
TABLET.FRONT = TABLET.D / 2 + .006;

// the three cards hanging off the tablet: offset in the tablet's frame, tilt added to its rotation, size, and the
// phase of their slow float (scene.js: y += sin(t * .25 + phase) * .12, x += cos(t * .175 + phase) * .06,
// tilt += [sin(..) * .04, sin(t * .2 + phase) * .05, 0]; the sketch draws them where they are at t = 0)
export const LINKED_POSE = [
  { local: [-1.32, 1.4, .55], tilt: [.06, .2, .05], w: .78, h: .4875, phase: 0 },
  { local: [1.22, 1.5, .6], tilt: [.04, -.1, -.06], w: .78, h: .4875, phase: 2 },
  { local: [2.12, -.78, .55], tilt: [-.05, -.25, .04], w: .78, h: .4875, phase: 4 },
];

export function heroPose(aspect) {
  const portrait = aspect < .95;
  if (!portrait) return { portrait, TPOS: [1.95, -.18, 0], TROT: [-.2, -.3, 0], P0: { pos: [-.7, 1.7, 12.6], look: [1.05, -.12, 0], fov: 20 } };
  const H = 4.6 / aspect, d = H / (2 * Math.tan(13 * Math.PI / 180));
  return { portrait, TPOS: [.25, .7, 0], TROT: [-.18, -.22, 0], P0: { pos: [-.3, 1.6, d], look: [.25, -.95 * H / 4.6 + .1, 0], fov: 26 } };
}

// rotation matrix of a three.js Euler in its default 'XYZ' order (rows)
export function rotXYZ([x, y, z]) {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  return [[c * e, -c * f, d], [af + be * d, ae - bf * d, -b * c], [bf - ae * d, be + af * d, a * c]];
}
export const mul = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// a perspective camera like THREE.PerspectiveCamera after lookAt(): world point -> pixel in a W x H canvas
export function camera({ pos, look, fov }, W, H) {
  const zA = norm(sub(pos, look)), xA = norm(cross([0, 1, 0], zA)), yA = cross(zA, xA);
  const t = Math.tan(fov * Math.PI / 360), aspect = W / H;
  return p => {
    const r = sub(p, pos), vx = r[0] * xA[0] + r[1] * xA[1] + r[2] * xA[2], vy = r[0] * yA[0] + r[1] * yA[1] + r[2] * yA[2], vz = r[0] * zA[0] + r[1] * zA[1] + r[2] * zA[2];
    return [(vx / -vz / (t * aspect) + 1) / 2 * W, (1 - vy / -vz / t) / 2 * H];
  };
}

// points around a rounded rectangle centred on the origin, in its own plane
export function roundRect(w, h, r, n = 6) {
  const pts = [], cs = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  cs.forEach(([cx, cy, a0]) => { for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } });
  pts.push(pts[0]);
  return pts;
}
