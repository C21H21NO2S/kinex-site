// 02 Board — draggable cards with live links; 1 / 2 / 4 boards side by side with a cross-board link.
import { gsap, ScrollTrigger, reduceMotion } from '../core/scroll.js';
import { t, getLang } from '../core/prefs.js';
import { slideSVG } from '../core/art.js';

// logical board size; each pane scales it to fit. Pane 0 has a portrait layout for phones.
const SIZE = { land: [1200, 660], port: [420, 620] }; // the phone board stays short enough to scroll past
let LW = 1200, LH = 660;
const CARDS = [
  { id: 'topic', x: 500, y: 64, p: [150, 30], cls: 'topic', body: () => t('board.c5') },
  { id: 'quote', x: 90, y: 190, w: 270, p: [14, 86, 250], cls: 'q', k: 'board.c1k', body: () => t('board.c1') },
  { id: 'concept', x: 520, y: 250, w: 240, p: [190, 206, 216], cls: 'big', k: 'board.c2k', body: () => t('board.c2') },
  { id: 'video', x: 880, y: 110, w: 230, p: [14, 282, 200], k: 'board.c3k', body: () => `<div class="thumb">${slideSVG(getLang())}</div>${t('board.c3')}` },
  { id: 'formula', x: 860, y: 420, w: 230, p: [226, 340, 180], cls: 'f', k: 'board.c4k', body: () => t('board.c4') },
  { id: 'ink', x: 250, y: 430, w: 210, p: [200, 470, 196], k: 'story.ink.idx', body: () => '<svg class="bink" viewBox="0 0 200 70"><path d="M14 18 C 13 30, 14 44, 15 58"/><path d="M13 19 C 22 18, 31 17, 38 18"/><path d="M15 38 C 21 37, 27 37, 33 38"/><path d="M48 50 C 56 50, 64 46, 63 41 C 61 35, 50 36, 48 45 C 47 54, 55 61, 66 56"/><path d="M80 42 C 96 41, 110 41, 124 42 M116 35 L 125 42 L 116 50"/><path d="M152 18 L 156 31 L 170 32 L 159 40 L 163 53 L 152 45 L 141 53 L 145 40 L 134 32 L 148 31 Z"/></svg>' },
];
const LINKS = [['topic', 'quote'], ['topic', 'concept'], ['concept', 'video'], ['concept', 'formula'], ['quote', 'ink']];
const PORTS = '<i class="port t"></i><i class="port r"></i><i class="port b"></i><i class="port l"></i>';
const PANE_COLORS = ['#22D3EE', '#7C83FF', '#F5B66B', '#34D399'];
const RECTS = {
  1: [[0, 0, 1, 1]],
  2: [[0, 0, .5, 1], [.5, 0, .5, 1]],
  4: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
};

