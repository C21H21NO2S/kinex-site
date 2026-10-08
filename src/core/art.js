// Shared illustrations. The lecture video frame is a recorded-lecture slide — "Lecture 7 · The life of a star":
// nebula → star → red giant → white dwarf, drawn to scale-ish, with the lecturer in a corner window. It is drawn
// the same way as SVG (page sections) and on canvas (3D cards, the KineX screen). Design space: 320 × 180.

const L = {
  zh: { title: '第 7 讲 · 恒星的一生', sub: '天体物理导论', neb: '星云', star: '恒星', giant: '红巨星', wd: '白矮星' },
  en: { title: 'Lecture 7 · Life of a star', sub: 'Intro to Astrophysics', neb: 'Nebula', star: 'Star', giant: 'Red giant', wd: 'White dwarf' },
};
// x positions of the four stages and the red giant's centre (used by the hand-drawn circle)
export const SLIDE = { neb: 46, star: 100, giant: 160, wd: 214, row: 90, giantR: 21 };
const FONT = '"Noto Sans SC", Inter, sans-serif';

export function slideSVG(lang, { labels = true } = {}) {
  const t = L[lang === 'en' ? 'en' : 'zh'], S = SLIDE, y = S.row;
  const arrow = (x0, x1) => `<path d="M${x0} ${y} H${x1} M${x1 - 4} ${y - 3} L${x1} ${y} L${x1 - 4} ${y + 3}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`;
  const label = (x, s) => `<text x="${x}" y="${y + 36}" text-anchor="middle" fill="rgba(226,229,240,.62)" font-size="8.5" font-family='${FONT}'>${s}</text>`;
  return `<svg class="slide" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sl-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#181B2E"/><stop offset="1" stop-color="#0D0F1C"/></linearGradient>
      <radialGradient id="sl-neb"><stop offset="0" stop-color="#B9BEDC" stop-opacity=".55"/><stop offset=".55" stop-color="#7D84B0" stop-opacity=".22"/><stop offset="1" stop-color="#7D84B0" stop-opacity="0"/></radialGradient>
      <radialGradient id="sl-star"><stop offset="0" stop-color="#FFF8E6"/><stop offset=".65" stop-color="#F2DDA8"/><stop offset="1" stop-color="#D9B878"/></radialGradient>
      <radialGradient id="sl-giant" cx=".38" cy=".34"><stop offset="0" stop-color="#E9A27F"/><stop offset=".6" stop-color="#C8664A"/><stop offset="1" stop-color="#9C4433"/></radialGradient>
      <radialGradient id="sl-glow"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sl-bg)"/>
    <circle cx="${S.neb - 6}" cy="${y - 4}" r="17" fill="url(#sl-neb)"/><circle cx="${S.neb + 7}" cy="${y + 5}" r="13" fill="url(#sl-neb)"/>
    ${arrow(S.neb + 22, S.star - 18)}
    <circle cx="${S.star}" cy="${y}" r="20" fill="url(#sl-glow)"/><circle cx="${S.star}" cy="${y}" r="10" fill="url(#sl-star)"/>
    ${arrow(S.star + 16, S.giant - S.giantR - 6)}
    <circle cx="${S.giant}" cy="${y}" r="${S.giantR}" fill="url(#sl-giant)"/>
    ${arrow(S.giant + S.giantR + 6, S.wd - 12)}
    <circle cx="${S.wd}" cy="${y}" r="9" fill="url(#sl-glow)"/><circle cx="${S.wd}" cy="${y}" r="3.4" fill="#E8EDF7"/>
    ${labels ? `<rect x="18" y="13" width="2" height="13" rx="1" fill="#22D3EE"/><text x="25" y="24" fill="#F1F2F6" font-size="11.5" font-weight="700" font-family='${FONT}'>${t.title}</text>
    <text x="25" y="37" fill="rgba(226,229,240,.45)" font-size="7.5" font-family='${FONT}'>${t.sub}</text>
    ${label(S.neb, t.neb)}${label(S.star, t.star)}${label(S.giant, t.giant)}${label(S.wd, t.wd)}` : ''}
    <g transform="translate(250 112)">
      <rect width="56" height="44" rx="5" fill="#242838"/>
      <rect width="56" height="44" rx="5" fill="none" stroke="rgba(255,255,255,.18)"/>
      <circle cx="28" cy="18" r="7.5" fill="#6E7389"/>
      <path d="M12 44 C 12 33, 19 28, 28 28 C 37 28, 44 33, 44 44 Z" fill="#6E7389"/>
    </g>
  </svg>`;
}

