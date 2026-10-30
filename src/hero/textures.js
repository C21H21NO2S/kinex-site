// Canvas textures for the r3 hero: paper fragments and the KineX screen UI.
// Everything is drawn procedurally so the prototype has no binary assets.

import { drawSlide } from '../core/art.js';
import { rng, pencil } from './pencil.js';
import { PIECES_LIGHT, PIECES_K } from '../core/logo.js';
export { rng };

const SERIF_ZH = '"Noto Serif SC", "Songti SC", serif';
const SERIF_EN = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, "Noto Sans SC", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

// The 3D scene's canvas textures are drawn in software (willReadFrequently). Drawn on the GPU, their whole drawing
// ran in the GPU process when they were uploaded, and every frame on screen (the opening sketch too) waited for it.
export const SOFT = { willReadFrequently: true };

let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d', { willReadFrequently: true }), img = x.createImageData(128, 128), d = img.data, r = rng(11);
  for (let i = 0; i < d.length; i += 4) { const v = r() - .5; const c2 = v > 0 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = c2; d[i + 3] = Math.abs(v) * 22; }
  x.putImageData(img, 0, 0);
  return (GRAIN = c);
}
function paper(ctx, w, h, tone, r) {
  ctx.fillStyle = tone; ctx.fillRect(0, 0, w, h);
  // grain (a tiled noise pattern) + fibres
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat'); ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = .05; ctx.strokeStyle = '#7a6f5a';
  for (let i = 0; i < 60; i++) { ctx.lineWidth = r() * .8; ctx.beginPath(); const x = r() * w, y = r() * h; ctx.moveTo(x, y); ctx.bezierCurveTo(x + r() * 30, y + r() * 10, x + r() * 40, y - r() * 10, x + r() * 60 - 10, y + r() * 20); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // edge darkening
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,45,20,.10)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

const NO_START = '，。、；：！？）」』”’》…—,.;:!?)';
function wrapText(ctx, text, x, y, maxW, lh, cjk) {
  const units = cjk ? [...text] : text.split(/(\s+)/), lines = [];
  let line = '';
  for (const u of units) {
    const t = line + u;
    // CJK line breaking: punctuation never starts a line (it may overhang the margin slightly instead)
    if (ctx.measureText(t).width > maxW && line && !(cjk && NO_START.includes(u))) { lines.push(line.trimEnd()); line = u.trimStart(); } else line = t;
  }
  if (line) lines.push(line);
  // nor is one character left alone on the last line: it takes one more from the line above
  const n = lines.length, prev = n > 1 ? [...lines[n - 2]] : [];
  if (cjk && prev.length > 2 && !NO_START.includes(prev.at(-1)) && [...lines[n - 1]].filter(c => !NO_START.includes(c)).length < 2) {
    lines[n - 1] = prev.pop() + lines[n - 1]; lines[n - 2] = prev.join('');
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
}

function highlightRun(ctx, x, y, w, h, color) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y + h * .15); ctx.lineTo(x + w, y + h * .05); ctx.lineTo(x + w - 2, y + h * .95); ctx.lineTo(x + 2, y + h); ctx.closePath(); ctx.fill(); ctx.restore();
}

const PAGES = {
  zh: [
    ['第 3 章　恒星的余烬', '宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来：碳、氧、硅，直到铁。', '铁是终点。聚变到这里不再放出能量，核心在几秒内塌缩，外层被炸向星际空间。'],
    ['第 5 章　星云', '这些元素在星云里重新聚集，形成新的恒星、行星，和我们。你骨骼里的钙，也曾是某颗星的一部分。', '我们是宇宙认识自己的一种方式。'],
    ['附录 B　测量', '天文学家用光谱读出远处恒星的成分。每一条暗线，都是一种元素留下的指纹。', '光走了几千年，才把恒星的秘密带到你眼前。'],
    ['第 1 章　尺度', '如果把太阳缩成一粒沙，最近的恒星也在几十公里之外。宇宙大部分是空的。', '而正是这些空旷，让每一点光都显得珍贵。'],
    ['第 2 章　光年', '光一年能走约九万五千亿公里。抬头看到的星星，是它们过去的样子。', '有些星光出发时，那颗星也许已经不在了。'],
    ['第 4 章　红巨星', '恒星老去时外层膨胀，体积可达太阳的几百倍，表面却变得更冷、更红。', '大约五十亿年后，太阳也会走到这一步。'],
    ['第 6 章　白矮星', '红巨星抛掉外层后，只剩一颗地球大小的炽热内核，在黑暗里慢慢冷却。', '一勺白矮星物质，重达好几吨。'],
    ['第 8 章　黑洞', '质量足够大的恒星坍缩到极致，连光也无法逃离。', '我们看不见它，只能看见它周围被拉扯、被点亮的东西。'],
  ],
  en: [
    ['Chapter 3 — Embers of stars', 'In the beginning there was almost only hydrogen and helium. Everything heavier was forged inside stars: carbon, oxygen, silicon, and finally iron.', 'Iron is where fusion stops paying. The core collapses within seconds.'],
    ['Chapter 5 — Nebulae', 'Those elements gather again in nebulae, forming new stars, planets — and us. The calcium in your bones was once part of a star.', 'We are a way for the cosmos to know itself.'],
    ['Appendix B — Measuring', 'Astronomers read a distant star’s make-up from its spectrum. Every dark line is the fingerprint of an element.', 'The light travelled for millennia to bring you that record.'],
    ['Chapter 1 — Scale', 'If the Sun were a grain of sand, the nearest star would be tens of kilometres away. The universe is mostly empty.', 'That emptiness is what makes every point of light precious.'],
    ['Chapter 2 — Light-years', 'Light covers about 9.5 trillion km in a year. The stars overhead are how they looked long ago.', 'Some of that light set out before its star was gone.'],
    ['Chapter 4 — Red giants', 'As a star ages its outer layers swell to hundreds of times the Sun’s size, cooler and redder at the surface.', 'In about five billion years, the Sun will do the same.'],
    ['Chapter 6 — White dwarfs', 'A red giant sheds its outer layers, leaving a hot core the size of Earth to cool slowly in the dark.', 'A spoonful of white dwarf weighs several tonnes.'],
    ['Chapter 8 — Black holes', 'A star massive enough collapses so far that not even light escapes.', 'We never see it — only what it pulls and lights up around it.'],
  ],
};

