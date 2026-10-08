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

const ART = {
  pdf: () => `
    <div class="art pdf">
      <div class="doc back"></div>
      <div class="doc front">
        <div class="h"><span>${T('第 3 章 · 恒星的余烬', 'Ch. 3 · Embers of stars')}</span><span>47</span></div>
        <p class="serif-t">${T('宇宙诞生之初，几乎只有氢和氦。比它们更重的元素，都要在恒星内部一层层地“烧”出来。', 'In the beginning there was almost only hydrogen and helium. Everything heavier was forged, layer by layer, inside stars.')}</p>
        <p class="serif-t">${T('铁是终点。核心在几秒内塌缩，外层被炸向星际空间。所以，<span class="mark-hl">你血液里的铁，来自一颗早已死去的恒星。</span>', 'Iron is where fusion stops. The core collapses in seconds and the shell is blown into space. So <span class="mark-hl">the iron in your blood came from a star that died long ago.</span>')}</p>
        <div class="ln"></div><div class="ln m"></div><div class="ln s"></div>
        <svg class="margin-ink" viewBox="0 0 60 80"><path d="M30 6 C 12 8, 6 30, 10 46 C 14 66, 44 72, 52 52 C 58 36, 50 12, 30 10"/><path d="M30 26 L 30 46 M30 54 L30 56"/></svg>
      </div>
      <div class="chips"><span class="chip">47 / 268</span><span class="chip">100%</span></div>
    </div>`,
  epub: () => `
    <div class="art epub">
      <div class="spread">
        <div class="pg l"><span class="cap">${T('星', 'S')}</span><p class="serif-t">${T('星光走了几千年，才把这份记录带到你眼前。天文学家用光谱读出它的成分。', 'tarlight travels for millennia to bring you its record. Astronomers read its make-up from the spectrum.')}</p><div class="ln"></div><div class="ln m"></div></div>
        <div class="pg r"><p class="serif-t">${T('每一条暗线，都是一种元素留下的指纹：氢、钙、铁……', 'Every dark line is the fingerprint of an element: hydrogen, calcium, iron…')}</p><div class="ln"></div><div class="ln"></div><div class="ln s"></div><span class="pno">212</span></div>
      </div>
      <div class="aa">
        <div class="aa-h"><b>Aa</b><span>${T('阅读设置', 'Reading')}</span></div>
        <div class="aa-row"><span>A</span><div class="slider"><i></i></div><span class="big">A</span></div>
        <div class="aa-fonts"><span class="on">${T('原版', 'Original')}</span><span>${T('黑体', 'Sans')}</span><span>${T('导入', 'Custom')}</span></div>
      </div>
    </div>`,
  web: () => `
    <div class="art web">
      <div class="uiwin">
        <div class="bar2"><i></i><i></i><i></i><span class="addr">nightsky.example/olbers</span></div>
        <div class="page">
          <div class="clutter top">AD</div>
          <div class="article">
            <span class="kick">${T('星空杂志 · 6 分钟阅读', 'Night Sky Magazine · 6 min read')}</span>
            <h5>${T('夜空为什么是黑的？', 'Why is the night sky dark?')}</h5>
            <div class="img">${deepField()}</div>
            <p>${T('如果宇宙无限大、恒星无限多，每一条视线最后都会落在一颗星上，夜空应该亮如白昼。这个矛盾叫“奥伯斯佯谬”。', 'If the universe were infinite and full of stars, every line of sight would end on a star and the night would blaze like day. This is Olbers’ paradox.')}</p>
            <p>${T('答案藏在时间里：<mark>宇宙有年龄，远处的星光还在路上。</mark>', 'The answer lies in time: <mark>the universe has an age, and distant light is still on its way.</mark>')}</p>
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
        <div class="tl"><div class="ab" style="left:38%;right:44%"></div><i style="left:12%"></i><i style="left:38%"></i><i style="left:56%"></i><i style="left:81%"></i><b style="left:47%"></b></div>
        <div class="ctrls"><span>▶</span><span>12:48 / 52:10</span><span class="abl">A–B</span><span>±5s</span><span>1.25×</span></div>
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

function paint() {
  document.querySelectorAll('article[data-plate]').forEach(pl => { pl.querySelector('.plate-art').innerHTML = ART[pl.dataset.plate](); });
}

export function initRead() {
  paint();
  addEventListener('kx:lang', paint);
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

  // hovering a plate plays its small demo (clutter falls away, the frame gets annotated, …)
  plates.forEach(pl => { pl.addEventListener('pointerenter', () => pl.classList.add('hot')); pl.addEventListener('pointerleave', () => pl.classList.remove('hot')); });
  // the lecture frame: write the circle on hover, clear it on leave; on touch layouts it is simply shown
  const media = plates.find(p => p.dataset.plate === 'media');
  let inkTw = null;
  const rib = () => media.querySelector('.frame-ink .rib');
  const writeInk = () => {
    if (inkTw?.isActive()) return;
    const o = { k: 0 };
    inkTw = gsap.to(o, { k: INK.length - 1, duration: reduceMotion ? 0 : 1.1, ease: 'power1.inOut', onUpdate: () => rib()?.setAttribute('d', ribbonPath(INK, o.k)) });
  };
  media.addEventListener('pointerenter', writeInk);
  // also written once when the plate reaches the middle of the rail
  ScrollTrigger.create({ trigger: pin, start: 'top top', end: () => '+=' + Math.max(1, rail.scrollWidth - innerWidth), onUpdate: self => { if (self.progress > .55 && !media.dataset.inked) { media.dataset.inked = 1; writeInk(); } } });
  const showInk = () => { if (pin.classList.contains('swipe')) rib()?.setAttribute('d', ribbonPath(INK)); };
  showInk(); addEventListener('kx:lang', () => requestAnimationFrame(showInk)); addEventListener('resize', showInk);
}
