// Pet runtime: creates the bears from YB.characters and runs state, movement, particles, bubbles,
// dragging and the animation loop. Behaviors (actions.js, brain.js) build on YB.rt.
YB.rt = (() => {
// knobs a platform shell may override (platform/web.js, platform/desktop.js)
const config = {
  sleepAfter: 45000,     // ms without any user activity before the bears fall asleep
  playAfter: 9000,       // ms without touching the bears before they start playing on their own
  autoplay: true,
  sparkTrail: true,
  rememberPosition: false,
  // where bears wander on their own and where they start (viewport px)
  walkArea: () => ({ x0: 0, x1: innerWidth, y0: innerHeight * .2, y1: innerHeight * .7 }),
  home: () => ({ x: innerWidth / 2, y: innerHeight / 2 }),
};

const bears = Object.values(YB.characters).map(ch => {
  const el = document.createElement('div');
  el.className = 'bear' + (ch.look.armCap ? ' has-cap' : '');
  el.id = ch.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', ch.name);
  el.style.setProperty('--rest', ch.look.restArm + 'deg');
  el.style.setProperty('--sleep-x', ch.look.sleepArm[0] + 'px');
  el.style.setProperty('--sleep-y', ch.look.sleepArm[1] + 'px');
  el.innerHTML = `<div class="shadow"></div><div class="inner">${YB.bearSVG(ch.look, ch.id)}</div>`;
  document.body.append(el);
  const inner = el.querySelector('.inner');
  return { id: ch.id, ch, el, inner, svg: inner.querySelector('svg'), head: el.querySelector('.head'), face: el.querySelector('.face'),
    hidden: false, state: 'normal', timer: 0, x: 0, y: 0, goal: null, dir: 0, runUntil: 0, lastPuff: 0, lastFx: 0, fx: 0, fy: 0, tilt: 0, lean: 0, clicks: [] };
});
const byId = id => bears.find(b => b.id === id);
const shown = () => bears.filter(b => !b.hidden);
const other = b => { const o = bears.find(x => x !== b); return o && !o.hidden ? o : null; };
const rect = b => b.el.getBoundingClientRect();
const center = b => { const r = rect(b); return { x: r.left + r.width / 2, y: r.top + r.height * .43 }; };
const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
const rand = (a, z) => a + Math.random() * (z - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const apart = () => { const s = shown(); if (s.length < 2) return false; const a = center(s[0]), b = center(s[1]); return Math.hypot(a.x - b.x, a.y - b.y) > innerWidth * .6; };
const baseState = () => apart() ? 'sad' : 'normal';
const free = b => !b.hidden && !b.goal && (b.state === 'normal' || b.state === 'sad') && drag?.b !== b;

function setState(b, s, ms) {
  b.el.classList.remove('s-' + b.state);
  b.state = s;
  b.el.classList.add('s-' + s);
  clearTimeout(b.timer);
  if (ms) b.timer = setTimeout(() => setState(b, baseState()), ms);
}
const refresh = () => bears.forEach(b => { if (b.state === 'normal' || b.state === 'sad') setState(b, baseState()); });

// --- movement: bears never teleport, they run to a goal at a fixed speed ---
function setPos(b, x, y) {
  const r = rect(b);
  b.x = clamp(x, 0, innerWidth - r.width);
  b.y = clamp(y, 0, innerHeight - r.height);
  b.el.style.left = b.x + 'px';
  b.el.style.top = b.y + 'px';
}
function moveTo(b, x, y, speed = 320) {
  const r = rect(b);
  b.goal = { x: clamp(x, 0, innerWidth - r.width), y: clamp(y, 0, innerHeight - r.height), speed };
  return new Promise(res => { b.goal.done = res; }); // a newer moveTo replaces the goal, so the old promise just never resolves
}

// --- effects ---
function burst(x, y, chars, color, n = 8, spread = 1.2) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span'), a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * spread, d = 60 + Math.random() * 80;
    p.className = 'particle';
    p.textContent = chars[i % chars.length];
    p.style.cssText = `left:${x}px;top:${y}px;color:${color};font-size:${14 + Math.random() * 16}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    p.onanimationend = () => p.remove();
    document.body.append(p);
  }
}
// something flying from a point into a bear's mouth (fed files)
function flyInto(b, from, chars, n) {
  const c = center(b);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = chars[i % chars.length];
    p.style.cssText = `left:${from.x + rand(-20, 20)}px;top:${from.y + rand(-20, 20)}px;font-size:22px;--dx:${c.x - from.x}px;--dy:${c.y + 20 - from.y}px;animation-duration:.45s`;
    p.onanimationend = () => p.remove();
    document.body.append(p);
  }
}
function puff(b) {
  const r = rect(b), p = document.createElement('span');
  p.className = 'puff';
  p.style.cssText = `left:${r.left + r.width / 2 - b.dir * r.width * .3}px;top:${r.bottom - r.height * .05}px;--dx:${-b.dir * 20}px`;
  p.onanimationend = () => p.remove();
  document.body.append(p);
}
function jump(b) {
  b.inner.classList.remove('jump');
  void b.inner.offsetWidth; // restart animation
  b.inner.classList.add('jump');
  b.el.classList.add('jumping');
}
bears.forEach(b => b.inner.addEventListener('animationend', e => {
  if (e.animationName === 'jump') { b.inner.classList.remove('jump'); b.el.classList.remove('jumping'); }
}));

// speech bubble; with choices it resolves to the picked index (or null if dismissed by a newer bubble / timeout)
function say(b, text, { ms = 2800, choices } = {}) {
  b.el.querySelector('.bubble')?.dispatchEvent(new Event('dismiss'));
  const el = document.createElement('div');
  el.className = 'bubble';
  el.textContent = text;
  el.addEventListener('pointerdown', e => e.stopPropagation()); // don't start dragging the bear
  return new Promise(res => {
    const done = v => { clearTimeout(t); el.remove(); res(v); };
    el.addEventListener('dismiss', () => done(null));
    if (choices) {
      const row = document.createElement('div');
      row.className = 'choices';
      choices.forEach((c, i) => { const btn = document.createElement('button'); btn.textContent = c; btn.onclick = () => done(i); row.append(btn); });
      el.append(row);
    }
    const t = setTimeout(() => done(null), choices ? 15000 : ms);
    b.el.append(el);
    // keep the bubble on screen when the bear stands near an edge
    const r = el.getBoundingClientRect();
    el.style.marginLeft = Math.max(8 - r.left, Math.min(0, innerWidth - 8 - r.right)) + 'px';
  });
}
const hush = b => b.el.querySelector('.bubble')?.dispatchEvent(new Event('dismiss'));

// --- activity: sleeping when nobody is around, playing when nobody touches them ---
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
const activity = { lastActive: Date.now(), lastInteract: Date.now(), manualSleep: false };
function interact() { activity.lastInteract = Date.now(); }
// idle sleep ends on any activity; sleep from a button / menu only ends on a click or key
function wake(force) {
  activity.lastActive = Date.now();
  if (activity.manualSleep && !force) return;
  activity.manualSleep = false;
  bears.forEach(b => { if (b.state === 'sleep') setState(b, 'surprised', 900); });
}
// cursor moves; a fast flick is announced as 'zoom' for the brain (a bear may chase it)
let lastMove = { x: 0, y: 0, t: 0 };
function trackMouse(x, y) {
  const now = performance.now(), dt = now - lastMove.t;
  if (dt > 0 && dt < 200 && Math.hypot(x - lastMove.x, y - lastMove.y) / dt > 3) YB.emit('zoom', { x, y });
  lastMove = { x, y, t: now };
  mouse.x = x; mouse.y = y;
}
const SPARK_COLORS = ['#ffb3c6', '#ffd97a', '#b8e0ff', '#c9b8ff'];
let lastSpark = 0;
addEventListener('pointerdown', () => wake(true));
addEventListener('keydown', () => wake(true));
addEventListener('pointermove', e => {
  trackMouse(e.clientX, e.clientY);
  wake(false);
  if (!config.sparkTrail || e.timeStamp - lastSpark < 35) return;
  lastSpark = e.timeStamp;
  const s = document.createElement('span');
  s.className = 'spark';
  s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;background:${SPARK_COLORS[Math.random() * 4 | 0]}`;
  s.onanimationend = () => s.remove();
  document.body.append(s);
});

// --- clicking & dragging: the bear runs after the pointer instead of snapping to it ---
function poke(b) {
  interact();
  const now = Date.now(), c = center(b);
  b.clicks = b.clicks.filter(t => now - t < 1500).concat(now);
  if (b.clicks.length >= 5) {
    setState(b, 'angry', 1800);
    burst(c.x + 40, c.y - 50, ['💢'], '#e33', 1, .1);
    return;
  }
  if (b.state === 'angry') return setState(b, 'angry', 1800);
  jump(b);
  setState(b, 'happy', 1200);
  burst(c.x, c.y - 30, b.ch.fx, b.ch.fxColor);
}
let drag = null;
bears.forEach(b => {
  b.el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    interact();
    b.el.setPointerCapture(e.pointerId);
    const r = rect(b);
    drag = { b, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
  });
  b.el.addEventListener('pointermove', e => {
    if (drag?.b !== b) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      b.el.classList.add('dragging');
    }
    moveTo(b, e.clientX - drag.ox, e.clientY - drag.oy, 650);
  });
  const release = () => {
    if (drag?.b !== b) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return poke(b);
    b.el.classList.remove('dragging');
    moveTo(b, b.goal?.x ?? b.x, b.goal?.y ?? b.y, 650).then(() => { YB.emit('dropped', b); savePositions(); });
  };
  b.el.addEventListener('pointerup', release);
  b.el.addEventListener('pointercancel', release);
  b.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(b); } });
});

