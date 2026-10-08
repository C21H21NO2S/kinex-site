// Canvas textures for the r3 hero: paper fragments and the KineX screen UI.
// Everything is drawn procedurally so the prototype has no binary assets.

import { drawSlide } from '../core/art.js';

export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const SERIF_ZH = '"Noto Serif SC", "Songti SC", serif';
const SERIF_EN = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, "Noto Sans SC", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128), d = img.data, r = rng(11);
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

function wrapText(ctx, text, x, y, maxW, lh, cjk) {
  const units = cjk ? [...text] : text.split(/(\s+)/);
  let line = '', yy = y;
  for (const u of units) {
    const t = line + u;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line.trimEnd(), x, yy); yy += lh; line = u.trimStart(); }
    else line = t;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
}

function highlightRun(ctx, x, y, w, h, color) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y + h * .15); ctx.lineTo(x + w, y + h * .05); ctx.lineTo(x + w - 2, y + h * .95); ctx.lineTo(x + 2, y + h); ctx.closePath(); ctx.fill(); ctx.restore();
}

const PAGES = {
  zh: [
    ['第 3 章　恒星的余烬', '宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来：碳、氧、硅，直到铁。', '铁是终点。聚变到这里不再放出能量，核心在几秒内塌缩，外层被炸向星际空间。'],
    ['第 5 章　星云', '这些元素在星云里重新聚集，形成新的恒星、行星，和我们。你骨骼里的钙，也曾是某颗星的一部分。', '我们是宇宙认识自己的一种方式。'],
    ['附录 B　测量', '天文学家用光谱读出远处恒星的成分。每一条暗线，都是一种元素留下的指纹。', '光走了几千年，才把这份记录带到你眼前。'],
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
    ['我们看到的星光，是它很久以前发出的。', 'The starlight we see left its star long ago.', 18],
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

export const ALL_TEXT = JSON.stringify(PAGES) + JSON.stringify(CARDS) + '笔记明天后摘录第页回到原文概念超新星核合成比铁更重的元素多在恒星爆发几秒里形成闪卡今天复习你血液里的铁来自哪里重来困难良好简单天体物理导论第讲恒星的一生章并排阅读白板 Cosmos EPUB PAGES Excerpt Concept Flashcard due today Again Hard Good Easy Back to source 0123456789:·—';

// Pages and cards are seen small and far away in the 3D scene, so they are designed to read at a distance:
// a large title, dark text, a bold highlight and a hairline frame (the frame keeps them distinct on a light background).
const frame = (ctx, w, h) => { const r = Math.min(w, h) * .045 * 1.0; ctx.strokeStyle = 'rgba(30,27,40,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, r); ctx.stroke(); };

export function makePage(variant, lang, seed) {
  const w = 768, h = 1024, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
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
  const w = 640, h = kind === 'video' ? 460 : 400, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
  const round = (x, y, ww, hh, rr) => { ctx.beginPath(); ctx.roundRect(x, y, ww, hh, rr); };
  paper(ctx, w, h, '#FDFCF9', r);
  const label = (t, x, y) => { ctx.fillStyle = '#8E8A98'; ctx.font = `500 24px ${MONO}`; ctx.fillText(t.toUpperCase(), x, y); };
  const SANSB = `"Noto Sans SC", ${SANS}`;
  if (kind === 'quote') {
    ctx.fillStyle = '#0EA5E9'; ctx.fillRect(0, 0, 26, h);
    const [qz, qe, pg] = pick(CARDS.quote);
    label(zh ? `摘录 · 第 ${pg} 页` : `Excerpt · p.${pg}`, 60, 72);
    ctx.fillStyle = '#16141E'; ctx.font = zh ? `600 50px ${SANSB}` : `400 58px ${SERIF_EN}`;
    wrapText(ctx, zh ? qz : qe, 60, 152, w - 110, zh ? 70 : 62, zh);
    ctx.fillStyle = '#1D4ED8'; ctx.font = `600 28px ${SANSB}`; ctx.fillText(zh ? '↩ 回到原文' : '↩ Back to source', 60, h - 40);
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
    [0, 1, 2, 3].forEach(i => { ctx.fillStyle = i === g ? '#2563EB' : '#E4E2EA'; round(48 + i * 140, h - 108, 124, 62, 14); ctx.fill(); });
    ctx.font = `600 26px ${SANSB}`; ctx.textAlign = 'center';
    (zh ? ['重来', '困难', '良好', '简单'] : ['Again', 'Hard', 'Good', 'Easy']).forEach((t, i) => { ctx.fillStyle = i === g ? '#FFFFFF' : '#3D3A48'; ctx.fillText(t, 110 + i * 140, h - 67); });
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
    const ink = (pts, wd) => pencil(ctx, pts, wd, r, '30,27,45');
    for (let k = 0; k < 2; k++) {
      ink([[80, 110], [84, 300]], 13); ink([[80, 112], [175, 106]], 12); ink([[82, 200], [150, 197]], 12);
      ink([[210, 250], [258, 252], [266, 218], [232, 206], [205, 234], [215, 292], [276, 286]], 12);
      ink([[322, 222], [472, 224]], 11); ink([[445, 196], [480, 224], [446, 252]], 11);
      ink([[540, 150], [556, 200], [606, 202], [566, 232], [580, 284], [540, 254], [500, 284], [514, 232], [474, 202], [524, 200], [540, 150]], 10);
    }
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

// A graphite stroke: overlapping jittered dabs give a pencil tooth.
export function pencil(ctx, pts, width, r, color = '42,40,56') {
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(2, Math.hypot(x1 - x0, y1 - y0) / 1.2); for (let k = 0; k < n; k++) seg.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); }
  seg.forEach(([x, y], i) => {
    const t = i / seg.length, press = Math.sin(Math.PI * Math.min(1, t * 1.15)) * .7 + .3;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(${color},${(.08 + r() * .16) * press})`; const s = width * press * (.4 + r() * .6); ctx.fillRect(x + (r() - .5) * width * .8, y + (r() - .5) * width * .8, s * .55, s * .55); }
  });
}

// The KineX workspace as it looks in the app: top bar, reader pane (left) and whiteboard pane (right), in the app's
// light theme. Drawn in a 1600-wide design space. Anchors other code relies on: the reader highlight (returned in
// `hl`), the concept card centred at (1390, 225), the media card around (1180–1510, 520–770).
export const SCREEN = { concept: [1390, 225] };

const UI = {
  font: '"Noto Sans SC", Inter, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  ink: '#1D1D1F', ink2: '#6E6E73', ink3: '#A1A1A6', line: '#E5E5EA', accent: '#0071E3',
  top: '#FFFFFF', readerBg: '#F8F7F2', readerBar: '#FAF9F5', boardBg: '#F5F5F7', dot: '#D2D2D7', tool: '#FBFBFC',
};

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function shadowed(ctx, fn, blur = 24, oy = 6, a = .10) { ctx.save(); ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore(); }

// 20px line icons, stroked in the current strokeStyle
const ICON = {
  move: c => { c.moveTo(10, 2); c.lineTo(10, 18); c.moveTo(2, 10); c.lineTo(18, 10); [[10, 2, 7, 5, 13, 5], [10, 18, 7, 15, 13, 15], [2, 10, 5, 7, 5, 13], [18, 10, 15, 7, 15, 13]].forEach(([x, y, a, b, d, e]) => { c.moveTo(a, b); c.lineTo(x, y); c.lineTo(d, e); }); },
  text: c => { c.roundRect(3, 3, 14, 14, 2.5); c.moveTo(7, 7.5); c.lineTo(13, 7.5); c.moveTo(10, 7.5); c.lineTo(10, 14); },
  pen: c => { c.moveTo(6, 13); c.lineTo(6, 9); c.lineTo(10, 4); c.lineTo(14, 9); c.lineTo(14, 13); c.moveTo(10, 4); c.lineTo(10, 9); c.moveTo(4, 17); c.lineTo(16, 17); },
  marker: c => { c.moveTo(6, 14); c.lineTo(6, 7); c.lineTo(11, 4); c.lineTo(14, 7); c.lineTo(14, 14); c.moveTo(4, 17); c.lineTo(16, 17); },
  eraser: c => { c.moveTo(3, 13); c.lineTo(10, 5); c.lineTo(16, 10); c.lineTo(10, 16); c.lineTo(6, 16); c.closePath(); c.moveTo(11, 17); c.lineTo(17, 17); },
  select: c => { c.setLineDash([2.6, 2.4]); c.roundRect(3, 3, 14, 14, 1.5); },
  group: c => { c.roundRect(2.5, 2.5, 15, 15, 3); c.roundRect(6, 6, 5, 5, 1); c.roundRect(9, 9, 5, 5, 1); },
  undo: c => { c.moveTo(7, 5); c.lineTo(3, 9); c.lineTo(7, 13); c.moveTo(3, 9); c.lineTo(12, 9); c.quadraticCurveTo(17, 9, 17, 14); },
  redo: c => { c.moveTo(13, 5); c.lineTo(17, 9); c.lineTo(13, 13); c.moveTo(17, 9); c.lineTo(8, 9); c.quadraticCurveTo(3, 9, 3, 14); },
  cursor: c => { c.moveTo(5, 3); c.lineTo(5, 16); c.lineTo(9, 12.5); c.lineTo(12, 18); c.lineTo(14, 17); c.lineTo(11, 11.5); c.lineTo(16, 11.5); c.closePath(); },
  ibeam: c => { c.roundRect(3, 3, 14, 14, 2.5); c.moveTo(8, 6.5); c.lineTo(12, 6.5); c.moveTo(8, 13.5); c.lineTo(12, 13.5); c.moveTo(10, 6.5); c.lineTo(10, 13.5); },
  cols: c => { c.moveTo(4, 4); c.lineTo(4, 16); c.moveTo(16, 4); c.lineTo(16, 16); c.moveTo(10, 7); c.lineTo(10, 13); },
  more: c => { [5, 10, 15].forEach(x => { c.moveTo(x + 1.2, 10); c.arc(x, 10, 1.2, 0, 6.29); }); },
  chevron: c => { c.moveTo(5, 8); c.lineTo(10, 13); c.lineTo(15, 8); },
  search: c => { c.arc(9, 9, 5, 0, 6.29); c.moveTo(13, 13); c.lineTo(17, 17); },
  split: c => { c.roundRect(3, 4, 14, 12, 2); c.moveTo(10, 4); c.lineTo(10, 16); },
  close: c => { c.moveTo(5, 5); c.lineTo(15, 15); c.moveTo(15, 5); c.lineTo(5, 15); },
  copy: c => { c.roundRect(6, 6, 10, 11, 2); c.moveTo(4, 13); c.lineTo(4, 5); c.quadraticCurveTo(4, 3, 6, 3); c.lineTo(12, 3); },
  gear: c => { c.arc(10, 10, 3, 0, 6.29); c.moveTo(16.5, 10); c.arc(10, 10, 6.5, 0, 6.29); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.moveTo(10 + Math.cos(a) * 6.5, 10 + Math.sin(a) * 6.5); c.lineTo(10 + Math.cos(a) * 8.3, 10 + Math.sin(a) * 8.3); } },
  dots: c => { [5, 10, 15].forEach(x => { c.moveTo(x + 1.3, 10); c.arc(x, 10, 1.3, 0, 6.29); }); },
  menu: c => { [6, 10, 14].forEach(y => { c.moveTo(5, y); c.lineTo(15, y); }); },
  expand: c => { c.moveTo(11, 4); c.lineTo(16, 4); c.lineTo(16, 9); c.moveTo(16, 4); c.lineTo(10, 10); c.moveTo(9, 16); c.lineTo(4, 16); c.lineTo(4, 11); c.moveTo(4, 16); c.lineTo(10, 10); },
  sun: c => { c.arc(10, 10, 3.5, 0, 6.29); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.moveTo(10 + Math.cos(a) * 6, 10 + Math.sin(a) * 6); c.lineTo(10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8); } },
  back: c => { c.moveTo(8, 5); c.lineTo(4, 9); c.lineTo(8, 13); c.moveTo(4, 9); c.lineTo(12, 9); c.quadraticCurveTo(16, 9, 16, 13); c.lineTo(16, 15); },
  play: c => { c.moveTo(7, 5); c.lineTo(15, 10); c.lineTo(7, 15); c.closePath(); },
};
function icon(ctx, name, x, y, color, size = 20, lw = 1.6, fill = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 20, size / 20);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ICON[name](ctx); fill ? ctx.fill() : ctx.stroke(); ctx.restore();
}
function toolbar(ctx, cx, y, items, active) {
  const B = 34, G = 6, SEP = 13;
  const w = items.reduce((a, it) => a + (it === '|' ? SEP : B + G), 0) - G + 16;
  const x0 = cx - w / 2;
  shadowed(ctx, () => { ctx.fillStyle = UI.tool; rr(ctx, x0, y, w, 46, 14); ctx.fill(); }, 22, 6, .09);
  ctx.strokeStyle = 'rgba(0,0,0,.05)'; ctx.lineWidth = 1; rr(ctx, x0 + .5, y + .5, w - 1, 45, 14); ctx.stroke();
  let x = x0 + 8;
  items.forEach(it => {
    if (it === '|') { ctx.fillStyle = UI.line; ctx.fillRect(x + SEP / 2 - 6 - .5, y + 13, 1, 20); x += SEP; return; }
    if (it === active) { shadowed(ctx, () => { ctx.fillStyle = UI.accent; rr(ctx, x, y + 6, B, B, 9); ctx.fill(); }, 10, 3, .18); }
    icon(ctx, it, x + 7, y + 13, it === active ? '#FFFFFF' : UI.ink2, 20, 1.6);
    x += B + G;
  });
}
const NO_START = '，。、；：！？）」』”’》…—,.;:!?)';
function wrap(ctx, text, x, y, maxW, lh, cjk) {
  const units = cjk ? [...text] : text.split(/(\s+)/);
  let line = '', yy = y;
  for (const u of units) {
    const t = line + u;
    // CJK line breaking: punctuation never starts a line (it may overhang the margin slightly instead)
    if (ctx.measureText(t).width > maxW && line && !(cjk && NO_START.includes(u))) { ctx.fillText(line.trimEnd(), x, yy); yy += lh; line = u.trimStart(); } else line = t;
  }
  if (line) { ctx.fillText(line, x, yy); yy += lh; }
  return yy;
}
function miniMark(ctx, x, y, s) { // the KineX mark, simplified: a hexagon split into a deep K and light pieces
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  const g = ctx.createRadialGradient(94, 2, 0, 94, 2, 118); g.addColorStop(0, '#7DEBFB'); g.addColorStop(.3, '#22D3EE'); g.addColorStop(.6, '#0EA5E9'); g.addColorStop(.85, '#2563EB'); g.addColorStop(1, '#4338CA');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(50, 4); ctx.lineTo(90, 27); ctx.lineTo(90, 73); ctx.lineTo(50, 96); ctx.lineTo(10, 73); ctx.lineTo(10, 27); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#312E81'; ctx.beginPath(); ctx.moveTo(10, 27); ctx.lineTo(30, 16); ctx.lineTo(30, 84); ctx.lineTo(10, 73); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(70, 14); ctx.lineTo(80, 20); ctx.lineTo(30, 64); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(30, 58); ctx.lineTo(76, 80); ctx.lineTo(64, 88); ctx.lineTo(30, 72); ctx.closePath(); ctx.fill();
  ctx.restore();
}

const TXT = {
  zh: { title: '恒星的一生', file: '恒星的余烬.epub', ch: '第 3 章　恒星的余烬', board: '主白板',
    p1: '宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来：碳、氧、硅，直到铁。',
    p2a: '铁是终点。聚变到这里不再放出能量，核心在几秒内塌缩，外层被炸向星际空间。所以，',
    hl: ['你血液里的铁，来自一颗早已', '死去的恒星。'],
    p3: '这些元素在星云里重新聚集，形成新的恒星、行星，和我们。你骨骼里的钙，也曾是某颗星的一部分。',
    ex: '你血液里的铁，来自一颗早已死去的恒星。', exSrc: '恒星的余烬 · 第 47 页', concept: '超新星核合成', conceptK: '概念',
    video: '天体物理导论 · 第 7 讲', play: '播放' },
  en: { title: 'Life of a star', file: 'Embers of stars.epub', ch: 'Chapter 3 — Embers of stars', board: 'Main board',
    p1: 'In the beginning there was almost only hydrogen and helium. Everything heavier was forged inside stars: carbon, oxygen, silicon, and finally iron.',
    p2a: 'Iron is where fusion stops paying. The core collapses within seconds and the shell is blown into space. So',
    hl: ['the iron in your blood came from', 'a star that died long ago.'],
    p3: 'Those elements gather again in nebulae, forming new stars, planets — and us. The calcium in your bones was once part of a star.',
    ex: 'The iron in your blood came from a star that died long ago.', exSrc: 'Embers of stars · p.47', concept: 'Supernova nucleosynthesis', conceptK: 'Concept',
    video: 'Astrophysics · Lecture 7', play: 'Play' },
};

export function drawScreen(ctx, w, h, lang) {
  const zh = lang === 'zh', L = TXT[zh ? 'zh' : 'en'];
  const s = w / 1600; ctx.save(); ctx.scale(s, s); const W = 1600, H = h / s;
  const F = (wt, px) => `${wt} ${px}px ${UI.font}`;
  const SERIF = zh ? '"Noto Serif SC", "Songti SC", serif' : '"Instrument Serif", Georgia, serif';

  // ---- top bar
  ctx.fillStyle = UI.top; ctx.fillRect(0, 0, W, 52); ctx.fillStyle = UI.line; ctx.fillRect(0, 51, W, 1);
  miniMark(ctx, 22, 15, 22);
  ctx.fillStyle = UI.ink; ctx.font = F(700, 17); ctx.fillText('KineX', 52, 32);
  ctx.fillStyle = '#F0F0F2'; rr(ctx, 110, 17, 70, 20, 5); ctx.fill(); ctx.fillStyle = UI.ink2; ctx.font = F(500, 11); ctx.fillText('v0.1.0-alpha', 116, 31);
  ctx.fillStyle = UI.ink; ctx.font = F(600, 16); ctx.textAlign = 'center'; ctx.fillText(L.title, W / 2, 32); ctx.textAlign = 'left';
  icon(ctx, 'copy', 1494, 16, UI.ink2, 19); icon(ctx, 'gear', 1528, 16, UI.ink2, 19); icon(ctx, 'dots', 1562, 16, UI.ink2, 19);

  // ---- reader pane
  const RW = 748;
  ctx.fillStyle = UI.readerBg; ctx.fillRect(0, 52, RW, H - 52);
  ctx.fillStyle = UI.readerBar; ctx.fillRect(0, 52, RW, 36); ctx.fillStyle = '#ECEBE6'; ctx.fillRect(0, 87, RW, 1);
  ctx.fillStyle = UI.ink; ctx.font = F(600, 13); ctx.textAlign = 'center'; ctx.fillText(L.file, RW / 2, 75); ctx.textAlign = 'left';
  icon(ctx, 'search', 660, 61, UI.ink2, 17); icon(ctx, 'split', 688, 61, UI.ink2, 17); icon(ctx, 'close', 716, 61, UI.ink2, 17);
  // the page
  const PX = 64, PW = RW - 128;
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(PX, 104, PW, H); }, 30, 8, .08);
  ctx.strokeStyle = 'rgba(0,0,0,.05)'; ctx.strokeRect(PX + .5, 104.5, PW - 1, H);
  toolbar(ctx, RW / 2, 112, ['cursor', '|', 'ibeam', 'marker', 'eraser', '|', 'undo', 'redo', '|', 'cols', 'more', 'chevron'], 'ibeam');
  ctx.fillStyle = '#9B968A'; ctx.font = `500 14px "JetBrains Mono", monospace`; ctx.fillText(L.ch.toUpperCase(), PX + 46, 198); ctx.textAlign = 'right'; ctx.fillText('47', PX + PW - 46, 198); ctx.textAlign = 'left';
  ctx.fillStyle = '#1F1C2A'; ctx.font = zh ? `500 24px ${SERIF}` : `400 28px ${SERIF}`;
  const lh = zh ? 44 : 38, mw = PW - 92, tx = PX + 46;
  let y = wrap(ctx, L.p1, tx, 246, mw, lh, zh) + 16;
  y = wrap(ctx, L.p2a, tx, y, mw, lh, zh);
  const hlBox = [];
  L.hl.forEach((t, i) => {
    const tw = ctx.measureText(t).width, yy = y + i * lh;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(34,211,238,.42)'; rr(ctx, tx - 4, yy - (zh ? 30 : 27), tw + 8, zh ? 40 : 36, 4); ctx.fill(); ctx.restore();
    hlBox.push([tx - 4, yy - 30, tw + 8, 40]);
    ctx.fillStyle = '#1F1C2A'; ctx.fillText(t, tx, yy);
  });
  y += lh * 2 + 16;
  wrap(ctx, L.p3, tx, y, mw, lh, zh);
  // bottom-left pane controls
  [['menu', 18], ['expand', 54]].forEach(([n, x]) => { shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, x, H - 52, 30, 30, 8); ctx.fill(); }, 8, 2, .08); icon(ctx, n, x + 6, H - 46, UI.ink, 18); });

  // ---- divider + board pane
  const BX = RW + 4;
  ctx.fillStyle = UI.line; ctx.fillRect(RW, 52, 4, H - 52);
  ctx.fillStyle = UI.boardBg; ctx.fillRect(BX, 52, W - BX, H - 52);
  ctx.fillStyle = UI.dot; for (let gx = BX + 14; gx < W; gx += 26) for (let gy = 70; gy < H; gy += 26) ctx.fillRect(gx, gy, 2, 2);
  // board chip + toolbar + menu
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, BX + 14, 64, 100, 32, 9); ctx.fill(); }, 10, 2, .07);
  ctx.fillStyle = '#90CAF9'; rr(ctx, BX + 26, 74, 12, 12, 3); ctx.fill(); icon(ctx, 'chevron', BX + 40, 73, UI.ink2, 13, 2);
  ctx.fillStyle = UI.ink; ctx.font = F(700, 13); ctx.fillText(L.board, BX + 58, 85);
  toolbar(ctx, (BX + W) / 2, 60, ['move', '|', 'text', 'pen', 'marker', 'eraser', '|', 'select', 'group', '|', 'undo', 'redo'], 'move');
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, W - 50, 62, 36, 36, 9); ctx.fill(); }, 10, 2, .07); icon(ctx, 'dots', W - 42, 70, UI.ink, 20, 1.8);
  shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(W - 34, H - 38, 17, 0, 6.29); ctx.fill(); }, 8, 2, .08); icon(ctx, 'sun', W - 43, H - 47, UI.ink2, 18);

  // cards: white, 10px radius, hairline border, soft shadow
  const card = (x, y, w, h, fn) => { shadowed(ctx, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, x, y, w, h, 10); ctx.fill(); }, 22, 6, .09); ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 1; rr(ctx, x + .5, y + .5, w - 1, h - 1, 10); ctx.stroke(); fn(x, y, w, h); };
  const link = (x0, y0, x1, y1) => { ctx.strokeStyle = UI.accent; ctx.lineWidth = 2.2; ctx.globalAlpha = .75; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1); ctx.stroke(); ctx.globalAlpha = 1; [[x0, y0], [x1, y1]].forEach(([px, py]) => { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.strokeStyle = UI.accent; ctx.lineWidth = 2; ctx.stroke(); }); };
  link(1120, 330, 1250, 225); link(1050, 430, 1180, 640);
  // the excerpt's link back to the page
  ctx.strokeStyle = UI.ink3; ctx.setLineDash([3, 7]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(BX - 30, hlBox[0][1] + 20); ctx.bezierCurveTo(770, 330, 770, 340, 800, 340); ctx.stroke(); ctx.setLineDash([]);
  // excerpt card: coloured retrace stripe, text, source breadcrumb
  card(800, 270, 320, 160, (x, y, w, h) => {
    ctx.save(); rr(ctx, x, y, w, h, 10); ctx.clip(); ctx.fillStyle = '#0EA5E9'; ctx.globalAlpha = .88; ctx.fillRect(x, y, 15, h); ctx.restore();
    icon(ctx, 'back', x + 1, y + h / 2 - 7, '#FFFFFF', 13, 2.2);
    ctx.fillStyle = UI.ink; ctx.font = F(400, 18); wrap(ctx, L.ex, x + 30, y + 40, w - 52, 28, zh);
    ctx.fillStyle = UI.ink3; ctx.font = F(500, 12); ctx.textAlign = 'right'; ctx.fillText(L.exSrc, x + w - 14, y + h - 14); ctx.textAlign = 'left';
  });
  // concept card
  card(1250, 165, 280, 120, (x, y, w) => {
    ctx.fillStyle = UI.ink3; ctx.font = F(500, 12); ctx.fillText(L.conceptK, x + 22, y + 32);
    ctx.fillStyle = UI.ink; ctx.font = F(700, zh ? 25 : 21); wrap(ctx, L.concept, x + 22, y + 72, w - 44, 28, zh);
  });
  // media card: cover, title, play tag
  card(1180, 520, 330, 250, (x, y, w) => {
    ctx.save(); rr(ctx, x + 10, y + 10, w - 20, 166, 7); ctx.clip(); drawSlide(ctx, x + 10, y + 10, w - 20, 166, zh ? 'zh' : 'en', { font: UI.font }); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, x + 22, y + 140, 62, 26, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `500 14px "JetBrains Mono", monospace`; ctx.fillText('12:48', x + 30, y + 158);
    ctx.fillStyle = UI.ink; ctx.font = F(600, 17); ctx.fillText(L.video, x + 18, y + 210);
    ctx.fillStyle = '#EEF4FF'; rr(ctx, x + 18, y + 222, 70, 22, 6); ctx.fill(); icon(ctx, 'play', x + 22, y + 225, UI.accent, 15, 1.8, true); ctx.fillStyle = UI.accent; ctx.font = F(600, 12); ctx.fillText(L.play, x + 42, y + 238);
  });
  ctx.restore();
  return { hl: hlBox.map(b => b.map(v => v * s)), tip: null, scale: s };
}
