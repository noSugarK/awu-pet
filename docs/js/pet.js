// Shared engine for the website (index.html) and the desktop pet (pet.html).
// 一二 & 布布 · Designed by 黄小B · Powered by noSugarK
const PET = (() => {
const INK = '#3a2317';
const LOOKS = {
  yier: { name: '一二', body: '#fffdf8', ear: '#5b3524', earIn: null, blush: '#f9a9a0', bow: true, shoulder: [55, 159], tongue: true, fx: ['♥', '♡'], fxColor: '#ff6b8a' },
  bubu: { name: '布布', body: '#c9895a', ear: '#b87644', earIn: '#6f3f25', blush: '#f7aa3c', bow: false, shoulder: [62, 157], tongue: false, fx: ['★', '✦'], fxColor: '#f5b400' },
};

// traced from design/reference/* and github.com/littlegqqq/Yier-Bubu sprites: mochi head, round pear body,
// one rounded arm per side that grows out of the shoulder (only its outer edge + tip are outlined, so it never looks detached)
function bearSVG(c, id) {
  const HEAD = 'M100 22 C150 22 181 50 184 98 C186 132 160 152 100 152 C40 152 14 132 16 98 C19 50 50 22 100 22 Z';
  const eye = x => `<ellipse cx="${x}" cy="103" rx="6" ry="7" fill="${INK}" stroke="none"/><circle cx="${x - 2}" cy="100.5" r="1.7" fill="#fff" stroke="none"/>`;
  const ear = (x, ix) => `<circle cx="${x}" cy="44" r="21" fill="${c.ear}"/>` + (c.earIn ? `<circle cx="${ix}" cy="41" r="11" fill="${c.earIn}" stroke="none"/>` : '');
  const mouth = c.tongue
    ? `<path class="m-normal" fill="#f28b82" stroke-width="2.5" d="M93 110 Q96.5 113 100 110 Q103.5 113 107 110 Q106 121 100 121 Q94 121 93 110 Z"/>`
    : `<path class="m-normal" fill="none" stroke-width="2.5" d="M93 111 Q96.5 116 100 111 Q103.5 116 107 111"/>`;
  // arm in shoulder-local coords, pointing down; CSS rotates it (positive = outward, the right arm is a mirror)
  const arm = side => `<g transform="translate(${c.shoulder})"><g class="arm arm-${side}">
      <path fill="${c.body}" stroke="none" d="M-10 0 A10 10 0 0 1 10 0 L10 16 A10 10 0 0 1 -10 16 Z"/>
      <path fill="none" d="M-10 0 L-10 16 A10 10 0 0 0 10 16 L10 8"/><path class="cap" fill="none" d="M-5 -8.66 A10 10 0 0 0 -10 0"/><path class="edge" fill="none" d="M10 8 L10 0"/></g></g>`;
  return `<svg viewBox="0 0 200 230" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   <g class="bodyparts">
    <g class="leg leg-l"><path fill="${c.body}" d="M50 204 C48 214 56 223 74 223 C90 223 99 220 99 210 L99 192 L56 192 Z"/></g>
    <g class="leg leg-r"><path fill="${c.body}" d="M150 204 C152 214 144 223 126 223 C110 223 101 220 101 210 L101 192 L144 192 Z"/></g>
    <path fill="${c.body}" stroke="none" d="M66 128 C46 150 40 186 50 204 C56 212 144 212 150 204 C160 186 154 150 134 128 Z"/>
    <path fill="none" d="M66 128 C46 150 40 186 50 204 M134 128 C154 150 160 186 150 204"/>
    ${c.bow ? `<path fill="#6b3a26" stroke-width="2.5" d="M58 142 Q100 160 142 142 L142 147 Q100 164 58 147 Z"/>` : ''}
    <g class="prop p-scarf" fill="#e0473f">
      <path d="M52 136 Q100 162 148 136 L150 151 Q100 178 50 151 Z"/>
      <path d="M116 158 L122 198 L140 194 L132 154 Z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" d="M58 146 Q100 167 142 146 M124 190 L138 187"/>
    </g>
   </g>
   <g class="headpos"><g class="head">
      ${ear(42, 38)}${ear(158, 162)}
      <clipPath id="clip-${id}"><path d="${HEAD}"/></clipPath>
      <path fill="${c.body}" d="${HEAD}"/>
      <g clip-path="url(#clip-${id})"><g class="face">
        <circle class="blush" cx="51" cy="123" r="13" fill="${c.blush}" stroke="none"/>
        <circle class="blush" cx="149" cy="123" r="13" fill="${c.blush}" stroke="none"/>
        <g class="eyes-open">${eye(66)}${eye(134)}</g>
        <g class="eyes-happy" fill="none"><path d="M59 108 L70 102 L59 96"/><path d="M141 108 L130 102 L141 96"/></g>
        <g class="eyes-closed" fill="none"><path d="M58 103 Q66 109 74 103"/><path d="M126 103 Q134 109 142 103"/></g>
        <g class="brows"><path d="M55 89 L75 95"/><path d="M145 89 L125 95"/></g>
        <g class="tears" fill="#8fd3ff" stroke="none"><path d="M64 112 q-5 9 0 13 q5 -4 0 -13z"/><path d="M136 112 q-5 9 0 13 q5 -4 0 -13z"/></g>
        <g class="prop p-glasses" fill="#2b2b33">
          <rect x="49" y="92" width="34" height="21" rx="9"/><rect x="117" y="92" width="34" height="21" rx="9"/>
          <path fill="none" d="M83 99 Q100 93 117 99"/>
          <path fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" d="M56 98 L63 98 M124 98 L131 98"/>
        </g>
        ${mouth}
        <path class="m-smile" fill="#f28b82" stroke-width="2.5" d="M90 109 Q95 113 100 109 Q105 113 110 109 Q109 126 100 126 Q91 126 90 109 Z"/>
        <ellipse class="m-open" cx="100" cy="117" rx="5" ry="6.5" fill="#e0685e" stroke-width="2.5"/>
        <path class="m-frown" fill="none" stroke-width="2.5" d="M94 118 Q100 112 106 118"/>
        <g class="m-huge"><path fill="#7a2a24" d="M58 113 Q100 104 142 113 Q148 162 100 164 Q52 162 58 113 Z"/>
          <path fill="#f28b82" stroke="none" d="M74 148 Q100 128 126 148 Q114 160 100 160 Q86 160 74 148 Z"/>
          <path fill="#fff" stroke-width="2" d="M68 113 L76 125 L84 110 Z M116 110 L124 125 L132 113 Z"/></g>
      </g></g>
      <path fill="none" d="${HEAD}"/>
   </g></g>
   ${c.bow ? `<g class="bodyparts" fill="#6b3a26" stroke-width="2.5">
      <path d="M100 158 C93 148 80 146 80 158 C80 170 93 168 100 158 Z"/><path d="M100 158 C107 148 120 146 120 158 C120 170 107 168 100 158 Z"/>
      <path fill="none" stroke-width="1.6" d="M86 153 Q90 158 86 163 M114 153 Q110 158 114 163"/>
      <ellipse cx="100" cy="158" rx="5.5" ry="6"/></g>` : ''}
   ${arm('l')}
   <g transform="translate(200 0) scale(-1 1)">${arm('r')}</g>
   <g class="prop p-noodle">
      <path fill="none" stroke="#f3c969" stroke-width="3" d="M98 180 C94 162 104 146 100 124"/>
      <g class="chop" stroke="#9a6334" stroke-width="3"><path d="M128 198 L106 126"/><path d="M134 196 L112 126"/></g>
      <path fill="#fffaf2" d="M64 178 L136 178 Q132 210 100 210 Q68 210 64 178 Z"/>
      <path fill="none" stroke="#e0473f" stroke-width="3" d="M69 188 Q100 197 131 188"/>
   </g>
   <g class="prop p-boba">
      <path stroke="#e0685e" stroke-width="4" d="M104 162 L110 118"/>
      <path fill="#f1dcc0" d="M84 164 L116 164 L112 206 L88 206 Z"/>
      <g fill="${INK}" stroke="none"><circle cx="93" cy="200" r="3"/><circle cx="100" cy="201" r="3"/><circle cx="107" cy="199" r="3"/><circle cx="97" cy="194" r="3"/><circle cx="104" cy="193" r="3"/></g>
      <rect x="81" y="158" width="38" height="7" rx="3" fill="#fff"/>
   </g>
   <g class="prop p-rose">
      <path fill="none" stroke="#4f9a4a" stroke-width="3.5" d="M110 204 Q115 178 120 152"/>
      <path fill="#6cc167" stroke-width="2.5" d="M115 182 Q127 172 132 179 Q124 188 115 182 Z"/>
      <circle cx="121" cy="143" r="12" fill="#e0473f"/>
      <path fill="none" stroke-width="2" d="M115 141 Q121 134 127 141 Q121 149 115 141"/>
   </g>
  </svg>`;
}

// knobs the page shell may override before/after load
const config = {
  sleepAfter: 45000,  // ms without any user activity before the bears fall asleep
  playAfter: 9000,    // ms without touching the bears before they start playing on their own
  autoplay: true,
  sparkTrail: true,
  // where bears wander on their own and where they start (viewport px)
  walkArea: () => ({ x0: 0, x1: innerWidth, y0: innerHeight * .2, y1: innerHeight * .7 }),
  home: () => ({ x: innerWidth / 2, y: innerHeight / 2 }),
};

const bears = Object.keys(LOOKS).map(id => {
  const el = document.createElement('div');
  el.className = 'bear';
  el.id = id;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', LOOKS[id].name);
  el.innerHTML = `<div class="shadow"></div><div class="inner">${bearSVG(LOOKS[id], id)}</div>`;
  document.body.append(el);
  const inner = el.querySelector('.inner');
  return { id, el, inner, svg: inner.querySelector('svg'), look: LOOKS[id], head: el.querySelector('.head'), face: el.querySelector('.face'),
    hidden: false, state: 'normal', timer: 0, x: 0, y: 0, goal: null, dir: 0, runUntil: 0, lastPuff: 0, lastFx: 0, fx: 0, fy: 0, tilt: 0, lean: 0, clicks: [] };
});
const shown = () => bears.filter(b => !b.hidden);
const other = b => { const o = bears.find(x => x !== b); return o && !o.hidden ? o : null; };
const rect = b => b.el.getBoundingClientRect();
const center = b => { const r = rect(b); return { x: r.left + r.width / 2, y: r.top + r.height * .43 }; };
const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
const rand = (a, z) => a + Math.random() * (z - a);
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
  });
}

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
  burst(c.x, c.y - 30, b.look.fx, b.look.fxColor);
}