// --- positions survive restarts when the shell asks for it (desktop) ---
function savePositions() {
  if (!config.rememberPosition) return;
  try { localStorage.setItem('positions', JSON.stringify(Object.fromEntries(bears.map(b => [b.id, [b.x, b.y]])))); } catch {}
}
function layout() {
  let saved = null;
  if (config.rememberPosition) try { saved = JSON.parse(localStorage.getItem('positions') || 'null'); } catch {}
  if (saved && bears.every(b => saved[b.id])) return bears.forEach(b => setPos(b, ...saved[b.id]));
  const r = rect(bears[0]), h = config.home();
  bears.forEach((b, i) => setPos(b, h.x + r.width * (i ? .05 : -1.05), h.y - r.height / 2));
}
addEventListener('resize', () => {
  // page may load in a hidden/zero-size viewport, which piles the bears in a corner
  if (bears.every(b => b.x === bears[0].x && b.y === bears[0].y)) return layout();
  bears.forEach(b => setPos(b, b.x, b.y));
});

// --- main loop: movement, running effects, face/head following ---
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  for (const b of bears) {
    if (b.hidden) continue;
    if (b.goal) {
      const g = b.goal, dx = g.x - b.x, dy = g.y - b.y, d = Math.hypot(dx, dy), stepLen = g.speed * dt;
      if (d <= stepLen) { setPos(b, g.x, g.y); b.goal = null; g.done(); }
      else {
        setPos(b, b.x + dx / d * stepLen, b.y + dy / d * stepLen);
        if (Math.abs(dx) > 2) b.dir = Math.sign(dx);
        b.runUntil = now + 120; // hysteresis so tiny drag moves don't restart the run cycle
      }
    }
    const running = now < b.runUntil;
    b.el.classList.toggle('running', running);
    if (running && now - b.lastPuff > (b.el.classList.contains('dash') ? 60 : 140)) { b.lastPuff = now; puff(b); }
    if (b.state === 'noodle' && now - b.lastFx > 500) {
      b.lastFx = now;
      const r = rect(b);
      burst(r.left + r.width * .5, r.top + r.height * .72, ['～'], '#b9aca3', 1, .3); // steam from the bowl
    }
    if ((b.state === 'think' && now - b.lastFx > 1100) || (b.state === 'dance' && now - b.lastFx > 350)) {
      b.lastFx = now;
      const r = rect(b), think = b.state === 'think';
      burst(r.left + r.width * (think ? .7 : Math.random()), r.top + r.height * (think ? .05 : .2), think ? ['?'] : ['♪', '♫', '♬'], '#4a7fd6', 1, think ? .2 : .8);
    }

    // face + head look at the pointer, the partner, or the running direction
    let tx = 0, ty = 0, tt = 0;
    if (running) { tx = b.dir * 20; ty = 3; tt = b.dir * 4; }
    else if (b.state === 'think') { tx = -7; ty = -7; tt = -8; }
    else if (b.state !== 'sleep' && b.state !== 'hungry') {
      const c = center(b), o = other(b);
      const t = o && ['hug', 'sad', 'dance', 'shy'].includes(b.state) ? center(o) : mouse;
      const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1, k = Math.min(d / 80, 1) * 9;
      tx = dx / d * k; ty = dy / d * k * .7; tt = clamp(dx / 40, -10, 10);
    }
    b.fx += (tx - b.fx) * .15; b.fy += (ty - b.fy) * .15; b.tilt += (tt - b.tilt) * .1;
    b.lean += ((running ? b.dir * 8 : 0) - b.lean) * .15;
    b.face.setAttribute('transform', `translate(${b.fx} ${b.fy})`);
    b.head.setAttribute('transform', `rotate(${b.tilt} 100 150)`);
    b.svg.style.rotate = b.lean + 'deg';
  }
  requestAnimationFrame(loop);
}
function start() {
  bears.forEach(b => setState(b, 'normal'));
  requestAnimationFrame(() => { layout(); requestAnimationFrame(loop); });
}

return { config, bears, byId, shown, other, rect, center, clamp, rand, sleep, baseState, free, setState, refresh, setPos, moveTo,
  burst, flyInto, puff, jump, say, hush, mouse, activity, interact, wake, trackMouse, poke, savePositions, layout, start,
  dragging: () => !!drag, dragged: () => drag?.b };
})();
