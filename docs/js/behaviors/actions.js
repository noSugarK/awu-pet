// Actions: everything a button, menu item or the brain can ask the bears to do.
YB.actions = (() => {
const { bears, byId, shown, other, rect, center, rand, sleep, baseState, setState, refresh, setPos, moveTo, burst, flyInto, jump, say, hush,
  interact, wake, activity } = YB.rt;

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

const all = { // name → () => void | Promise
  think: () => shown().forEach(b => setState(b, 'think', 3500)),
  shy: () => shown().forEach(b => setState(b, 'shy', 3000)),
  noodle: () => shown().forEach(b => setState(b, 'noodle', 4000)),
  boba: () => shown().forEach(b => setState(b, 'boba', 4000)),
  wave: () => shown().forEach(wave),
  sleep: () => { activity.manualSleep = true; shown().forEach(b => setState(b, 'sleep')); },
  dance() {
    // meet in the middle, then dance holding hands (left bear holds with its right arm)
    const s = shown();
    if (s.length < 2) return all.wave();
    const [l, r] = s.sort((a, b) => a.x - b.x), w = rect(l).width;
    const mid = (center(l).x + center(r).x) / 2, y = (l.y + r.y) / 2;
    return Promise.all([moveTo(l, mid - w * .9, y), moveTo(r, mid - w * .1, y)]).then(() => {
      l.el.classList.add('hold-r'); l.el.classList.remove('hold-l');
      r.el.classList.add('hold-l'); r.el.classList.remove('hold-r');
      [l, r].forEach(b => setState(b, 'dance', 5000));
    });
  },
  rose() {
    // the giver (布布) runs over holding a rose, then the other one gets it
    const giver = shown().find(b => b.ch.giver), recv = giver && other(giver);
    if (!recv) return;
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
// what an action needs from the cast on screen; anything not listed always works
const duo = () => shown().length > 1;
// sprite characters only have their sheet's animations: no held props, no outfits
const flat = () => !shown().some(b => b.ch.sprite);
const needs = { dance: duo, hug: duo, rose: () => duo() && flat() && shown().some(b => b.ch.giver), noodle: flat, boba: flat, outfit: flat };
const can = name => !needs[name] || needs[name]();
function run(name) { interact(); wake(true); return all[name]?.(); }
// a sprite pet's own action: play one row of its sheet for a while
function playRow(id, row, ms = 3600) {
  const b = byId(id);
  if (!b?.ch.sprite) return;
  interact(); wake(true);
  setState(b, 'row' + row, ms);
}

// dropping a bear next to its partner = hug
YB.on('dropped', b => {
  const o = other(b);
  if (o) { const a = center(b), c = center(o); if (Math.hypot(a.x - c.x, a.y - c.y) < rect(b).width * 1.1) return hug(b, o); }
  refresh();
});

// double-click empty space (website): both run over and wave
addEventListener('dblclick', e => {
  if (e.target.closest('.bear, button, .bubble')) return;
  interact();
  const w = rect(bears[0]).width, h = rect(bears[0]).height;
  shown().forEach((b, i) => {
    if (b.state === 'sleep') setState(b, 'normal');
    moveTo(b, e.clientX - w * (i ? .1 : .9), e.clientY - h * .7, i ? 300 : 340).then(() => wave(b));
  });
});

function outfit(id, on) {
  bears.forEach(b => { b.el.classList.toggle('o-' + id, on); if (on && !b.hidden) { jump(b); setState(b, 'happy', 1200); } });
}
// show only some characters, e.g. show(['yier'])
function show(ids) {
  bears.forEach(b => { b.hidden = !ids.includes(b.id); b.el.classList.toggle('hidden', b.hidden); });
  refresh();
}
// resize every bear, keeping its feet where they are
function setSize(px) {
  const feet = bears.map(b => { const r = rect(b); return [r.left + r.width / 2, r.bottom]; });
  document.documentElement.style.setProperty('--pet-size', px + 'px');
  bears.forEach((b, i) => { const r = rect(b); setPos(b, feet[i][0] - r.width / 2, feet[i][1] - r.height); });
}

// --- 文件投喂: gape while a file hovers, then chew and react to what it was ---
function bearAt(x, y) {
  return shown().find(b => { const r = rect(b); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }) || null;
}
function hungry(b) {
  bears.forEach(x => {
    if (x === b) { if (x.state !== 'hungry') { setState(x, 'hungry'); hush(x); } }
    else if (x.state === 'hungry') setState(x, baseState());
  });
}
// eaters: bears chewing together; items: [{path, isDir, bytes}] actually eaten; from: where the files came from
async function eat(eaters, items, from) {
  interact();
  const { kind, huge } = YB.feeding.classify(items), n = items.length, lead = eaters[0];
  YB.feeding.record(items);
  if (from) eaters.forEach(b => flyInto(b, from, [kind.emoji], Math.min(n, 6)));
  const chew = kind.chew || 1600;
  eaters.forEach(b => setState(b, 'eat', chew));
  await sleep(chew);
  eaters.forEach(b => { const c = center(b); burst(c.x, c.y - 30, ['✨'], '#f5b400', 3, .8); });
  const what = huge ? '好撑……差点吃不下！' : kind.say;
  const who = eaters.length > 1 ? `一起吃掉了 ${n} 个` : `吃掉了 ${n} 个`;
  say(lead, `${what}\n${who} · 在回收站可以找回`, { ms: 3500 });
  if (kind.after === 'dance') all.dance();
  else if (kind.after === 'yawn') eaters.forEach(b => { setState(b, 'sleep', 2500); burst(center(b).x + 30, center(b).y - 60, ['💤'], '#4a7fd6', 1, .2); });
  else if (kind.after === 'shiver') eaters.forEach(b => setState(b, 'surprised', 1500));
  YB.emit('ate', { eaters, kind, n });
}

// "请一二删除": ❗, dash to the file, stop beside it with the huge mouth open.
// Resolves once they are in place, with a function that sends them back where they came from.
async function errand(list, target) {
  interact();
  wake(true);
  const home = list.map(b => [b, b.x, b.y]);
  list.sort((a, b) => a.x - b.x);
  for (const b of list) {
    hush(b);
    setState(b, 'surprised');
    jump(b);
    const c = center(b);
    burst(c.x + 30, c.y - 70, ['❗'], '#e0473f', 1, .1);
  }
  say(list[0], list.length > 1 ? '收到！一起上！' : '收到！', { ms: 1200 });
  await sleep(700);
  // one bear: stand on the side it comes from; two: one on each side of the file
  const sides = list.length > 1 ? [-1, 1] : [center(list[0]).x < target.x ? -1 : 1];
  await Promise.all(list.map((b, i) => {
    const r = rect(b);
    setState(b, 'happy');
    b.el.classList.add('dash');
    return moveTo(b, target.x - r.width / 2 + sides[i] * r.width * .6, target.y - r.height * .55, 620)
      .then(() => b.el.classList.remove('dash'));
  }));
  list.forEach(b => setState(b, 'hungry'));
  await sleep(650);
  return () => setTimeout(() => home.forEach(([b, x, y]) => moveTo(b, x, y, 200)), 3200);
}

// a folder is a big box: the partner comes over to help carry it
async function helper(b) {
  const o = other(b);
  if (!o || !YB.rt.free(o)) return null;
  const r = rect(b), side = center(o).x < center(b).x ? -1 : 1;
  setState(o, 'happy');
  await moveTo(o, r.left + side * r.width * .7, r.top, 520);
  setState(o, 'hungry');
  return o;
}

return { all, can, run, playRow, hug, wave, outfit, show, setSize, bearAt, hungry, eat, errand, helper };
})();