function hug(b, o) {
  const ro = rect(o), side = center(b).x < center(o).x ? -1 : 1;
  setState(b, 'happy');
  return moveTo(b, ro.left + side * ro.width * .68, ro.top, 360).then(() => {
    [b, o].forEach(x => setState(x, 'hug', 2600));
    const a = center(b), c = center(o);
    burst((a.x + c.x) / 2, Math.min(a.y, c.y) - 40, ['♥', '♡', '💕'], '#ff6b8a', 14, 1.6);
  });
}

function wave(b) {
  b.el.classList.add('wave');
  setState(b, 'happy', 1500);
  setTimeout(() => b.el.classList.remove('wave'), 1500);
}

// --- actions (buttons on the website, menu items on the desktop) ---
const actions = {
  think: () => shown().forEach(b => setState(b, 'think', 3500)),
  shy: () => shown().forEach(b => setState(b, 'shy', 3000)),
  noodle: () => shown().forEach(b => setState(b, 'noodle', 4000)),
  boba: () => shown().forEach(b => setState(b, 'boba', 4000)),
  wave: () => shown().forEach(wave),
  sleep: () => { manualSleep = true; shown().forEach(b => setState(b, 'sleep')); },
  dance() {
    // meet in the middle, then dance holding hands (left bear holds with its right arm)
    const s = shown();
    if (s.length < 2) return actions.wave();
    const [l, r] = s.sort((a, b) => a.x - b.x), w = rect(l).width;
    const mid = (center(l).x + center(r).x) / 2, y = (l.y + r.y) / 2;
    return Promise.all([moveTo(l, mid - w * .9, y), moveTo(r, mid - w * .1, y)]).then(() => {
      l.el.classList.add('hold-r'); l.el.classList.remove('hold-l');
      r.el.classList.add('hold-l'); r.el.classList.remove('hold-r');
      [l, r].forEach(b => setState(b, 'dance', 5000));
    });
  },
  rose() {
    // bubu runs over holding a rose, then yier gets it
    const giver = bears.find(b => b.id === 'bubu'), recv = other(giver);
    if (!recv || giver.hidden) return;
    const r = rect(recv), side = center(giver).x < center(recv).x ? -1 : 1;
    setState(giver, 'rose');
    return moveTo(giver, r.left + side * r.width * .75, r.top, 320).then(() => {
      setState(giver, 'happy', 2500);
      setState(recv, 'rose', 3500);
      jump(recv);
      const c = center(recv);
      burst(c.x, c.y - 40, ['♥', '♡', '💕'], '#ff6b8a', 12, 1.4);
    });
  },
  hug() { const [a, b] = shown(); if (b) return hug(a, b); },
};
function run(name) { interact(); wake(true); return actions[name]?.(); }

