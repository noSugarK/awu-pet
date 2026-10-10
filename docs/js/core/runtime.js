// Pet runtime: creates the bears of the current cast and runs state, movement, particles, bubbles,
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

// the cast on screen: the one a shell's 角色 menu saved (setCast), else the first registered
const cast = (() => { let id; try { id = localStorage.getItem('cast'); } catch {} return YB.casts[id] || Object.values(YB.casts)[0]; })();
function setCast(id) {
  try { localStorage.setItem('cast', id); } catch {}
  location.reload(); // every module holds on to the bears, so a fresh page is the simplest swap
}

// --- characters drawn from a sprite sheet (Codex / Petdex pet packages, see packs.js) ---
// The sheet is a grid of 192 × 208 cells, one animation per row; a pet state picks the row.
const ROW = { idle: 0, right: 1, left: 2, wave: 3, jump: 4, failed: 5, waiting: 6, busy: 7, review: 8 };
const STATE_ROW = { sad: 'failed', angry: 'failed', happy: 'jump', surprised: 'jump', hungry: 'jump', hug: 'wave', dance: 'wave', shy: 'wave', rose: 'wave',
  think: 'review', sleep: 'waiting', eat: 'busy', noodle: 'busy', boba: 'busy' };
const SPRITE_FPS = 8;
// what the movement and effects need from a "model": the cell, where the face is, where the feet are
const SHEET_MODEL = { viewBox: [192, 208], face: { mouth: [96, 100] }, neck: { y: 120 }, ground: 200, arm: { rest: 0, sleep: { shift: [0, 0], rotate: 0 } }, legs: { pivots: [[80, 200], [112, 200]] } };
// frames per row: the cells with anything opaque in them
function countFrames(img, cols, rows) {
  const c = document.createElement('canvas'), W = 48, H = 52;
  c.width = cols * W; c.height = rows * H;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data, filled = (k, r) => {
    for (let y = r * H; y < (r + 1) * H; y += 2) for (let x = k * W; x < (k + 1) * W; x += 2) if (d[(y * c.width + x) * 4 + 3] > 20) return true;
    return false;
  };
  return Array.from({ length: rows }, (_, r) => { let n = 1; for (let k = 0; k < cols; k++) if (filled(k, r)) n = k + 1; return n; });
}
// give a sprite character its sheet (a URL the shell made from the package file)
async function setSprite(id, url) {
  const b = bears.find(x => x.id === id);
  if (!b?.sprite) return;
  const img = new Image();
  img.src = url;
  await img.decode();
  const cols = Math.round(img.naturalWidth / 192) || 1, rows = Math.round(img.naturalHeight / 208) || 1;
  let frames = [6, 8, 8, 4, 5, 8, 6, 6, 6];
  try { frames = countFrames(img, cols, rows); } catch {} // a cross-origin sheet can't be read: assume the usual counts
  Object.assign(b.sheet, { cols, rows, frames });
  Object.assign(b.sprite.style, { backgroundImage: `url("${url}")`, backgroundSize: `${cols * 100}% ${rows * 100}%` });
}
function spriteFrame(b, now, running) {
  const row = running ? (b.dir < 0 ? ROW.left : ROW.right) : b.el.classList.contains('wave') ? ROW.wave : ROW[STATE_ROW[b.state] || 'idle'];
  const { cols, rows, frames } = b.sheet;
  if (!frames) return;
  const r = Math.min(row, rows - 1), f = Math.floor(now / 1000 * SPRITE_FPS) % (frames[r] || 1);
  b.sprite.style.backgroundPosition = `${cols > 1 ? f / (cols - 1) * 100 : 0}% ${rows > 1 ? r / (rows - 1) * 100 : 0}%`;
}

