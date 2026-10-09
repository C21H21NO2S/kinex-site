// 01 Read — six format plates on a horizontal rail (pinned on desktop, swipe on touch).
import { gsap, ScrollTrigger, reduceMotion } from '../core/scroll.js';
import { getLang } from '../core/prefs.js';
import { slideSVG, inkStroke, ribbonPath, SLIDE } from '../core/art.js';

// the white pen circle drawn over the red giant on the lecture frame; it is written point by point on hover
const INK = inkStroke(SLIDE.giant, SLIDE.row - 1, SLIDE.giantR + 10, SLIDE.giantR + 6);
const frameInk = () => `<svg class="frame-ink" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><path class="rib" d=""/></svg>`;

// a deep-field photo for the web article: faint galaxies on black
function deepField() {
  let r = 7; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const g = Array.from({ length: 46 }, () => { const x = R() * 320, y = R() * 120, s = .6 + R() * 2.2, a = R() * 180, c = R() < .3 ? '255,214,170' : '200,215,255'; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(2)}" ry="${(s * (.35 + R() * .5)).toFixed(2)}" transform="rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="rgb(${c})" fill-opacity="${(.45 + R() * .5).toFixed(2)}"/>`; }).join('');
  return `<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice"><rect width="320" height="120" fill="#06060E"/>${g}<ellipse cx="210" cy="52" rx="16" ry="6" transform="rotate(-24 210 52)" fill="rgb(255,220,190)" fill-opacity=".35"/><ellipse cx="210" cy="52" rx="5" ry="2.4" transform="rotate(-24 210 52)" fill="#FFE9D2"/></svg>`;
}

const Z = () => getLang() === 'zh';
const T = (zh, en) => (Z() ? zh : en);

// the sentence the PDF plate highlights and turns into an excerpt; split into words (characters in Chinese) so the
// highlight can sweep across it
const EXCERPT = () => T('你血液里的铁，来自一颗早已死去的恒星。', 'the iron in your blood came from a star that died long ago.');
const words = s => (Z() ? [...s] : s.split(/(?<= )/)).map(w => `<span class="w">${w}</span>`).join('');
// the web article's text as word boxes (characters in Chinese, closing punctuation kept with the character before it),
// so the reflow can move each one to its new line
const flow = s => (Z() ? s.match(/.[，。、；：！？）」』”’》…—]*/gu) : s.split(/(?<= )/)).map(w => `<span class="fw">${w}</span>`).join('');

// the lecture plate's player: its A–B loop (where it sits on the timeline, in %; it loops 12:48 → 12:51, 3 s at 1×),
// and the hand-drawn play and pause glyphs of its control (pathLength 1, so each stroke can be drawn on). Nothing is
// laid over the frame, as in KineX: the frame is where the pen writes once the lecture is paused.
const AB = [38, 56], AB_T = [768, 771], PH0 = 38.6;
// a hand's speed along a stroke: off quickly, fastest midway, easing into its end (the minimum-jerk profile)
const handEase = t => t * t * t * (t * (6 * t - 15) + 10);
const PLAY_D = ['M37 27 Q55 38 72.5 49.5 Q55 61.5 37.5 72.5 Q35.4 50 38 25.5'];
const PAUSE_D = ['M40.5 28.5 Q41.6 50 40.4 71.5', 'M60 28 Q59.2 50.5 60.6 71'];
const strokes = ds => ds.map(d => `<path d="${d}" pathLength="1"/>`).join('');
const PP = `<svg viewBox="22 20 56 60" aria-hidden="true"><g class="i-play">${strokes(PLAY_D)}</g><g class="i-pause">${strokes(PAUSE_D)}</g></svg>`;

const ART = {
  pdf: () => `
    <div class="art pdf">
      <div class="doc back"></div>
      <div class="doc front">
        <div class="h"><span>${T('第 3 章 · 恒星的余烬', 'Ch. 3 · Embers of stars')}</span><span>47</span></div>
        <p class="serif-t">${T('宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来。', 'In the beginning there was almost only hydrogen and helium. Everything heavier was forged, layer by layer, inside stars.')}</p>
        <p class="serif-t">${T('铁是终点。核心在几秒内塌缩，外层被炸向星际空间。所以，', 'Iron is where fusion stops. The core collapses in seconds and the shell is blown into space. So ')}<span class="mark-hl">${words(EXCERPT())}</span></p>
        <div class="ln"></div><div class="ln m"></div><div class="ln s"></div>
        <svg class="margin-ink" viewBox="0 0 60 80"><path d="M30 6 C 12 8, 6 30, 10 46 C 14 66, 44 72, 52 52 C 58 36, 50 12, 30 10"/><path d="M30 26 L 30 46 M30 54 L30 56"/></svg>
        <i class="sel-caret"></i>
      </div>
      <div class="xc"><span class="k">${T('摘录 · 第 47 页', 'Excerpt · p.47')}</span><p>${EXCERPT()}</p><span class="back">↩ ${T('回到原文', 'Back to source')}</span></div>
      <div class="chips"><span class="chip">47 / 268</span><span class="chip">100%</span></div>
    </div>`,
  epub: () => `
    <div class="art epub">
      <div class="spread${epubFont === 'wk' ? ' wk' : ''}">
        <div class="pg l"><span class="cap">${T('星', 'S')}</span><p class="serif-t">${T('星光走了几千年，才把这份记录带到你眼前。天文学家用光谱读出它的成分。', 'tarlight travels for millennia to bring you its record. Astronomers read its make-up from the spectrum.')}</p><div class="ln"></div><div class="ln m"></div></div>
        <div class="pg r"><p class="serif-t">${T('每一条暗线，都是一种元素留下的指纹：氢、钙、铁……', 'Every dark line is the fingerprint of an element: hydrogen, calcium, iron…')}</p><div class="ln"></div><div class="ln"></div><div class="ln s"></div><span class="pno">212</span></div>
      </div>
      <div class="aa">
        <div class="aa-h"><b>Aa</b><span>${T('阅读设置', 'Reading')}</span></div>
        <div class="aa-row"><span>A</span><div class="slider"><i></i></div><span class="big">A</span></div>
        <div class="aa-fonts">
          <button type="button" data-font="orig"${epubFont === 'orig' ? ' class="on"' : ''}><i class="g">${T('文', 'Aa')}</i><small>${T('原版', 'Original')}</small></button>
          <button type="button" data-font="wk"${epubFont === 'wk' ? ' class="on"' : ''}><i class="g">${T('文', 'Aa')}</i><small>${T('霞鹜文楷', 'LXGW WenKai')}</small></button>
          <span><i class="g plus">+</i><small>${T('导入', 'Import')}</small></span>
        </div>
      </div>
    </div>`,
  web: () => `
    <div class="art web${webClean ? ' clean done' : ''}">
      <div class="uiwin">
        <div class="bar2"><i></i><i></i><i></i><button type="button" class="reload" aria-label="${T('重新载入', 'Reload')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 2.6v3h-3"/></svg></button><span class="addr">nightsky.example/olbers</span></div>
        <div class="page">
          <div class="clutter top">AD</div>
          <div class="article">
            <span class="kick">${T('星空杂志 · 6 分钟阅读', 'Night Sky Magazine · 6 min read')}</span>
            <h5>${T('夜空为什么是黑的？', 'Why is the night sky dark?')}</h5>
            <div class="img">${deepField()}</div>
            <p>${flow(T('如果宇宙无限大、恒星无限多，每一条视线最后都会落在一颗星上，夜空应该亮如白昼。这个矛盾叫“奥伯斯佯谬”。', 'If the universe were infinite and full of stars, every line of sight would end on a star and the night would blaze like day. This is Olbers’ paradox.'))}</p>
            <p>${flow(T('答案藏在时间里：', 'The answer lies in time: '))}<mark>${flow(T('宇宙有年龄，远处的星光还在路上。', 'the universe has an age, and distant light is still on its way.'))}</mark></p>
          </div>
          <div class="clutter side"><i></i><i></i><i></i></div>
        </div>
      </div>
      <div class="clip-badge"><span>✓</span>${T('已存入「恒星的一生」', 'Saved to “Life of a star”')}</div>
    </div>`,
  md: () => `
    <div class="art md">
      <div class="uiwin">
        <div class="bar2"><i></i><i></i><i></i><span class="addr">${T('恒星的光度.md', 'luminosity.md')}</span></div>
        <div class="split">
          <pre class="src"><b>## </b>${T('恒星的光度', 'Luminosity')}
<b>- </b>${T('半径', 'radius')} R
<b>- </b>${T('表面温度', 'surface temp.')} T

<b>$$</b>
L = 4\\pi R^2 \\sigma T^4
<b>$$</b>

<b>\`\`\`</b>py
L = 4*pi*R**2*sigma*T**4
<b>\`\`\`</b></pre>
          <div class="out">
            <h6>${T('恒星的光度', 'Luminosity')}</h6>
            <ul><li>${T('半径', 'radius')} <i>R</i></li><li>${T('表面温度', 'surface temp.')} <i>T</i></li></ul>
            <div class="tex"><i>L</i> = 4<i>π</i><i>R</i><sup>2</sup><i>σ</i><i>T</i><sup>4</sup></div>
            <code>L = 4*pi*R**2*sigma*T**4</code>
          </div>
        </div>
      </div>
    </div>`,
  media: () => `
    <div class="art media">
      <div class="player">
        <div class="frame">${slideSVG(getLang())}${frameInk()}<span class="chip t">12:48</span></div>
        <div class="tl"><div class="ab" style="left:${AB[0]}%;right:${100 - AB[1]}%"></div><i style="left:12%"></i><i style="left:${AB[0]}%"></i><i style="left:${AB[1]}%"></i><i style="left:81%"></i><b></b></div>
        <div class="ctrls"><span class="pp">${PP}</span><span class="tm">12:48 / 52:10</span><span class="abl">A–B</span><span>±5s</span><span>1×</span></div>
      </div>
      <div class="cap-card"><div class="mini-frame">${slideSVG(getLang(), { labels: false })}</div><div><b>${T('截帧 · 12:48', 'Frame · 12:48')}</b><span>${T('红巨星：恒星的晚年', 'Red giant: a star’s old age')}</span></div></div>
    </div>`,
  search: () => `
    <div class="art search">
      <div class="sbox"><span class="ico">⌕</span><span class="q">${T('铁', 'iron')}</span><span class="caret"></span><span class="kbd">Ctrl K</span></div>
      <div class="results">
        <div class="res"><span class="src pdf">PDF</span><div><b>${T('恒星的余烬', 'Embers of stars')} · p.47</b><p>${T('……你血液里的<mark>铁</mark>，来自一颗早已死去的恒星。', '…the <mark>iron</mark> in your blood came from a star that died long ago.')}</p></div></div>
        <div class="res"><span class="src vid">${T('视频', 'Video')}</span><div><b>${T('天体物理导论 · 12:48', 'Astrophysics · 12:48')}</b><p>${T('聚变走到<mark>铁</mark>就停了……', 'fusion stops at <mark>iron</mark>…')}</p></div></div>
        <div class="res"><span class="src brd">${T('白板', 'Board')}</span><div><b>${T('超新星核合成', 'Supernova nucleosynthesis')}</b><p>${T('比<mark>铁</mark>更重的元素……', 'elements heavier than <mark>iron</mark>…')}</p></div></div>
        <div class="res"><span class="src card">${T('闪卡', 'Card')}</span><div><b>${T('你血液里的铁，最初在哪里形成？', 'Where did the iron in your blood first form?')}</b></div></div>
      </div>
    </div>`,
};

// the e-book plate's typeface: LXGW WenKai, as KineX can set a book in, or the book's own
let epubFont = 'wk';
// the web plate: once seen, the clutter is gone for good (a repaint for a new language keeps it gone)
let webClean = false;
function paint() {
  document.querySelectorAll('article[data-plate]').forEach(pl => { pl.querySelector('.plate-art').innerHTML = ART[pl.dataset.plate](); });
}

export function initRead() {
  paint();
  addEventListener('kx:lang', paint);
  document.querySelector('article[data-plate="epub"]')?.addEventListener('click', e => {
    const b = e.target.closest('.aa-fonts [data-font]');
    if (!b || b.dataset.font === epubFont) return;
    epubFont = b.dataset.font;
    const art = b.closest('.epub'), spread = art.querySelector('.spread');
    art.querySelectorAll('.aa-fonts [data-font]').forEach(x => x.classList.toggle('on', x === b));
    spread.classList.toggle('wk', epubFont === 'wk');
    spread.classList.remove('swap'); void spread.offsetWidth; spread.classList.add('swap'); // the pages settle into the new face
  });
  // the artworks are laid out at 440 px and scaled to the plate
  const fit = new ResizeObserver(es => es.forEach(e => e.target.style.setProperty('--pk', (e.contentRect.width / 440).toFixed(4))));
  document.querySelectorAll('#readRail .plate-art').forEach(el => fit.observe(el));
  const pin = document.getElementById('readPin'), rail = document.getElementById('readRail');
  const num = document.getElementById('readNum'), prog = document.getElementById('readProg');
  const plates = [...rail.children];
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const dist = () => Math.max(0, rail.scrollWidth - innerWidth);
    const tw = gsap.to(rail, { x: () => -dist(), ease: 'none' });
    const st = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: reduceMotion ? true : .6, animation: tw, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: self => { prog.style.transform = `scaleX(${self.progress})`; num.textContent = String(Math.min(plates.length, 1 + Math.round(self.progress * (plates.length - 1)))).padStart(2, '0'); },
    });
    return () => { st.kill(); tw.kill(); gsap.set(rail, { x: 0 }); };
  });
  mm.add('(max-width: 900px)', () => {
    pin.classList.add('swipe');
    const onScroll = () => { const p = pin.scrollLeft / Math.max(1, pin.scrollWidth - pin.clientWidth); prog.style.transform = `scaleX(${p})`; num.textContent = String(1 + Math.round(p * (plates.length - 1))).padStart(2, '0'); };
    pin.addEventListener('scroll', onScroll, { passive: true });
    return () => { pin.classList.remove('swipe'); pin.removeEventListener('scroll', onScroll); };
  });

  // ---- demos. A plate's demo (the excerpt sweep, the ads clearing, the lecture playing) runs once the plate has
  // settled in view, one plate at a time: several plates are on screen together on a wide display, and their demos
  // all at once were too much to follow. Plates queue in reading order; one that leaves before its turn drops out. What
  // the reader starts (a click, a hover) plays at once. On a mouse, hovering a plate lifts it a little ('hot'); on
  // touch, the plate in view is the hot one (a tap fired enter and leave back to back).
  const touch = matchMedia('(hover: none)').matches;
  const byName = n => plates.find(p => p.dataset.plate === n);
  const demos = {}, plays = {}, away = {};
  const setHot = (pl, on, how) => { if (pl.classList.contains('hot') === on) return; pl.classList.toggle('hot', on); demos[pl.dataset.plate]?.(on, how); };
  plates.forEach(pl => {
    pl.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setHot(pl, true, 'hover'); });
    pl.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setHot(pl, false, 'hover'); });
  });
  const queue = new Set();
  let running = false;
  async function runQueue() {
    if (running) return;
    running = true;
    while (queue.size) {
      const pl = [...queue].sort((x, y) => plates.indexOf(x) - plates.indexOf(y))[0];
      queue.delete(pl);
      if (!pl.dataset.inView) continue;
      const done = plays[pl.dataset.plate]?.();
      if (done) await Promise.race([done, new Promise(r => setTimeout(r, 9000))]).then(() => new Promise(r => setTimeout(r, 350)));
    }
    running = false;
  }
  // in view: the picture (nearly) all on screen for a moment; a swipe still gliding, or a plate half on screen, is not
  const dwell = new Map();
  const seen = new IntersectionObserver(es => es.forEach(e => {
    const pl = e.target.closest('.fmt'), n = pl.dataset.plate, r = e.intersectionRatio;
    if (r >= .6 && touch) setHot(pl, true, 'view');
    if (r >= .9) {
      if (!pl.dataset.inView && !dwell.has(pl)) dwell.set(pl, setTimeout(() => { dwell.delete(pl); pl.dataset.inView = 1; queue.add(pl); runQueue(); }, 450));
    } else { clearTimeout(dwell.get(pl)); dwell.delete(pl); }
    if (r < .3) { delete pl.dataset.inView; queue.delete(pl); away[n]?.(r); if (touch) setHot(pl, false, 'view'); }
  }), { threshold: [0, .3, .6, .9] });
  plates.forEach(pl => seen.observe(pl.querySelector('.plate-art')));

  // PDF: a selection caret sweeps the highlight across the sentence, which then lifts off the page as an excerpt card.
  // It plays the first time the plate is seen, and again on hover; the excerpt stays.
  const pdfArt = () => byName('pdf').querySelector('.pdf');
  let pdfTl = null, pdfPlayed = false;
  function pdfHide() {
    const a = pdfArt();
    gsap.set(a.querySelectorAll('.mark-hl .w'), { backgroundSize: '0% 100%' });
    gsap.set([a.querySelector('.xc'), a.querySelector('.sel-caret')], { autoAlpha: 0 });
  }
  function pdfPlay() {
    if (reduceMotion || pdfTl?.isActive()) return null;
    pdfPlayed = true;
    const a = pdfArt(), ws = [...a.querySelectorAll('.mark-hl .w')], card = a.querySelector('.xc'), caret = a.querySelector('.sel-caret'), doc = a.querySelector('.doc.front');
    pdfHide();
    const tl = pdfTl = gsap.timeline(), total = ws.reduce((t, w) => t + w.offsetWidth, 0);
    tl.set(caret, { x: ws[0].offsetLeft, y: ws[0].offsetTop, height: ws[0].offsetHeight }, 0).to(caret, { autoAlpha: 1, duration: .2 }, .1);
    let at = .4;
    ws.forEach(w => {
      const d = 1.15 * w.offsetWidth / total;
      tl.set(caret, { x: w.offsetLeft, y: w.offsetTop, height: w.offsetHeight }, at) // at a line break the caret moves down
        .to(w, { backgroundSize: '100% 100%', duration: d, ease: 'none' }, at)
        .to(caret, { x: w.offsetLeft + w.offsetWidth, duration: d, ease: 'none' }, at);
      at += d;
    });
    tl.to(caret, { autoAlpha: 0, duration: .25 }, at + .15);
    // the card starts small on the end of the highlight and settles beside the page
    const last = ws[ws.length - 1], sx = doc.offsetLeft + last.offsetLeft + last.offsetWidth, sy = doc.offsetTop + last.offsetTop;
    tl.fromTo(card, { x: sx - card.offsetLeft - card.offsetWidth / 2, y: sy - card.offsetTop - card.offsetHeight / 2, scale: .3, rotate: -7, autoAlpha: 0 },
      { x: 0, y: 0, scale: 1, rotate: 0, autoAlpha: 1, duration: 1, ease: 'expo.out' }, at + .2);
    return new Promise(res => tl.eventCallback('onComplete', res));
  }
  demos.pdf = on => on && pdfPlay();
  plays.pdf = () => (pdfPlayed ? null : pdfPlay());
  if (!reduceMotion) pdfHide(); // until it is seen

  // Web clipping: a moment after the plate settles in view, the ads and side clutter fade away and the article reflows
  // to the full width. It stays clean while in view; once wholly out of view it is quietly set back, so it plays again
  // next time. The window's reload button (or a click on the window) plays it again now, like reloading the page.
  // The reflow is a FLIP: every piece of the article is measured, the page switches to its clean layout in one step,
  // and each piece glides from where it was to where it now is (transforms only: nothing is laid out per frame). The
  // photo keeps its pixel size and is uncovered as the column widens.
  const webArt = () => byName('web').querySelector('.web');
  let webTl = null, webDone = null;
  const webFinish = () => { webDone?.(); webDone = null; };
  const webPieces = a => [...a.querySelectorAll('.article .kick, .article h5, .article .img, .article .fw')];
  function webClear(delay) {
    webTl?.kill();
    const a = webArt();
    if (reduceMotion) { webClean = true; a.classList.add('clean', 'done'); return null; }
    return new Promise(res => {
      webDone = res;
      const tl = webTl = gsap.timeline({ delay, onComplete: webFinish });
      tl.to(a.querySelectorAll('.clutter'), { opacity: 0, scale: .97, duration: .5, ease: 'power2.inOut', stagger: .08 });
      tl.add(() => {
        const items = webPieces(a), img = a.querySelector('.article .img');
        const k = a.getBoundingClientRect().width / a.offsetWidth || 1; // the plate's scale
        const before = items.map(el => el.getBoundingClientRect()), w0 = img.getBoundingClientRect().width;
        webClean = true; a.classList.add('clean');
        const after = items.map(el => el.getBoundingClientRect()), w1 = img.getBoundingClientRect().width;
        const at = tl.time(), n = items.length;
        items.forEach((el, i) => { // a slight cascade down the article
          const dx = (before[i].left - after[i].left) / k, dy = (before[i].top - after[i].top) / k;
          if (Math.abs(dx) + Math.abs(dy) < .5) return;
          tl.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration: 1.1, ease: 'power3.inOut', force3D: false, immediateRender: true }, at + i / n * .24); // a hundred words: repainted, not a layer each
        });
        tl.fromTo(img, { clipPath: `inset(0px ${((w1 - w0) / k).toFixed(1)}px 0px 0px round 8px)` }, { clipPath: 'inset(0px 0px 0px 0px round 8px)', duration: 1.1, ease: 'power3.inOut', immediateRender: true }, at);
      }, '+=.02');
      tl.add(() => a.classList.add('done'), '+=1.2'); // the saved badge
      tl.to({}, { duration: .55 });
    });
  }
  function webReset() { // back to the cluttered page at once
    webTl?.kill(); webFinish(); webClean = false;
    const a = webArt();
    gsap.set([...a.querySelectorAll('.clutter'), ...webPieces(a)], { clearProps: 'transform,opacity,clipPath' });
    a.classList.add('snap'); a.classList.remove('clean', 'done'); void a.offsetWidth; a.classList.remove('snap');
  }
  plays.web = () => (webClean ? null : webClear(.6));
  away.web = r => { if (r === 0 && !reduceMotion) webReset(); };
  byName('web').addEventListener('click', e => {
    if (!e.target.closest('.uiwin') || reduceMotion) return;
    const a = webArt(), page = a.querySelector('.page');
    gsap.fromTo(a.querySelector('.reload svg'), { rotate: 0 }, { rotate: 360, duration: .8, ease: 'power2.inOut' });
    gsap.timeline().to(page, { opacity: 0, duration: .18 }).add(webReset).to(page, { opacity: 1, duration: .3 }).add(() => webClear(.7));
  });

  // Lecture: click the player to play or pause; the control's ▶ / ❚❚ is drawn on as it changes. While playing, the
  // playhead runs round the A–B loop and the pen's note fades off the frame; paused, the pen circles the red giant on
  // the still frame. It plays for a moment each time it settles in view (scrolled or swiped back to) and pauses when it
  // leaves; a click plays or pauses it. Hover does nothing (playing on hover made the click that followed pause it).
  const media = byName('media'), player = () => media.querySelector('.player');
  let playing = false, ph = PH0, autoStop = 0, mediaDone = null;
  const mediaFinish = () => { mediaDone?.(); mediaDone = null; };
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const paintPh = () => {
    const pl = player(), t = AB_T[0] + (ph - AB[0]) / (AB[1] - AB[0]) * (AB_T[1] - AB_T[0]);
    pl.style.setProperty('--ph', ph.toFixed(2) + '%');
    pl.querySelector('.chip.t').textContent = clock(t);
    pl.querySelector('.tm').textContent = `${clock(t)} / 52:10`;
  };
  // in real time: the 3 s loop takes 3 s
  const tick = (time, dt) => { ph += Math.min(dt, 100) / 1000 * (AB[1] - AB[0]) / (AB_T[1] - AB_T[0]); if (ph >= AB[1]) ph = AB[0] + ph - AB[1]; paintPh(); };
  const drawIcon = () => { // the glyph now showing on the control
    if (reduceMotion) return;
    gsap.fromTo(player().querySelectorAll(`.pp .i-${playing ? 'pause' : 'play'} path`), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .4, ease: 'power2.inOut', stagger: .1 });
  };
  function setPlaying(on, animate = true) {
    clearTimeout(autoStop);
    if (on === playing) return;
    playing = on; player().classList.toggle('playing', on);
    if (on) { gsap.ticker.add(tick); clearInk(animate); } else { gsap.ticker.remove(tick); animate ? writeInk() : showInk(); }
    if (animate) drawIcon();
  }
  // a preview: play 3.2 s, pause, and the pen writes its note; done once the note is written
  plays.media = () => (playing ? null : new Promise(res => {
    mediaDone = res;
    setPlaying(true);
    autoStop = setTimeout(() => { setPlaying(false); gsap.delayedCall(reduceMotion ? 0 : 1.1, mediaFinish); }, 3600); // round the loop once, and on
  }));
  media.addEventListener('click', e => { if (e.target.closest('.player')) { mediaFinish(); setPlaying(!playing); } });
  away.media = () => { mediaFinish(); setPlaying(false, false); };

  // the pen's white circle round the red giant: on the paused frame, written point by point
  let inkTw = null;
  const inkSvg = () => media.querySelector('.frame-ink'), rib = () => media.querySelector('.frame-ink .rib');
  function writeInk() {
    inkTw?.kill(); gsap.set(inkSvg(), { opacity: 1 });
    const o = { k: 0 };
    inkTw = gsap.to(o, { k: INK.length - 1, duration: reduceMotion ? 0 : .75, delay: .18, ease: handEase, onUpdate: () => rib()?.setAttribute('d', ribbonPath(INK, o.k)) });
  }
  function clearInk(animate) {
    inkTw?.kill();
    inkTw = gsap.to(inkSvg(), { opacity: 0, duration: animate && !reduceMotion ? .35 : 0, onComplete: () => rib()?.setAttribute('d', '') });
  }
  function showInk() { if (playing) return; inkTw?.kill(); gsap.set(inkSvg(), { opacity: 1 }); rib()?.setAttribute('d', ribbonPath(INK)); }
  showInk(); paintPh(); // it starts paused at 12:48, with its note on the frame

  // a new language repaints the plates: keep each demo where it was
  addEventListener('kx:lang', () => requestAnimationFrame(() => {
    if (!pdfPlayed && !reduceMotion) pdfHide();
    player().classList.toggle('playing', playing); paintPh(); showInk();
  }));
}