// card content, one entry per variant, so no two fragments in the scene say the same thing
const CARDS = {
  quote: [
    ['你血液里的铁，来自一颗早已死去的恒星。', 'The iron in your blood came from a star that died long ago.', 47],
    ['夜空中的星光，是恒星很久以前发出的。', 'The starlight we see left its star long ago.', 18],
    ['太阳每秒把四百万吨物质变成光。', 'Every second, the Sun turns four million tonnes of matter into light.', 62],
    ['一茶匙中子星物质，重达十亿吨以上。', 'A teaspoon of neutron star weighs over a billion tonnes.', 88],
    ['太阳的光，要走八分钟才到地球。', 'Sunlight takes eight minutes to reach Earth.', 12],
  ],
  concept: [
    ['超新星核合成', '恒星爆发时的核反应合成新元素，并把它们撒向星际空间。', 'Supernova nucleosynthesis', 'A star’s explosion forges new elements and scatters them into space.'],
    ['主序星', '靠氢聚变成氦发光的稳定阶段，是恒星一生中最长的时期。', 'Main sequence', 'The long, stable stage when a star shines by fusing hydrogen into helium.'],
    ['光谱', '把光按波长展开，暗线的位置揭示恒星由什么组成。', 'Spectrum', 'Light spread out by wavelength; its dark lines reveal what a star is made of.'],
    ['红移', '远离我们的天体，光谱会向红端偏移，越远偏得越多。', 'Redshift', 'Light from receding galaxies shifts toward red — the farther, the larger the shift.'],
  ],
  flash: [
    ['你血液里的铁，最初在哪里形成？', 'Where did the iron in your blood first form?', '今天复习', 'due today', 2],
    ['恒星的核聚变，为什么到铁就停下？', 'Why does fusion in stars stop at iron?', '今天复习', 'due today', 1],
    ['太阳最终会变成什么？', 'What will the Sun eventually become?', '明天', 'tomorrow', 3],
    ['离太阳最近的恒星是哪一颗？', 'Which star is nearest to the Sun?', '3 天后', 'in 3 days', 2],
  ],
  video: [
    ['天体物理导论 · 第 7 讲', 'Astrophysics · Lecture 7', '12:48', .42],
    ['恒星光谱怎么读', 'Reading a stellar spectrum', '08:15', .7],
    ['光年有多远？', 'How far is a light-year?', '05:32', .18],
    ['超新星是怎样爆发的', 'How a supernova explodes', '03:10', .86],
  ],
  note: [
    ['燃烧顺序：氢 → 氦 → 碳 → 氧 → 硅 → 铁', 'Burn order: H → He → C → O → Si → Fe'],
    ['太阳约 46 亿岁，正值中年', 'The Sun is ~4.6 billion years old — middle-aged'],
    ['问老师：白矮星最后会变成黑矮星吗？', 'Ask: do white dwarfs end as black dwarfs?'],
  ],
};
export const VARIANTS = { page: PAGES.zh.length, quote: CARDS.quote.length, concept: CARDS.concept.length, flash: CARDS.flash.length, video: CARDS.video.length, note: CARDS.note.length };

export const ALL_TEXT = JSON.stringify(PAGES) + JSON.stringify(CARDS) + '笔记明天后摘录第页回到原文概念超新星核合成比铁更重的元素多在恒星爆发几秒里形成闪卡今天复习你血液里的铁来自哪里遗忘困难一般容易听读主白板天体物理导论第讲恒星的一生章并排阅读白板 Cosmos EPUB PAGES Excerpt Concept Flashcard due today Again Hard Good Easy Back to source 0123456789:·—';

