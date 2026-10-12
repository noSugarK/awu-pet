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
  // where a bear wanders on its own (viewport px; the shell may answer per bear, e.g. its monitor) and where they start
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
const STATE_ROW = { sad: 'failed', angry: 'failed', happy: 'jump', surprised: 'jump', hungry: 'jump', hug: 'wave', dance: 'wave', shy: 'wave',
  think: 'review', sleep: 'waiting', eat: 'busy', kick: 'jump' };
const SPRITE_FPS = 8;
// The sprite cell and the mouth anchor used for file effects.
const SHEET_MODEL = { viewBox: [192, 208], face: { mouth: [96, 100] } };
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
// the row for what the pet is doing: "row<N>" states (an action picked from its menu) play that row; a pet may say
// which rows suit its states (sprite.states) and that its running rows are swapped (sprite.flip)
function spriteFrame(b, now, running) {
  const sp = b.ch.sprite, picked = /^row(\d+)$/.exec(b.state), mood = b.el.classList.contains('wave') ? 'wave' : b.state;
  const row = running ? ((b.dir < 0) !== !!sp.flip ? ROW.left : ROW.right)
    : picked ? +picked[1] : sp.states?.[mood] ?? ROW[mood === 'wave' ? 'wave' : STATE_ROW[mood] || 'idle'];
  const { cols, rows, frames } = b.sheet;
  if (!frames) return;
  const r = Math.min(row, rows - 1), f = Math.floor(now / 1000 * SPRITE_FPS) % (frames[r] || 1);
  b.sprite.style.backgroundPosition = `${cols > 1 ? f / (cols - 1) * 100 : 0}% ${rows > 1 ? r / (rows - 1) * 100 : 0}%`;
}

const bears = cast.members.map(id => YB.characters[id]).map(ch => {
  const el = document.createElement('div');
  const m = SHEET_MODEL;
  el.className = 'bear';
  el.id = ch.id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', ch.name);
  el.style.aspectRatio = `${m.viewBox[0]} / ${m.viewBox[1]}`;
  el.innerHTML = '<div class="shadow"></div><div class="inner"><div class="sprite"></div></div>';
  document.body.append(el);
  const inner = el.querySelector('.inner');
  return { id: ch.id, ch, m, el, inner, sprite: el.querySelector('.sprite'), sheet: {},
    hidden: false, state: 'normal', timer: 0, x: 0, y: 0, goal: null, dir: 0, runUntil: 0, lastPuff: 0, lastFx: 0, clicks: [] };
});
const byId = id => bears.find(b => b.id === id);
const shown = () => bears.filter(b => !b.hidden);
const other = b => { const o = bears.find(x => x !== b); return o && !o.hidden ? o : null; };
const rect = b => b.el.getBoundingClientRect();
// a bear's face center, where bubbles and bursts aim
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
  if (b.goal) b.goal.done(false);
  b.goal = { x: clamp(x, 0, innerWidth - r.width), y: clamp(y, 0, innerHeight - r.height), speed };
  return new Promise(res => { b.goal.done = res; }); // false means a newer movement interrupted this one
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
    p.className = 'meal-token meal-eaten';
    p.textContent = chars[i % chars.length];
    p.style.cssText = `left:${from.x + rand(-14, 14)}px;top:${from.y + rand(-14, 14)}px;--dx:${c.x - from.x}px;--dy:${c.y - from.y}px;animation-delay:${i * 90}ms`;
    p.onanimationend = () => p.remove();
    document.body.append(p);
  }
}
// The file appears at the pet's foot, then flies towards the recycle bin after the kick.
function kickAway(b, from, chars, n, direction) {
  const r = rect(b), x = r.left + r.width * (.5 + direction * .22), y = r.bottom - r.height * .14;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'meal-token meal-kicked';
    p.textContent = chars[i % chars.length];
    p.style.cssText = `left:${x}px;top:${y}px;--sx:${(from?.x ?? x) - x}px;--sy:${(from?.y ?? y) - y}px;--dx:${direction * (100 + i * 18)}px;--dy:${-65 - i * 12}px;animation-delay:${i * 80}ms`;
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
    const x = e.clientX - drag.ox, y = e.clientY - drag.oy;
    moveTo(b, x, y, Math.max(650, Math.hypot(x - b.x, y - b.y) * 4));
  });
  const release = e => {
    if (drag?.b !== b) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return poke(b);
    b.el.classList.remove('dragging');
    b.dropAt = { x: e.clientX, y: e.clientY };
    const x = b.goal?.x ?? b.x, y = b.goal?.y ?? b.y;
    moveTo(b, x, y, Math.max(650, Math.hypot(x - b.x, y - b.y) * 4))
      .then(arrived => { if (arrived) { YB.emit('dropped', b); savePositions(); } });
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

// --- main loop: movement, sprite frames and effects ---
let last = performance.now();
function loop(now) {
  if (now - last < 25) return requestAnimationFrame(loop); // about 30 fps on common displays; CSS animations keep running
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  for (const b of bears) {
    if (b.hidden) continue;
    if (b.goal) {
      const g = b.goal, dx = g.x - b.x, dy = g.y - b.y, d = Math.hypot(dx, dy), stepLen = g.speed * dt;
      if (d <= stepLen) { setPos(b, g.x, g.y); b.goal = null; g.done(true); }
      else {
        setPos(b, b.x + dx / d * stepLen, b.y + dy / d * stepLen);
        if (Math.abs(dx) > 2) b.dir = Math.sign(dx);
        b.runUntil = now + 120; // hysteresis so tiny drag moves don't restart the run cycle
      }
    }
    const running = now < b.runUntil;
    b.el.classList.toggle('running', running);
    if (running && now - b.lastPuff > (b.el.classList.contains('dash') ? 60 : 140)) { b.lastPuff = now; puff(b); }
    if ((b.state === 'think' && now - b.lastFx > 1100) || (b.state === 'dance' && now - b.lastFx > 350)) {
      b.lastFx = now;
      const r = rect(b), think = b.state === 'think';
      burst(r.left + r.width * (think ? .7 : Math.random()), r.top + r.height * (think ? .05 : .2), think ? ['?'] : ['♪', '♫', '♬'], '#4a7fd6', 1, think ? .2 : .8);
    }
    spriteFrame(b, now, running);
  }
  requestAnimationFrame(loop);
}
function start() {
  bears.forEach(b => setState(b, 'normal'));
  requestAnimationFrame(() => { layout(); requestAnimationFrame(loop); });
}

return { config, cast, setCast, setSprite, bears, byId, shown, other, rect, center, clamp, rand, sleep, baseState, free, setState, refresh, setPos, moveTo,
  burst, flyInto, kickAway, puff, jump, say, hush, mouse, activity, interact, wake, trackMouse, poke, savePositions, layout, start,
  dragging: () => !!drag, dragged: () => drag?.b };
})();