const bears = cast.members.map(id => YB.characters[id]).map(ch => {
  const el = document.createElement('div');
  const m = ch.sprite ? SHEET_MODEL : YB.models[ch.model];
  el.className = 'bear';
  el.id = ch.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', ch.name);
  // everything the animations need about the shape comes from the model
  const px = ([x, y]) => `${x}px ${y}px`;
  Object.entries({
    'aspect-ratio': `${m.viewBox[0]} / ${m.viewBox[1]}`,
    '--rest': m.arm.rest + 'deg',
    '--sleep-arm': `translate(${m.arm.sleep.shift[0]}px, ${m.arm.sleep.shift[1]}px) rotate(${m.arm.sleep.rotate}deg)`,
    '--sleep-drop': m.ground - m.neck.y + 'px',
    '--foot-l': px(m.legs.pivots[0]),
    '--foot-r': px(m.legs.pivots[1]),
  }).forEach(([k, v]) => el.style.setProperty(k, v));
  el.innerHTML = `<div class="shadow"></div><div class="inner">${ch.sprite ? '<div class="sprite"></div>' : YB.render.bear(ch)}</div>`;
  document.body.append(el);
  const inner = el.querySelector('.inner');
  return { id: ch.id, ch, m, el, inner, svg: inner.querySelector('svg'), head: el.querySelector('.head'), face: el.querySelector('.face'),
    sprite: el.querySelector('.sprite'), sheet: {},
    hidden: false, state: 'normal', timer: 0, x: 0, y: 0, goal: null, dir: 0, runUntil: 0, lastPuff: 0, lastFx: 0, fx: 0, fy: 0, tilt: 0, lean: 0, clicks: [] };
});
const byId = id => bears.find(b => b.id === id);
const shown = () => bears.filter(b => !b.hidden);
const other = b => { const o = bears.find(x => x !== b); return o && !o.hidden ? o : null; };
const rect = b => b.el.getBoundingClientRect();
// a bear's "center" is its face (mouth height), where looks, bubbles and bursts aim
const center = b => { const r = rect(b); return { x: r.left + r.width / 2, y: r.top + r.height * b.m.face.mouth[1] / b.m.viewBox[1] }; };
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
  try { localStorage.setItem('positions:' + cast.id, JSON.stringify(Object.fromEntries(bears.map(b => [b.id, [b.x, b.y]])))); } catch {}
}
function layout() {
  let saved = null;
  if (config.rememberPosition) try { saved = JSON.parse(localStorage.getItem('positions:' + cast.id) ?? localStorage.getItem('positions') ?? 'null'); } catch {}
  if (saved && bears.every(b => saved[b.id])) return bears.forEach(b => setPos(b, ...saved[b.id]));
  const r = rect(bears[0]), h = config.home();
  // side by side, centred on home (two of them: just left and right of it)
  bears.forEach((b, i) => setPos(b, h.x + r.width * (1.1 * (i - (bears.length - 1) / 2) - .5), h.y - r.height / 2));
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
    if (b.sprite) { spriteFrame(b, now, running); continue; } // frames do the rest

    // face + head look at the pointer, the partner, or the running direction
    let tx = 0, ty = 0, tt = 0;
    // the face slides toward what it looks at; the big head only leans a few degrees
    if (running) { tx = b.dir * 16; ty = 3; tt = b.dir * 2; }
    else if (b.state === 'think') { tx = -7; ty = -7; tt = -4; }
    else if (b.state !== 'sleep' && b.state !== 'hungry') {
      const c = center(b), o = other(b);
      const t = o && ['hug', 'sad', 'dance', 'shy'].includes(b.state) ? center(o) : mouse;
      const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1, k = Math.min(d / 80, 1) * 8;
      tx = dx / d * k; ty = dy / d * k * .6; tt = clamp(dx / 150, -4, 4);
    }
    b.fx += (tx - b.fx) * .15; b.fy += (ty - b.fy) * .15; b.tilt += (tt - b.tilt) * .1;
    b.lean += ((running ? b.dir * 8 : 0) - b.lean) * .15;
    b.face.setAttribute('transform', `translate(${b.fx} ${b.fy})`);
    b.head.setAttribute('transform', `rotate(${b.tilt} ${b.m.viewBox[0] / 2} ${b.m.neck.y})`);
    b.svg.style.rotate = b.lean + 'deg';
  }
  requestAnimationFrame(loop);
}
function start() {
  bears.forEach(b => setState(b, 'normal'));
  requestAnimationFrame(() => { layout(); requestAnimationFrame(loop); });
}

return { config, cast, setCast, setSprite, bears, byId, shown, other, rect, center, clamp, rand, sleep, baseState, free, setState, refresh, setPos, moveTo,
  burst, flyInto, puff, jump, say, hush, mouse, activity, interact, wake, trackMouse, poke, savePositions, layout, start,
  dragging: () => !!drag, dragged: () => drag?.b };
})();