function outfit(id, on) {
  bears.forEach(b => { b.el.classList.toggle('o-' + id, on); if (on && !b.hidden) { jump(b); setState(b, 'happy', 1200); } });
}

// show only some characters, e.g. show(['yier'])
function show(ids) {
  bears.forEach(b => { b.hidden = !ids.includes(b.id); b.el.classList.toggle('hidden', b.hidden); });
  refresh();
}
function setSize(px) {
  document.documentElement.style.setProperty('--pet-size', px + 'px');
  requestAnimationFrame(() => bears.forEach(b => setPos(b, b.x, b.y)));
}

// --- drag & drop files onto a bear (desktop): gape while hovering, chew after the drop ---
function bearAt(x, y) {
  return shown().find(b => { const r = rect(b); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }) || null;
}
function hungry(b) {
  bears.forEach(x => {
    if (x === b) { if (x.state !== 'hungry') { setState(x, 'hungry'); x.el.querySelector('.bubble')?.dispatchEvent(new Event('dismiss')); } }
    else if (x.state === 'hungry') setState(x, baseState());
  });
}
function eat(b, n, from) {
  interact();
  const c = center(b);
  if (from) for (let i = 0; i < Math.min(n, 6); i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = i % 2 ? '📁' : '📄';
    p.style.cssText = `left:${from.x + rand(-20, 20)}px;top:${from.y + rand(-20, 20)}px;font-size:22px;--dx:${c.x - from.x}px;--dy:${c.y + 20 - from.y}px;animation-duration:.45s`;
    p.onanimationend = () => p.remove();
    document.body.append(p);
  }
  setState(b, 'eat', 1600);
  setTimeout(() => {
    burst(c.x, c.y - 30, ['✨'], '#f5b400', 3, .8);
    say(b, `吃掉了 ${n} 个，嗝～\n在回收站可以找回`);
  }, 1600);
}