// Pages and cards are seen small and far away in the 3D scene, so they are designed to read at a distance:
// a large title, dark text, a bold highlight and a hairline frame (the frame keeps them distinct on a light background).
const frame = (ctx, w, h) => { const r = Math.min(w, h) * .045 * 1.0; ctx.strokeStyle = 'rgba(30,27,40,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, r); ctx.stroke(); };

export function makePage(variant, lang, seed) {
  const w = 768, h = 1024, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d', SOFT), r = rng(seed);
  paper(ctx, w, h, ['#FBF8F1', '#F9F6EE', '#FCFAF4', '#F7F3EA'][variant % 4], r);
  const [title, p1, p2] = PAGES[lang][variant % PAGES[lang].length], cjk = lang === 'zh';
  const [chap, name] = cjk ? title.split('　') : title.split(' — ');
  ctx.fillStyle = '#8B8578'; ctx.font = `500 26px ${MONO}`; ctx.fillText(chap.toUpperCase(), 64, 92);
  ctx.textAlign = 'right'; ctx.fillText(String(31 + variant * 16), w - 64, 92); ctx.textAlign = 'left';
  ctx.fillStyle = '#16141E'; ctx.font = cjk ? `600 84px ${SERIF_ZH}` : `400 96px ${SERIF_EN}`;
  let y = wrapText(ctx, name, 60, 200, w - 120, cjk ? 100 : 92, cjk) + 18;
  ctx.fillStyle = '#2E2A38'; ctx.fillRect(64, y - 34, 90, 6); y += 34;
  ctx.fillStyle = '#26232F'; ctx.font = cjk ? `500 36px ${SERIF_ZH}` : `400 42px ${SERIF_EN}`;
  const lh = cjk ? 62 : 54;
  y = wrapText(ctx, p1, 64, y, w - 128, lh, cjk) + 18;
  if (variant % 2 === 1) { // a figure
    ctx.fillStyle = '#ECE7DC'; ctx.fillRect(64, y - 20, w - 128, 210);
    ctx.strokeStyle = '#3B5BDB'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(250, y + 85, 62, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#F5B66B'; ctx.beginPath(); ctx.arc(250, y + 85, 18, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(38,35,47,.55)'; ctx.lineWidth = 4; [0, 1, 2].forEach(k => { ctx.beginPath(); ctx.moveTo(400, y + 30 + k * 52); ctx.lineTo(640 - k * 60, y + 30 + k * 52); ctx.stroke(); });
    y += 240;
  } else { // a highlighted sentence
    ctx.font = cjk ? `500 36px ${SERIF_ZH}` : `400 42px ${SERIF_EN}`;
    const start = y;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    const end = wrapText(ctx, p2, 64, y, w - 128, lh, cjk);
    for (let ly = start; ly < end; ly += lh) highlightRun(ctx, 56, ly - (cjk ? 42 : 40), w - 112, cjk ? 56 : 52, 'rgba(34,211,238,.62)');
    ctx.fillStyle = '#1E1B2A'; y = wrapText(ctx, p2, 64, y, w - 128, lh, cjk) + 14;
  }
  ctx.fillStyle = 'rgba(38,35,47,.32)';
  for (let i = 0; i < 6; i++) { const ly = y + i * lh; if (ly > h - 110) break; ctx.fillRect(64, ly - 22, (w - 128) * (.55 + r() * .45), 18); }
  ctx.fillStyle = '#B5AE9F'; ctx.font = `400 22px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('— ' + (31 + variant * 16) + ' —', w / 2, h - 50); ctx.textAlign = 'left';
  frame(ctx, w, h);
  return c;
}

export function makeCard(kind, lang, seed, v = 0) {
  const zh = lang === 'zh';
  const pick = list => list[v % list.length];
  const w = 640, h = kind === 'video' ? 460 : 400, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d', SOFT), r = rng(seed);
  const round = (x, y, ww, hh, rr) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rr); };
  paper(ctx, w, h, '#FDFCF9', r);
  const label = (t, x, y) => { ctx.fillStyle = '#8E8A98'; ctx.font = `500 24px ${MONO}`; ctx.fillText(t.toUpperCase(), x, y); };
  const SANSB = `"Noto Sans SC", ${SANS}`;
  if (kind === 'quote') {
    // as an excerpt card on a KineX board: a stripe in the highlight's colour with its back-to-source chevron, the
    // sentence, and where it came from
    ctx.fillStyle = '#97A1AF'; ctx.fillRect(0, 0, 50, h);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(31, h / 2 - 14); ctx.lineTo(17, h / 2); ctx.lineTo(31, h / 2 + 14); ctx.stroke();
    const [qz, qe, pg] = pick(CARDS.quote);
    ctx.fillStyle = '#16141E'; ctx.font = zh ? `600 50px ${SANSB}` : `400 58px ${SERIF_EN}`;
    wrapText(ctx, zh ? qz : qe, 84, 112, w - 128, zh ? 70 : 62, zh);
    ctx.fillStyle = '#9A948F'; ctx.font = `500 26px ${SANSB}`; ctx.textAlign = 'right';
    ctx.fillText(zh ? `恒星的余烬 · 第 ${pg} 页` : `Embers of stars · p.${pg}`, w - 40, h - 38); ctx.textAlign = 'left';
  } else if (kind === 'concept') {
    const [tz, dz, te, de] = pick(CARDS.concept);
    label(zh ? '概念' : 'Concept', 48, 76);
    ctx.fillStyle = '#16141E'; ctx.font = zh ? `800 74px ${SANSB}` : `700 62px ${SANS}`;
    const y = wrapText(ctx, zh ? tz : te, 48, 170, w - 96, zh ? 84 : 70, zh);
    ctx.fillStyle = '#0EA5E9'; ctx.fillRect(48, y - 34, 120, 8);
    ctx.fillStyle = '#4B4858'; ctx.font = `500 30px ${SANSB}`;
    wrapText(ctx, zh ? dz : de, 48, y + 30, w - 96, 42, zh);
  } else if (kind === 'flash') {
    const [fz, fe, dz, de, g] = pick(CARDS.flash);
    label(zh ? `闪卡 · ${dz}` : `Flashcard · ${de}`, 48, 76);
    ctx.fillStyle = '#16141E'; ctx.font = `600 50px ${SANSB}`;
    wrapText(ctx, zh ? fz : fe, 48, 160, w - 96, 66, zh);
    [0, 1, 2, 3].forEach(i => { ctx.fillStyle = i === g ? '#3D3D3D' : '#EBEBEB'; round(48 + i * 140, h - 108, 124, 62, 14); ctx.fill(); });
    ctx.font = `600 26px ${SANSB}`; ctx.textAlign = 'center';
    (zh ? ['遗忘', '困难', '一般', '容易'] : ['Again', 'Hard', 'Good', 'Easy']).forEach((t, i) => { ctx.fillStyle = i === g ? '#FFFFFF' : '#3D3A48'; ctx.fillText(t, 110 + i * 140, h - 67); });
    ctx.textAlign = 'left';
  } else if (kind === 'video') {
    const [vz, ve, time, prog] = pick(CARDS.video);
    ctx.save(); round(16, 16, w - 32, 320, 14); ctx.clip();
    if (v % CARDS.video.length === 0) drawSlide(ctx, 16, 16, w - 32, 320, lang, { labels: false }); else drawClip(ctx, 16, 16, w - 32, 320, v % CARDS.video.length, r);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.6)'; round(36, 276, 118, 46, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `600 28px ${MONO}`; ctx.fillText(time, 52, 309);
    ctx.fillStyle = '#16141E'; ctx.font = `600 34px ${SANSB}`; ctx.fillText(zh ? vz : ve, 30, 392);
    ctx.fillStyle = '#E4E2EA'; ctx.fillRect(30, 420, w - 60, 10); ctx.fillStyle = '#2563EB'; ctx.fillRect(30, 420, (w - 60) * prog, 10);
  } else if (kind === 'note') {
    // a typed note with a graphite underline, as written on the board
    const [nz, ne] = pick(CARDS.note);
    label(zh ? '笔记' : 'Note', 48, 76);
    ctx.fillStyle = '#16141E'; ctx.font = zh ? `600 48px ${SANSB}` : `500 50px ${SANS}`;
    const y = wrapText(ctx, zh ? nz : ne, 48, 160, w - 96, 66, zh);
    const ux = 48, uw = Math.min(w - 96, 300 + r() * 160), uy = Math.min(h - 50, y - 16);
    pencil(ctx, Array.from({ length: 9 }, (_, k) => [ux + uw * k / 8, uy + Math.sin(k * 1.3 + r() * 2) * 4]), 7, r, '37,99,235');
  } else if (kind === 'ink') {
    ctx.strokeStyle = 'rgba(37,99,235,.14)'; ctx.lineWidth = 3;
    for (let y = 60; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // "Fe → ☆" in a soft graphite hand, centred on the card: a slightly leaning F, an e in one stroke, a quick arrow,
    // and a star the way people draw one, in a single crossing stroke with sharp turns and a small overshoot
    const ink = (pts, wd) => pencil(ctx, pts, wd, r, '33,31,43');
    ink([[80, 96], [77, 160], [74, 228], [72, 300]], 12);
    ink([[81, 100], [114, 96], [146, 93], [172, 92]], 11);
    ink([[78, 196], [102, 194], [128, 192], [144, 192]], 10.5);
    ink([[192, 252], [222, 250], [244, 244], [246, 222], [230, 206], [206, 207], [188, 226], [184, 256], [194, 284], [220, 296], [246, 290], [260, 278]], 11);
    ink([[290, 232], [326, 228], [364, 224], [400, 222]], 10);
    ink([[372, 200], [390, 211], [406, 222], [390, 235], [374, 247]], 10);
    const sc = [506, 210], R = 78, rot = -.06;
    const vs = [0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * Math.PI * 2 / 5 + rot, j = 1 + (r() - .5) * .07; return [sc[0] + Math.cos(a) * R * j, sc[1] + Math.sin(a) * R * j]; });
    const star = [];
    [0, 2, 4, 1, 3, 0].forEach((k, i, o) => {
      const v = vs[k];
      if (i) { const u = vs[o[i - 1]]; star.push([(u[0] + v[0]) / 2 + (r() - .5) * 2.5, (u[1] + v[1]) / 2 + (r() - .5) * 2.5]); }
      star.push(v, v); // a doubled point keeps the turn sharp
    });
    star.push([vs[0][0] + (vs[0][0] - vs[3][0]) * .06, vs[0][1] + (vs[0][1] - vs[3][1]) * .06]); // carries on past the top
    ink(star, 9.5);
  } else if (kind === 'cover') {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1E1B4B'); g.addColorStop(1, '#0B0A20'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(200,220,255,${r() * .7})`; ctx.fillRect(r() * w, r() * h, 2, 2); }
    ctx.fillStyle = '#F2EEE6'; ctx.font = `italic 400 130px ${SERIF_EN}`; ctx.fillText('Cosmos', 46, 236);
    ctx.font = `600 26px ${MONO}`; ctx.fillStyle = '#AEB3E6'; ctx.fillText('EPUB · 412 PAGES', 52, 310);
  }
  if (kind !== 'cover') frame(ctx, w, h);
  return c;
}