// Canvas version: draws the slide into (x, y, w, h), cropping like `slice`.
export function drawSlide(ctx, x, y, w, h, lang, { labels = true, font = FONT } = {}) {
  const t = L[lang === 'en' ? 'en' : 'zh'], S = SLIDE, r0 = S.row;
  const s = Math.max(w / 320, h / 180), ox = x + (w - 320 * s) / 2, oy = y + (h - 180 * s) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(ox, oy); ctx.scale(s, s);
  const bg = ctx.createLinearGradient(0, 0, 320, 180); bg.addColorStop(0, '#181B2E'); bg.addColorStop(1, '#0D0F1C'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 320, 180);
  const radial = (cx, cy, r, stops) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.29); ctx.fill(); };
  const neb = [[0, 'rgba(185,190,220,.55)'], [.55, 'rgba(125,132,176,.22)'], [1, 'rgba(125,132,176,0)']];
  radial(S.neb - 6, r0 - 4, 17, neb); radial(S.neb + 7, r0 + 5, 13, neb);
  const arrow = (x0, x1) => { ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, r0); ctx.lineTo(x1, r0); ctx.moveTo(x1 - 4, r0 - 3); ctx.lineTo(x1, r0); ctx.lineTo(x1 - 4, r0 + 3); ctx.stroke(); };
  arrow(S.neb + 22, S.star - 18);
  radial(S.star, r0, 20, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
  radial(S.star, r0, 10, [[0, '#FFF8E6'], [.65, '#F2DDA8'], [1, '#D9B878']]);
  arrow(S.star + 16, S.giant - S.giantR - 6);
  { const g = ctx.createRadialGradient(S.giant - 4, r0 - 5, 0, S.giant, r0, S.giantR); g.addColorStop(0, '#E9A27F'); g.addColorStop(.6, '#C8664A'); g.addColorStop(1, '#9C4433'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S.giant, r0, S.giantR, 0, 6.29); ctx.fill(); }
  arrow(S.giant + S.giantR + 6, S.wd - 12);
  radial(S.wd, r0, 9, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillStyle = '#E8EDF7'; ctx.beginPath(); ctx.arc(S.wd, r0, 3.4, 0, 6.29); ctx.fill();
  if (labels) {
    ctx.fillStyle = '#22D3EE'; ctx.fillRect(18, 13, 2, 13);
    ctx.fillStyle = '#F1F2F6'; ctx.font = `700 11.5px ${font}`; ctx.fillText(t.title, 25, 24);
    ctx.fillStyle = 'rgba(226,229,240,.45)'; ctx.font = `7.5px ${font}`; ctx.fillText(t.sub, 25, 37);
    ctx.fillStyle = 'rgba(226,229,240,.62)'; ctx.font = `8.5px ${font}`; ctx.textAlign = 'center';
    [[S.neb, t.neb], [S.star, t.star], [S.giant, t.giant], [S.wd, t.wd]].forEach(([lx, s2]) => ctx.fillText(s2, lx, r0 + 36));
    ctx.textAlign = 'left';
  }
  // lecturer window
  ctx.translate(250, 112);
  ctx.fillStyle = '#242838'; ctx.beginPath(); ctx.roundRect(0, 0, 56, 44, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, 56, 44, 5); ctx.clip();
  ctx.fillStyle = '#6E7389'; ctx.beginPath(); ctx.arc(28, 18, 7.5, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 44); ctx.bezierCurveTo(12, 33, 19, 28, 28, 28); ctx.bezierCurveTo(37, 28, 44, 33, 44, 44); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// A hand-drawn loop: points along an ellipse with a gentle wobble, drifting outward as it closes so the tail passes
// outside the start; each point carries a pen width (thin start, fuller middle, tapered end).
export function inkStroke(cx, cy, rx, ry) {
  const n = 150, a0 = -2.35, turns = 1.09, tilt = -.1, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + u * turns * Math.PI * 2;
    const wob = 1 + .035 * Math.sin(2 * a + .8) + .02 * Math.sin(3 * a + 2.1) + u * .09;
    const x = Math.cos(a) * rx * wob, y = Math.sin(a) * ry * wob;
    const p = Math.sin(Math.PI * Math.min(1, u * 1.03)) ** .55;
    pts.push({ x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt), w: .45 + 1.05 * p });
  }
  return pts;
}
// The filled outline of the stroke written up to `upto` points (fractional), with round end caps.
export function ribbonPath(pts, upto = pts.length - 1) {
  const m = Math.max(1, Math.min(pts.length - 1, upto)), k = Math.floor(m), fr = m - k;
  const P = pts.slice(0, k + 1);
  if (fr > 0 && k + 1 < pts.length) { const a = pts[k], b = pts[k + 1]; P.push({ x: a.x + (b.x - a.x) * fr, y: a.y + (b.y - a.y) * fr, w: a.w + (b.w - a.w) * fr }); }
  if (P.length < 2) return '';
  const L = [], Rr = [];
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    L.push([p.x - ty * p.w / 2, p.y + tx * p.w / 2]); Rr.push([p.x + ty * p.w / 2, p.y - tx * p.w / 2]);
  });
  const f = q => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`, r0 = (P[0].w / 2).toFixed(2), r1 = (P.at(-1).w / 2).toFixed(2);
  return `M${f(L[0])} L${L.slice(1).map(f).join(' L')} A${r1} ${r1} 0 0 1 ${f(Rr.at(-1))} L${Rr.slice(0, -1).reverse().map(f).join(' L')} A${r0} ${r0} 0 0 1 ${f(L[0])} Z`;
}