// --- dragging: the bear runs after the pointer instead of snapping to it ---
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
    moveTo(b, b.goal?.x ?? b.x, b.goal?.y ?? b.y, 650).then(() => {
      const o = other(b);
      if (o) { const a = center(b), c = center(o); if (Math.hypot(a.x - c.x, a.y - c.y) < rect(b).width * 1.1) return hug(b, o); }
      refresh();
    });
  };
  b.el.addEventListener('pointerup', release);
  b.el.addEventListener('pointercancel', release);
  b.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(b); } });
});

// double-click empty space: both run over and wave
addEventListener('dblclick', e => {
  if (e.target.closest('.bear, button, .bubble')) return;
  interact();
  const w = rect(bears[0]).width, h = rect(bears[0]).height;
  shown().forEach((b, i) => {
    if (b.state === 'sleep') setState(b, 'normal');
    moveTo(b, e.clientX - w * (i ? .1 : .9), e.clientY - h * .7, i ? 300 : 340).then(() => wave(b));
  });
});

// --- activity, idle sleep, playing alone ---
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
let lastActive = Date.now(), lastInteract = Date.now(), nextPlay = 0, lastSpark = 0, manualSleep = false;
const SPARK_COLORS = ['#ffb3c6', '#ffd97a', '#b8e0ff', '#c9b8ff'];
function interact() { lastInteract = Date.now(); }