// Lecture thumbnails for the other videos, drawn in the same 320×180 slide space and palette as drawSlide.
function drawClip(ctx, x, y, w, h, v, r) {
  const s = Math.max(w / 320, h / 180);
  ctx.save(); ctx.translate(x + (w - 320 * s) / 2, y + (h - 180 * s) / 2); ctx.scale(s, s);
  const bg = ctx.createLinearGradient(0, 0, 320, 180); bg.addColorStop(0, '#181B2E'); bg.addColorStop(1, '#0D0F1C'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 320, 180);
  const glow = (cx, cy, rad, stops) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.29); ctx.fill(); };
  if (v === 1) { // a spectrum band with absorption lines
    const g = ctx.createLinearGradient(40, 0, 280, 0);
    [['#5B4B9A', 0], ['#3E6FB0', .22], ['#3C9A8E', .42], ['#C9B65A', .6], ['#C98A4E', .78], ['#A7483E', 1]].forEach(([c, o]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(40, 74, 240, 34, 3); ctx.fill();
    ctx.fillStyle = 'rgba(8,9,18,.82)'; [58, 83, 121, 128, 176, 203, 251].forEach((lx, i) => ctx.fillRect(lx, 74, i % 3 ? 1.6 : 2.6, 34));
    ctx.fillStyle = 'rgba(226,229,240,.4)'; [40, 120, 200, 280].forEach(lx => ctx.fillRect(lx, 114, 1, 4));
  } else if (v === 2) { // the Sun, a long dotted span, the nearest star
    glow(70, 92, 26, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
    glow(70, 92, 13, [[0, '#FFF8E6'], [.65, '#F2DDA8'], [1, '#D9B878']]);
    ctx.fillStyle = 'rgba(226,229,240,.5)'; for (let lx = 96; lx < 228; lx += 6) ctx.fillRect(lx, 91.5, 2, 1);
    glow(240, 92, 9, [[0, 'rgba(255,255,255,.2)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = '#E9A27F'; ctx.beginPath(); ctx.arc(240, 92, 3.4, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(226,229,240,.32)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(96, 112); ctx.lineTo(96, 118); ctx.lineTo(228, 118); ctx.lineTo(228, 112); ctx.stroke();
  } else { // a supernova: a bright core and a ring of ejecta
    glow(160, 88, 70, [[0, 'rgba(242,221,168,.4)'], [.45, 'rgba(200,102,74,.18)'], [1, 'rgba(200,102,74,0)']]);
    glow(160, 88, 16, [[0, '#FFFFFF'], [.5, '#FFF8E6'], [1, 'rgba(242,221,168,0)']]);
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 26 + r() * 40; ctx.fillStyle = `rgba(${r() > .5 ? '233,162,127' : '232,237,247'},${.25 + r() * .5})`; ctx.fillRect(160 + Math.cos(a) * d, 88 + Math.sin(a) * d * .8, 1.6, 1.6); }
  }
  // lecturer window, as on the main slide
  ctx.translate(250, 112);
  ctx.fillStyle = '#242838'; ctx.beginPath(); ctx.roundRect(0, 0, 56, 44, 5); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#6E7389'; ctx.beginPath(); ctx.arc(28, 18, 7.5, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 44); ctx.bezierCurveTo(12, 33, 19, 28, 28, 28); ctx.bezierCurveTo(37, 28, 44, 33, 44, 44); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
}

// The KineX workspace as it looks in the app (its default 中性 light scheme): the title bar, the reader pane (left) and
// the whiteboard pane (right). Drawn in a 1600-wide design space. Anchors other code relies on: the reader highlight
// (returned in `hl`), the concept card centred at (1390, 225), the excerpt card (800–1120, 270–430), the media card
// around (1180–1510, 520–770), and the board pane from x = 752 (the sync section's tablet shows only that).
export const SCREEN = { concept: [1390, 225] };

const UI = {
  font: '"Noto Sans SC", Inter, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  // App.vue .light-theme
  ink: '#272320', ink2: '#635C57', ink3: '#9A948F', line: '#E0E0E0', accent: '#3D3D3D',
  bar: '#EFEFEF', workspace: '#E3E3E3', panel: '#FFFFFF', board: '#F7F7F7', dot: '#D4D4D4', activeSoft: '#EBEBEB',
  // the reader's automatic highlight colour and the excerpt card's stripe
  hl: 'rgba(124,141,166,.30)', hlEdge: 'rgba(98,116,143,.55)', stripe: '#97A1AF', edge: '#9B9B9B',
};

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function shadowed(ctx, fn, blur = 24, oy = 6, a = .10) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore(); }

// KineX's own icons (Material Symbols on a 960 grid, filled; line icons on a 24 grid, stroked at 1.75), from
// PrimaryBar.vue, ReaderToolbar.vue, PenTypeIcon.vue and header-action-icons.ts
const M = (d, vb = 960) => ({ d, vb, fill: true });
const S = (d, lw = 1.75) => ({ d, vb: 24, lw });
const ICON = {
  move: S('M5 9 2 12 5 15M9 5 12 2 15 5M19 9 22 12 19 15M9 19 12 22 15 19M2 12H22M12 2V22'),
  text: S('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 8H15M12 8V16'),
  pen: M('m240-320 100-360h60v-60l60-140h40l60 140v60h60l100 360H240Zm105-80h270l-56-200H401l-56 200ZM160-120l22-65q8-25 29-40t47-15h444q26 0 47 15t29 40l22 65H160Z'),
  highlight: M('M280-320v-440q0-33 23.5-56.5T360-840q9 0 18 2t17 6l240 119q20 10 32.5 29.5T680-641v321H280Zm80-80h240v-241L360-760v360ZM160-120l22-65q8-25 29-40t47-15h444q26 0 47 15t29 40l22 65H160Zm200-280h240-240Z'),
  eraser: M('M690-240h190v80H610l80-80Zm-500 80-85-85q-23-23-23.5-57t22.5-58l440-456q23-24 56.5-24t56.5 23l199 199q23 23 23 57t-23 57L520-160H190Zm296-80 314-322-198-198-442 456 64 64h262Zm-6-240Z'),
  select: S('M7 3H3V7M17 3H21V7M7 21H3V17M17 21H21V17M10 3H14M10 21H14M3 10V14M21 10V14'),
  group: S('M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3ZM7 7h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM13 12h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z'),
  undo: S('M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6'),
  redo: S('m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6'),
  cursor: M('m320-410 79-110h170L320-716v306ZM551-80 406-392 240-160v-720l560 440H516l144 309-109 51ZM399-520Z'),
  excerpt: M('M240-80q-66 0-113-47T80-240v-560q0-66 47-113t113-47h480q66 0 113 47t47 113v560q0 66-47 113T720-80H240Zm0-80h480q33 0 56.5-23.5T800-240v-560q0-33-23.5-56.5T720-880H240q-33 0-56.5 23.5T160-800v560q0 33 23.5 56.5T240-160Zm240-320ZM360-280h240v-80h-80v-240h80v-80H360v80h80v240h-80v80Z'),
  aloud: M('M160-80q-33 0-56.5-23.5T80-160v-640q0-33 23.5-56.5T160-880h326l-80 80H160v640h440v-80h80v80q0 33-23.5 56.5T600-80H160Zm80-160v-80h280v80H240Zm0-120v-80h200v80H240Zm360 0L440-520H320v-200h120l160-160v520Zm80-122v-276q36 21 58 57t22 81q0 45-22 81t-58 57Zm0 172v-84q70-25 115-86.5T840-620q0-78-45-139.5T680-846v-84q104 27 172 112.5T920-620q0 112-68 197.5T680-310Z'),
  orient: M('M80-80v-800h80v800H80Zm340-200v-400h120v400H420ZM800-80v-800h80v800h-80Z'),
  more: S('M5.5 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM18.5 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z'),
  chevron: S('m5 8 7 7 7-7'),
  back: S('m15 6-6 6 6 6', 2.4),
  search: S('M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM20 20l-4.8-4.8'),
  split: S('M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM12 4v16'),
  close: S('M6 6l12 12M18 6 6 18'),
  menu: S('M5 7h14M5 12h14M5 17h14'),
  expand: S('M14 5h5v5M19 5l-6 6M10 19H5v-5M5 19l6-6'),
  fit: S('M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z'),
  dots: M('M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM18 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z', 24),
  flashcards: M('M456-316H320q-33 0-56-23-24-24-24-57V-760q0-33 24-56 23-24 56-24H800q33 0 57 24 23 23 23 56v327a250 250 0 0 0-80-56V-760H320v364H490a250 250 0 0 0-34 80ZM130-189 81-546q-5-32 16-58 20-26 52-31l61 435 241-34a250 250 0 0 0 22 78L218-121q-33 5-58-15-25-20-30-53ZM400-600H720v-80H400v80Zm0 40H600v71a250 250 0 0 0-19 9H400ZM633-81q-31-14-55-37-23-24-37-55-13-31-13-67h38q0 56 39 95 39 39 95 39 57 0 96-39 39-39 39-95 0-57-39-96-39-39-96-39h-2l29 30-27 28-76-77 76-77 27 28-29 30h2q36 0 68 14 31 13 55 37 23 23 37 54 13 32 13 68 0 36-13 67-14 31-37 55-24 23-55 37-32 13-68 13-36 0-67-13Z'),
  settings: M('m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z'),
  play: M('M8 5.5v13l10.5-6.5L8 5.5Z', 24),
  book: S('M3.5 5.5Q8 4 12 6.5q4-2.5 8.5-1v13q-4.5-1.5-8.5 1-4-2.5-8.5-1Zm8.5 1v13', 1.6),
};
const PATHS = new Map();
function icon(ctx, name, x, y, color, size = 20) {
  const ic = ICON[name];
  if (!PATHS.has(name)) PATHS.set(name, new Path2D(ic.d));
  ctx.save(); ctx.translate(x, y + (ic.vb === 960 ? size : 0)); ctx.scale(size / ic.vb, size / ic.vb);
  if (ic.fill) { ctx.fillStyle = color; ctx.fill(PATHS.get(name)); }
  else { ctx.strokeStyle = color; ctx.lineWidth = ic.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(PATHS.get(name)); }
  ctx.restore();
}
// a floating tool bar as in KineX: frosted white, 12px corners, 34px buttons; the active tool sits on a soft grey
// square with a thin ring in the accent colour
function toolbar(ctx, x0, y, items, active) {
  const B = 34, G = 2, P = 6, DIV = 7;
  const w = items.reduce((a, it) => a + (it === '|' ? DIV : B + G), 0) - G + P * 2;
  shadowed(ctx, () => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(ctx, x0, y, w, B + P * 2, 12); ctx.fill(); }, 30, 8, .13);
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; rr(ctx, x0 + .5, y + .5, w - 1, B + P * 2 - 1, 12); ctx.stroke();
  let x = x0 + P;
  items.forEach(it => {
    if (it === '|') { ctx.fillStyle = UI.line; ctx.fillRect(x + 2, y + P + 7, 1, 20); x += DIV; return; }
    if (it === active) {
      ctx.fillStyle = UI.activeSoft; rr(ctx, x, y + P, B, B, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(61,61,61,.45)'; ctx.lineWidth = 1.5; rr(ctx, x + .75, y + P + .75, B - 1.5, B - 1.5, 7.5); ctx.stroke();
    }
    icon(ctx, it, x + 8, y + P + 8, it === active ? UI.accent : UI.ink2, 18);
    x += B + G;
  });
  return w;
}
// the E10 mark (core/logo.js), in its own colours
let MARK = null;
function mark(ctx, x, y, s) {
  MARK ??= { light: PIECES_LIGHT.map(d => new Path2D(d)), k: PIECES_K.map(d => new Path2D(d)) };
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  const grad = stops => { const g = ctx.createRadialGradient(94, 2, 0, 94, 2, 118); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  ctx.fillStyle = grad([[0, '#7DEBFB'], [.1, '#67E8F9'], [.3, '#22D3EE'], [.56, '#0EA5E9'], [.84, '#2563EB'], [1, '#4338CA']]); MARK.light.forEach(p => ctx.fill(p));
  ctx.fillStyle = grad([[0, '#4740D4'], [.55, '#3730A3'], [1, '#312E81']]); MARK.k.forEach(p => ctx.fill(p));
  ctx.restore();
}

const TXT = {
  zh: { title: '恒星的一生', file: '恒星的余烬.epub', ch: '第 3 章　恒星的余烬', board: '主白板',
    p1: '宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来：碳、氧、硅，直到铁。',
    p2a: '铁是终点。聚变到这里不再放出能量，核心在几秒内塌缩，外层被炸向星际空间。所以，',
    hl: ['你血液里的铁，来自一颗早已', '死去的恒星。'],
    p3: '这些元素在星云里重新聚集，形成新的恒星、行星，和我们。你骨骼里的钙，也曾是某颗星的一部分。',
    ex: '你血液里的铁，来自一颗早已死去的恒星。', exSrc: '恒星的余烬.epub · 第 47 页', concept: '超新星核合成', conceptD: '恒星爆发时合成新元素',
    video: '天体物理导论 · 第 7 讲', play: '听读', pos: '47 / 268' },
  en: { title: 'Life of a star', file: 'Embers of stars.epub', ch: 'Chapter 3 — Embers of stars', board: 'Main board',
    p1: 'In the beginning there was almost only hydrogen and helium. Everything heavier was forged inside stars: carbon, oxygen, silicon, and finally iron.',
    p2a: 'Iron is where fusion stops paying. The core collapses within seconds and the shell is blown into space. So',
    hl: ['the iron in your blood came from', 'a star that died long ago.'],
    p3: 'Those elements gather again in nebulae, forming new stars, planets — and us. The calcium in your bones was once part of a star.',
    ex: 'The iron in your blood came from a star that died long ago.', exSrc: 'Embers of stars.epub · p.47', concept: 'Supernova nucleosynthesis', conceptD: 'New elements forged as stars explode',
    video: 'Astrophysics · Lecture 7', play: 'Listen', pos: '47 / 268' },
};

// The reader's highlight as a tile of its own (the 3D scene lays it over the page and sweeps it in, so the screen
// texture never has to be uploaded again): the band and its edge on white, drawn at k pixels per design unit.
export function highlightTile(bw, bh, k) {
  const c = document.createElement('canvas'); c.width = Math.ceil(bw * k); c.height = Math.ceil(bh * k);
  const x = c.getContext('2d', SOFT); x.scale(k, k);
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, bw, bh);
  x.fillStyle = UI.hl; rr(x, 0, 0, bw, bh, 4); x.fill();
  x.strokeStyle = UI.hlEdge; x.lineWidth = 1.2; rr(x, .6, .6, bw - 1.2, bh - 1.2, 3.5); x.stroke();
  return c;
}

// highlight: false leaves the sentence plain (and without its dashed link to the excerpt card), for the scene to
// sweep its own highlight over it
export function drawScreen(ctx, w, h, lang, { highlight = true } = {}) {
  const zh = lang === 'zh', L = TXT[zh ? 'zh' : 'en'];
  const s = w / 1600; ctx.save(); ctx.scale(s, s); const W = 1600, H = h / s;
  const F = (wt, px) => `${wt} ${px}px ${UI.font}`;
  const SERIF = zh ? '"Noto Serif SC", "Songti SC", serif' : '"Instrument Serif", Georgia, serif';

  // ---- title bar: mark and name, the theme's title, then 闪卡 · 设置 · “…”
  ctx.fillStyle = UI.workspace; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = UI.bar; ctx.fillRect(0, 0, W, 48); ctx.fillStyle = UI.line; ctx.fillRect(0, 47, W, 1);
  // (the tablet's screen has rounded corners about 52 units across: nothing sits in them)
  mark(ctx, 40, 13, 22);
  ctx.fillStyle = UI.ink; ctx.font = F(700, 16); ctx.fillText('KineX', 70, 30);
  ctx.fillStyle = UI.ink; ctx.font = F(600, 15); ctx.textAlign = 'center'; ctx.fillText(L.title, W / 2, 30); ctx.textAlign = 'left';
  icon(ctx, 'flashcards', 1446, 14, UI.ink2, 20); icon(ctx, 'settings', 1484, 14, UI.ink2, 20); icon(ctx, 'dots', 1522, 14, UI.ink2, 20);

  // ---- reader pane: a white panel with the file's bar, the floating reader tools and the reflowed book
  const RW = 748, PY = 54, R = 10;
  shadowed(ctx, () => { ctx.fillStyle = UI.panel; rr(ctx, 6, PY, RW - 9, H - PY - 6, R); ctx.fill(); }, 6, 1, .06);
  ctx.fillStyle = UI.ink; ctx.font = F(600, 14); ctx.fillText(L.file, 30, PY + 26);
  icon(ctx, 'search', 640, PY + 10, UI.ink2, 18); icon(ctx, 'split', 672, PY + 10, UI.ink2, 18); icon(ctx, 'close', 704, PY + 10, UI.ink2, 18);
  ctx.fillStyle = UI.line; ctx.fillRect(6, PY + 40, RW - 9, 1);
  const tools = ['cursor', '|', 'excerpt', 'highlight', 'eraser', '|', 'aloud', '|', 'undo', 'redo', '|', 'orient', '|', 'more', 'chevron'];
  const tw = tools.reduce((a, it) => a + (it === '|' ? 7 : 36), 0) - 2 + 12;
  toolbar(ctx, (6 + RW - 3) / 2 - tw / 2, PY + 52, tools, 'excerpt');
  ctx.fillStyle = UI.ink3; ctx.font = `500 13px "JetBrains Mono", monospace`; ctx.fillText(L.ch.toUpperCase(), 92, 186);
  ctx.fillStyle = '#26221F'; ctx.font = zh ? `500 24px ${SERIF}` : `400 28px ${SERIF}`;
  const lh = zh ? 44 : 38, mw = RW - 184, tx = 92;
  let y = wrapText(ctx, L.p1, tx, 236, mw, lh, zh) + 16;
  y = wrapText(ctx, L.p2a, tx, y, mw, lh, zh);
  const hlBox = [];
  L.hl.forEach((t, i) => {
    const tw2 = ctx.measureText(t).width, yy = y + i * lh, top = yy - (zh ? 30 : 27), hh = zh ? 40 : 36;
    if (highlight) {
      ctx.fillStyle = UI.hl; rr(ctx, tx - 4, top, tw2 + 8, hh, 4); ctx.fill();
      ctx.strokeStyle = UI.hlEdge; ctx.lineWidth = 1.2; rr(ctx, tx - 3.4, top + .6, tw2 + 6.8, hh - 1.2, 3.5); ctx.stroke();
    }
    hlBox.push([tx - 4, top, tw2 + 8, hh]);
    ctx.fillStyle = '#26221F'; ctx.fillText(t, tx, yy);
  });
  y += lh * 2 + 16;
  wrapText(ctx, L.p3, tx, y, mw, lh, zh);
  ctx.fillStyle = UI.ink2; ctx.font = F(500, 13); ctx.textAlign = 'right'; ctx.fillText(L.pos, RW - 30, H - 24); ctx.textAlign = 'left';
  // bottom-left pane controls
  [['menu', 40], ['expand', 78]].forEach(([n, x]) => { shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, x, H - 62, 32, 32, 8); ctx.fill(); }, 8, 2, .1); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; rr(ctx, x + .5, H - 61.5, 31, 31, 8); ctx.stroke(); icon(ctx, n, x + 7, H - 55, UI.ink, 18); });

  // ---- board pane
  const BX = RW + 4;
  ctx.fillStyle = UI.board; rr(ctx, BX, PY, W - BX - 6, H - PY - 6, R); ctx.fill();
  ctx.save(); rr(ctx, BX, PY, W - BX - 6, H - PY - 6, R); ctx.clip();
  ctx.fillStyle = UI.dot; for (let gx = BX + 14; gx < W; gx += 26) for (let gy = PY + 16; gy < H; gy += 26) ctx.fillRect(gx, gy, 2, 2);
  ctx.restore();
  // board chip (colour, menu, name), the tool bar, the board's “…”, and fit-to-view
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, BX + 14, PY + 12, 104, 34, 10); ctx.fill(); }, 10, 2, .08);
  ctx.fillStyle = '#90CAF9'; rr(ctx, BX + 26, PY + 22, 13, 13, 3); ctx.fill(); icon(ctx, 'chevron', BX + 42, PY + 21, UI.ink2, 13);
  ctx.fillStyle = UI.ink; ctx.font = F(700, 14); ctx.fillText(L.board, BX + 62, PY + 34);
  const bt = ['move', '|', 'text', 'pen', 'highlight', 'eraser', '|', 'select', 'group', '|', 'undo', 'redo'];
  const bw = bt.reduce((a, it) => a + (it === '|' ? 7 : 36), 0) - 2 + 12;
  toolbar(ctx, (BX + W) / 2 - bw / 2, PY + 10, bt, 'move');
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, W - 56, PY + 12, 38, 38, 10); ctx.fill(); }, 10, 2, .08); icon(ctx, 'dots', W - 47, PY + 21, UI.ink, 20);
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, W - 76, H - 64, 34, 34, 9); ctx.fill(); }, 8, 2, .1); icon(ctx, 'fit', W - 68, H - 56, UI.ink, 18);

  // cards: white, 8px corners, a hairline border (KineX's board cards)
  const card = (x, y, w, h, fn) => { shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, h, 8); ctx.fill(); }, 14, 3, .06); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 8); ctx.stroke(); fn(x, y, w, h); };
  // connections: KineX's grey structure edges
  const link = (x0, y0, x1, y1) => { ctx.strokeStyle = UI.edge; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1); ctx.stroke(); };
  link(1120, 330, 1250, 225); link(1050, 430, 1180, 640);
  // the excerpt's link back to the page: from the end of the highlight, along its line (empty there), over to the card
  if (highlight) {
    const [hx, hy, hw, hh] = hlBox[0], lx0 = hx + hw + 12, ly0 = hy + hh / 2;
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = '#A9A39E'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.moveTo(lx0, ly0); ctx.bezierCurveTo(Math.max(lx0 + 120, 640), ly0, 700, 352, 798, 352); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.arc(lx0, ly0, 3.4, 0, 6.29); ctx.fill(); ctx.restore();
  }
  // excerpt card: the stripe in the highlight's colour with a “back to source” chevron, the text, its source
  card(800, 270, 320, 160, (x, y, w, h) => {
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip(); ctx.fillStyle = UI.stripe; ctx.fillRect(x, y, 24, h); ctx.restore();
    icon(ctx, 'back', x + 3, y + h / 2 - 9, '#FFFFFF', 18);
    ctx.fillStyle = UI.ink; ctx.font = F(400, 18); wrapText(ctx, L.ex, x + 40, y + 40, w - 60, 29, zh);
    ctx.fillStyle = UI.ink3; ctx.font = F(400, 12.5); ctx.textAlign = 'right'; ctx.fillText(L.exSrc, x + w - 14, y + h - 14); ctx.textAlign = 'left';
  });
  // a text card (the pen underlines its title and adds a star)
  card(1250, 165, 280, 120, (x, y, w) => {
    ctx.fillStyle = UI.ink; ctx.font = F(700, zh ? 25 : 21); wrapText(ctx, L.concept, x + 20, y + 68, w - 40, 28, zh);
    ctx.fillStyle = UI.ink2; ctx.font = F(400, 14); ctx.fillText(L.conceptD, x + 20, y + 104);
  });
  // media card: the lecture's frame with its time, title, and 听读
  card(1180, 520, 330, 250, (x, y, w) => {
    ctx.save(); rr(ctx, x + 10, y + 10, w - 20, 166, 6); ctx.clip(); drawSlide(ctx, x + 10, y + 10, w - 20, 166, zh ? 'zh' : 'en', { font: UI.font }); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, x + 22, y + 140, 62, 26, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `500 14px "JetBrains Mono", monospace`; ctx.fillText('12:48', x + 30, y + 158);
    ctx.fillStyle = UI.ink; ctx.font = F(600, 17); ctx.fillText(L.video, x + 18, y + 210);
    ctx.fillStyle = UI.activeSoft; rr(ctx, x + 18, y + 222, zh ? 70 : 78, 24, 6); ctx.fill(); icon(ctx, 'play', x + 22, y + 225, UI.accent, 18); ctx.fillStyle = UI.accent; ctx.font = F(600, 12.5); ctx.fillText(L.play, x + 42, y + 239);
  });
  ctx.restore();
  return { hl: hlBox.map(b => b.map(v => v * s)), tip: null, scale: s };
}