export function initBoard() {
  const stage = document.getElementById('boardStage');
  let port = false, pos = {};
  let mode = 1, panes = [], scale = [1, 1, 1, 1], xsvg;
  const links = LINKS.map(l => [...l]);
  let ghost = null, fresh = null, xfresh = null; // the link being pulled out of a card; the link just made (drawn in)
  const xlinks = [{ a: 'concept', b: 'el-Fe' }];
  // the part of pane 0 that is visible, in board coordinates: cards may be dragged anywhere inside it,
  // including the margins around the logical board when the pane is wider or taller than it
  let view = { x0: 0, y0: 0, x1: LW, y1: LH };
  function setOrientation() {
    port = stage.clientWidth < 700;
    [LW, LH] = port ? SIZE.port : SIZE.land;
    pos = Object.fromEntries(CARDS.map(c => [c.id, port ? { x: c.p[0], y: c.p[1] } : { x: c.x, y: c.y }]));
  }

  function paneMarkup(i) {
    const title = [t('board.c5'), t('board.b2'), t('board.b3'), t('board.b4')][i];
    let content = '';
    if (i === 0) {
      content = `<svg class="links-svg" viewBox="0 0 ${LW} ${LH}" preserveAspectRatio="none"></svg>` +
        CARDS.map(c => { const w = port ? c.p[2] : c.w; return `<div class="bcard ${c.cls || ''}" data-id="${c.id}" style="${w ? `width:${w}px;` : ''}">${c.k ? `<span class="k">${t(c.k)}</span>` : ''}${c.body()}${PORTS}</div>`; }).join('');
    } else if (i === 1) {
      const els = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn'];
      content = `<div class="ptable">${els.map(e => `<span data-x="el-${e}">${e}</span>`).join('')}</div>`;
    } else if (i === 2) {
      content = `<div class="obs"><div class="bcard mini" data-x="obs-0" style="left:120px;top:160px">${getLang() === 'zh' ? '猎户座 · 参宿四' : 'Orion · Betelgeuse'}</div><div class="bcard mini" data-x="obs-1" style="left:520px;top:300px">${getLang() === 'zh' ? '红超巨星，可能很快爆发' : 'Red supergiant, may go supernova'}</div><svg class="sketch" viewBox="0 0 400 260"><path d="M60 200 L 120 80 L 200 140 L 260 40 L 340 180"/><circle cx="120" cy="80" r="6"/><circle cx="260" cy="40" r="8"/><circle cx="200" cy="140" r="4"/></svg></div>`;
    } else {
      const items = getLang() === 'zh' ? ['恒星的一生 · 第 3 章', '超新星核合成', '光谱与元素', '第 7 讲笔记'] : ['Life of a star · ch. 3', 'Supernova nucleosynthesis', 'Spectra & elements', 'Lecture 7 notes'];
      content = `<ul class="todo">${items.map((s, k) => `<li class="${todo[k] ? 'done' : ''}" data-x="todo-${k}" role="checkbox" aria-checked="${todo[k]}" tabindex="0"><i></i><span>${s}</span></li>`).join('')}</ul><p class="todo-prog"></p>`;
    }
    const [w, h] = i === 0 ? [LW, LH] : SIZE.land;
    return `<div class="pane" data-pane="${i}"><div class="pane-title"><i style="background:${PANE_COLORS[i]}"></i>${title}</div><div class="pane-content" style="width:${w}px;height:${h}px">${content}</div></div>`;
  }

  function build() {
    setOrientation();
    stage.innerHTML = [0, 1, 2, 3].map(paneMarkup).join('') + '<svg class="xlink" aria-hidden="true"><g class="xls"></g><g class="xghost"></g></svg>';
    panes = [...stage.querySelectorAll('.pane')];
    xsvg = stage.querySelector('.xlink');
    panes.forEach((p, i) => { if (i > 0) gsap.set(p, { autoAlpha: 0 }); });
    layout(false);
    cacheCards();
    bindDrag();
    bindLinking();
    bindTodo();
    drawLinks();
  }

  function rectFor(i, m) {
    const W = stage.clientWidth, H = stage.clientHeight, pad = 12, gap = 12;
    const R = port && m === 2 ? [[0, 0, 1, .5], [0, .5, 1, .5]] : RECTS[m];
    const r = R[i];
    if (!r) { const r0 = rectFor(Math.min(i, R.length - 1), m); return { ...r0, hidden: true }; }
    const x = pad + r[0] * (W - pad * 2), y = pad + r[1] * (H - pad * 2), w = r[2] * (W - pad * 2), h = r[3] * (H - pad * 2);
    return { left: x + (r[0] > 0 ? gap / 2 : 0), top: y + (r[1] > 0 ? gap / 2 : 0), width: w - (r[2] < 1 ? gap / 2 : 0), height: h - (r[3] < 1 ? gap / 2 : 0) };
  }

  function layout(animate) {
    panes.forEach((p, i) => {
      const r = rectFor(i, mode), show = i < RECTS[mode].length;
      const [w, h] = i === 0 ? [LW, LH] : SIZE.land;
      const s = Math.min(r.width / w, (r.height - 30) / h);
      scale[i] = s;
      const content = p.querySelector('.pane-content');
      const cx = (r.width - w * s) / 2, cy = 30 + (r.height - 30 - h * s) / 2;
      if (i === 0) { const tw = p.querySelector('.pane-title').offsetWidth + 22; view = { x0: -cx / s, y0: -cy / s, x1: (r.width - cx) / s, y1: (r.height - cy) / s, tx: (tw - cx) / s, ty: (34 - cy) / s }; }
      const props = { left: r.left, top: r.top, width: r.width, height: r.height };
      if (animate && !reduceMotion) {
        gsap.to(p, { ...props, autoAlpha: show ? 1 : 0, duration: 1, ease: 'expo.inOut', delay: show && i > 0 ? .15 + i * .06 : 0 });
        gsap.to(content, { x: cx, y: cy, scale: s, duration: 1, ease: 'expo.inOut', transformOrigin: '0 0', onUpdate: i === 0 ? drawCross : null });
      } else {
        gsap.set(p, { ...props, autoAlpha: show ? 1 : 0 });
        gsap.set(content, { x: cx, y: cy, scale: s, transformOrigin: '0 0' });
      }
    });
    if (animate) gsap.delayedCall(1.05, drawCross); else drawCross();
    // cards left in a margin that the new layout no longer shows glide back into view
    if (!sizes.topic) return;
    CARDS.forEach(c => {
      const el = els[c.id], to = { x: clampX(pos[c.id].x, el), y: clampY(pos[c.id].y, el) };
      if (to.x === pos[c.id].x && to.y === pos[c.id].y) return;
      if (animate && !reduceMotion) gsap.to(pos[c.id], { ...to, duration: 1, ease: 'expo.inOut', onUpdate: drawLinks });
      else { Object.assign(pos[c.id], to); drawLinks(); }
    });
  }

  // card elements and sizes are cached: reading offsetWidth while dragging would force a layout every frame
  const els = {}, sizes = {};
  function cacheCards() { CARDS.forEach(c => { const el = panes[0].querySelector(`[data-id="${c.id}"]`); els[c.id] = el; sizes[c.id] = [el.offsetWidth, el.offsetHeight]; }); }
  function cardEl(id) { return els[id]; }
  function placeCards() { CARDS.forEach(c => { els[c.id].style.transform = `translate3d(${pos[c.id].x}px, ${pos[c.id].y}px, 0)`; }); }

  function anchor(id) {
    const [w, h] = sizes[id], p = pos[id];
    return { cx: p.x + w / 2, cy: p.y + h / 2, w, h, x: p.x, y: p.y };
  }
  function edgePoint(a, b) { // point on a's border toward b
    const dx = b.cx - a.cx, dy = b.cy - a.cy, sx = (a.w / 2) / Math.abs(dx || 1e-6), sy = (a.h / 2) / Math.abs(dy || 1e-6), s = Math.min(sx, sy);
    return [a.cx + dx * s, a.cy + dy * s];
  }
  // a link leaves and enters each card square to the side it crosses; the midpoint carries its delete button
  function curve(x1, y1, x2, y2) {
    const horiz = Math.abs(x2 - x1) > Math.abs(y2 - y1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const [c1, c2] = horiz ? [[mx, y1], [mx, y2]] : [[x1, my], [x2, my]];
    return { d: `M${x1},${y1} C${c1} ${c2} ${x2},${y2}`, mid: [(x1 + 3 * c1[0] + 3 * c2[0] + x2) / 8, (y1 + 3 * c1[1] + 3 * c2[1] + y2) / 8] };
  }
  function drawLinks() {
    placeCards();
    const svg = panes[0].querySelector('.links-svg');
    svg.innerHTML = links.map(([a, b], i) => {
      const A = anchor(a), B = anchor(b), [x1, y1] = edgePoint(A, B), [x2, y2] = edgePoint(B, A), { d, mid } = curve(x1, y1, x2, y2);
      return `<g class="lk${fresh === i ? ' fresh' : ''}" data-i="${i}"><path class="hit" d="${d}"/><path class="ln" d="${d}"/><circle cx="${x1}" cy="${y1}" r="4"/><circle cx="${x2}" cy="${y2}" r="4"/>` +
        `<g class="del" transform="translate(${mid[0]} ${mid[1]})"><circle r="10"/><path d="M-3.5,-3.5 L3.5,3.5 M3.5,-3.5 L-3.5,3.5"/></g></g>`;
    }).join('');
    drawCross();
  }

  // pull a new link out of a card's edge and drop it on another card — on this board or on any board beside it
  // (an element, a note, a list item). The loose end is drawn in stage coordinates so it can cross boards.
  function bindLinking() {
    const content = panes[0].querySelector('.pane-content');
    content.querySelectorAll('.port').forEach(port => {
      const el = port.closest('.bcard'), id = el.dataset.id;
      let target = null;
      const targetAt = e => {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const card = hit?.closest('[data-pane="0"] .bcard[data-id]');
        if (card) return card === el ? null : card;
        const x = hit?.closest('[data-x]');
        return x && +x.closest('.pane').dataset.pane < RECTS[mode].length ? x : null;
      };
      port.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); port.setPointerCapture(e.pointerId);
        const sr = stage.getBoundingClientRect(), pr = port.getBoundingClientRect();
        const x1 = pr.left + pr.width / 2 - sr.left, y1 = pr.top + pr.height / 2 - sr.top;
        ghost = { x1, y1, x2: x1, y2: y1 }; el.classList.add('linking');
        document.querySelector('.board .hint')?.classList.add('used');
        drawGhost();
      });
      port.addEventListener('pointermove', e => {
        if (!ghost) return;
        const sr = stage.getBoundingClientRect(); ghost.x2 = e.clientX - sr.left; ghost.y2 = e.clientY - sr.top;
        const next = targetAt(e);
        if (next !== target) { target?.classList.remove('target'); next?.classList.add('target'); target = next; }
        drawGhost();
      });
      const end = () => {
        if (!ghost) return;
        el.classList.remove('linking');
        const t0 = target; target?.classList.remove('target'); target = null;
        if (t0) {
          ghost = null; drawGhost();
          if (t0.dataset.id) { // a card on this board
            const to = t0.dataset.id, k = links.findIndex(([a, b]) => (a === id && b === to) || (a === to && b === id));
            if (k >= 0) { drawLinks(); const g = panes[0].querySelector(`.lk[data-i="${k}"] .ln`); gsap.fromTo(g, { strokeWidth: 4 }, { strokeWidth: 1.6, duration: .8, ease: 'power2.out' }); return; }
            links.push([id, to]); fresh = links.length - 1; drawLinks();
            drawIn(panes[0].querySelector('.lk.fresh .ln'), () => { fresh = null; });
          } else { // across boards
            const to = t0.dataset.x, k = xlinks.findIndex(l => l.a === id && l.b === to);
            if (k >= 0) { drawCross(); const g = xsvg.querySelector(`.xl[data-i="${k}"] .ln`); if (g) gsap.fromTo(g, { strokeWidth: 4 }, { strokeWidth: 1.6, duration: .8, ease: 'power2.out' }); return; }
            xlinks.push({ a: id, b: to }); xfresh = xlinks.length - 1; drawCross();
            drawIn(xsvg.querySelector('.xl.fresh .ln'), () => { xfresh = null; drawCross(); });
          }
          return;
        }
        // nothing under the pointer: the loose end springs back into the card
        const g = ghost;
        if (reduceMotion) { ghost = null; drawGhost(); return; }
        gsap.to(g, { x2: g.x1, y2: g.y1, duration: .35, ease: 'power3.in', onUpdate: drawGhost, onComplete: () => { if (ghost === g) ghost = null; drawGhost(); } });
      };
      port.addEventListener('pointerup', end); port.addEventListener('pointercancel', end);
    });
    const remove = (e, sel, list, redraw) => {
      const g = e.target.closest(sel); if (!g) return;
      if (!e.target.closest('.del')) { g.classList.toggle('sel'); return; } // touch: a tap on the link shows its delete button
      const i = +g.dataset.i;
      gsap.to(g, { opacity: 0, duration: reduceMotion ? 0 : .25, onComplete: () => { list.splice(i, 1); fresh = xfresh = null; redraw(); } });
    };
    content.querySelector('.links-svg').addEventListener('click', e => remove(e, '.lk', links, drawLinks));
    xsvg.addEventListener('click', e => remove(e, '.xl', xlinks, drawCross));
  }
  function drawIn(ln, done) {
    if (!ln || reduceMotion) { done(); return; }
    const len = ln.getTotalLength();
    gsap.fromTo(ln, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: .6, ease: 'power2.out', onComplete: () => { ln.style.strokeDasharray = ''; done(); } });
  }
  function drawGhost() {
    const g = xsvg.querySelector('.xghost');
    g.innerHTML = ghost ? `<path class="ghost" d="${curve(ghost.x1, ghost.y1, ghost.x2, ghost.y2).d}"/><circle class="ghost-end" cx="${ghost.x2}" cy="${ghost.y2}" r="5"/>` : '';
  }

  // the review list in the fourth board can be ticked off
  const todo = [true, true, false, false];
  function bindTodo() {
    const list = panes[3].querySelector('.todo'), prog = panes[3].querySelector('.todo-prog');
    const count = () => { const n = todo.filter(Boolean).length; prog.textContent = getLang() === 'zh' ? `已复习 ${n} / ${todo.length}` : `${n} of ${todo.length} reviewed`; };
    list.querySelectorAll('li').forEach((li, k) => {
      const flip = () => { todo[k] = !todo[k]; li.classList.toggle('done', todo[k]); li.setAttribute('aria-checked', String(todo[k])); count(); };
      li.addEventListener('click', flip);
      li.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    });
    count();
  }

  // links that leave this board: from a card's side to an element on another board, in stage coordinates.
  // Only boards on screen show theirs; the group fades with the layout.
  function drawCross() {
    if (!xsvg) return;
    const g = xsvg.querySelector('.xls'), shown = RECTS[mode].length, sr = stage.getBoundingClientRect();
    g.style.opacity = mode > 1 ? 1 : 0;
    const linked = new Set();
    g.innerHTML = mode > 1 ? xlinks.map((l, i) => {
      const t0 = stage.querySelector(`[data-x="${l.b}"]`); if (!t0) return '';
      const pane = +t0.closest('.pane').dataset.pane; if (pane >= shown) return '';
      linked.add(l.b);
      const A = cardEl(l.a).getBoundingClientRect(), B = t0.getBoundingClientRect();
      const ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
      const [p1, p2] = Math.abs(bx - ax) > Math.abs(by - ay)
        ? (bx > ax ? [[A.right, ay], [B.left, by]] : [[A.left, ay], [B.right, by]])
        : (by > ay ? [[ax, A.bottom], [bx, B.top]] : [[ax, A.top], [bx, B.bottom]]);
      const [x1, y1, x2, y2] = [p1[0] - sr.left, p1[1] - sr.top, p2[0] - sr.left, p2[1] - sr.top], { d, mid } = curve(x1, y1, x2, y2);
      return `<g class="xl${xfresh === i ? ' fresh' : ''}" data-i="${i}"><path class="hit" d="${d}"/><path class="ln" d="${d}"/><circle cx="${x1}" cy="${y1}" r="4"/><circle cx="${x2}" cy="${y2}" r="4"/>` +
        `<g class="del" transform="translate(${mid[0]} ${mid[1]})"><circle r="10"/><path d="M-3.5,-3.5 L3.5,3.5 M3.5,-3.5 L-3.5,3.5"/></g></g>`;
    }).join('') : '';
    stage.querySelectorAll('[data-x]').forEach(el => el.classList.toggle('linked', linked.has(el.dataset.x)));
  }

  function bindDrag() {
    panes[0].querySelectorAll('.bcard').forEach(el => {
      const id = el.dataset.id;
      let start = null, vel = { x: 0, y: 0 }, last = null, tick = null;
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        if (tick) { gsap.ticker.remove(tick); tick = null; }
        start = { px: e.clientX, py: e.clientY, x: pos[id].x, y: pos[id].y }; last = { x: e.clientX, y: e.clientY, t: performance.now() };
        el.classList.add('drag'); el.style.zIndex = 5;
        panes[0].querySelectorAll('.bcard.touched').forEach(c => c !== el && c.classList.remove('touched')); el.classList.add('touched');
        stage.querySelector('.hint')?.remove();
        document.querySelector('.board .hint')?.classList.add('used');
      });
      el.addEventListener('pointermove', e => {
        if (!start) return;
        const s = scale[0];
        pos[id].x = clampX(start.x + (e.clientX - start.px) / s, el); pos[id].y = clampY(start.y + (e.clientY - start.py) / s, el);
        const now = performance.now(), dt = Math.max(1, now - last.t);
        vel = { x: (e.clientX - last.x) / dt / s * 16, y: (e.clientY - last.y) / dt / s * 16 }; last = { x: e.clientX, y: e.clientY, t: now };
        drawLinks();
      });
      const end = () => {
        if (!start) return; start = null; el.classList.remove('drag'); el.style.zIndex = '';
        if (reduceMotion) return;
        tick = () => { // inertia with friction
          vel.x *= .9; vel.y *= .9;
          pos[id].x = clampX(pos[id].x + vel.x, el); pos[id].y = clampY(pos[id].y + vel.y, el);
          drawLinks();
          if (Math.abs(vel.x) + Math.abs(vel.y) < .2) { gsap.ticker.remove(tick); tick = null; }
        };
        gsap.ticker.add(tick);
      };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    });
  }
  const clampX = (x, el) => Math.min(view.x1 - sizes[el.dataset.id][0] - 12, Math.max(view.x0 + 12, x));
  // the header strip is free too, except under the pane's title
  const clampY = (y, el) => Math.min(view.y1 - sizes[el.dataset.id][1] - 12, Math.max(pos[el.dataset.id].x < view.tx ? view.ty : view.y0 + 12, y));

  // pane buttons
  document.querySelectorAll('[data-panes]').forEach(b => b.addEventListener('click', () => {
    mode = +b.dataset.panes;
    document.querySelectorAll('[data-panes]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    layout(true);
  }));

  build();
  addEventListener('resize', () => { if ((stage.clientWidth < 700) !== port) build(); else { layout(false); cacheCards(); drawLinks(); } });
  document.fonts.ready.then(() => { cacheCards(); drawLinks(); });
  addEventListener('kx:lang', () => { build(); });
  // a gentle nudge so people see the cards move
  if (!reduceMotion) ScrollTrigger.create({ trigger: stage, start: 'top 60%', once: true, onEnter: () => {
    const p = pos.concept, from = { x: p.x, y: p.y };
    gsap.timeline().to(p, { x: from.x + 46, y: from.y - 18, duration: .9, ease: 'power3.inOut', onUpdate: drawLinks }).to(p, { x: from.x, y: from.y, duration: 1.1, ease: 'expo.out', onUpdate: drawLinks });
  } });
}