// idle sleep ends on any activity; sleep from the button/menu only ends on a click or key
function wake(force) {
  lastActive = Date.now();
  if (manualSleep && !force) return;
  manualSleep = false;
  bears.forEach(b => { if (b.state === 'sleep') setState(b, 'surprised', 900); });
}
addEventListener('pointerdown', () => wake(true));
addEventListener('keydown', () => wake(true));
addEventListener('pointermove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  wake(false);
  if (!config.sparkTrail || e.timeStamp - lastSpark < 35) return;
  lastSpark = e.timeStamp;
  const s = document.createElement('span');
  s.className = 'spark';
  s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;background:${SPARK_COLORS[Math.random() * 4 | 0]}`;
  s.onanimationend = () => s.remove();
  document.body.append(s);
});
// desktop shell: eyes follow the global cursor without counting as activity, idle comes from the OS
const lookAt = (x, y) => { mouse.x = x; mouse.y = y; };
function setIdle(seconds) {
  if (seconds < 2) wake(false);
  else lastActive = Math.min(lastActive, Date.now() - seconds * 1000);
}

// weighted activities the bears pick when nobody plays with them
const PLAYS = [
  { w: 5, solo: b => { const a = config.walkArea(), r = rect(b); return moveTo(b, rand(a.x0, a.x1 - r.width), rand(a.y0, Math.max(a.y0, a.y1 - r.height)), 150); } },
  { w: 1, solo: b => setState(b, 'think', 3500) },
  { w: 1, solo: b => setState(b, 'noodle', 4000) },
  { w: 1, solo: b => setState(b, 'boba', 4000) },
  { w: 1, solo: b => wave(b) },
  { w: 1, solo: b => { jump(b); setState(b, 'happy', 1200); } },
  { w: 1.5, duo: () => actions.dance() },
  { w: 1.5, duo: () => actions.hug() },
  { w: .7, duo: () => actions.rose() },
  { w: 1, duo: () => shown().forEach(b => setState(b, 'shy', 3000)) },
];
function autoplay(now) {
  if (!config.autoplay || now < nextPlay || now - lastInteract < config.playAfter || now - lastActive > config.sleepAfter) return;
  const idle = shown().filter(free);
  if (!idle.length) return;
  const duo = idle.length === 2 && idle.length === shown().length;
  const pool = PLAYS.filter(p => p.solo || duo), total = pool.reduce((s, p) => s + p.w, 0);
  let pick = Math.random() * total, play = pool[0];
  for (const p of pool) { if ((pick -= p.w) < 0) { play = p; break; } }
  if (play.duo) play.duo();
  else play.solo(idle[Math.random() * idle.length | 0]);
  nextPlay = now + rand(5000, 10000);
}

setInterval(() => {
  const now = Date.now();
  if (now - lastActive > config.sleepAfter) bears.forEach(b => { if (free(b)) setState(b, 'sleep'); });
  autoplay(now);
  bears.forEach(b => {
    if (b.state !== 'sleep' || b.hidden) return;
    const r = rect(b);
    burst(r.left + r.width * .75, r.top + r.height * .15, ['z', 'Z'], '#4a7fd6', 1, .3);
  });
}, 900);

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
    if (running && now - b.lastPuff > 140) { b.lastPuff = now; puff(b); }
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

function layout() {
  const r = rect(bears[0]), h = config.home();
  setPos(bears[0], h.x - r.width * 1.05, h.y - r.height / 2);
  setPos(bears[1], h.x + r.width * .05, h.y - r.height / 2);
}
addEventListener('resize', () => {
  // page may load in a hidden/zero-size viewport, which piles both bears in a corner
  if (bears[0].x === bears[1].x && bears[0].y === bears[1].y) return layout();
  bears.forEach(b => setPos(b, b.x, b.y));
});
bears.forEach(b => setState(b, 'normal'));
requestAnimationFrame(() => { layout(); requestAnimationFrame(loop); });

return { config, bears, actions, run, outfit, show, setSize, say, lookAt, setIdle, bearAt, hungry, eat, rect, interact, dragging: () => !!drag };
})();
