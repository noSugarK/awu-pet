// Brain: what the bears do by themselves. Weighted by each character's personality, aware of the
// time of day, of the other bear, and of what the computer is doing (idle, fullscreen app, cursor flicks).
YB.brain = (() => {
const { config, bears, shown, other, rect, center, rand, sleep, free, setState, moveTo, burst, jump, say, activity, savePositions } = YB.rt;
const A = YB.actions;
const env = { fullscreen: false };
const night = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };
const p = (b, trait) => b.ch.personality[trait];

// solo activities: weight(b) → how likely this bear picks it now
const SOLO = [
  { w: b => 4 * (.5 + p(b, 'playfulness')), go: b => { const a = config.walkArea(), r = rect(b); return moveTo(b, rand(a.x0, a.x1 - r.width), rand(a.y0, Math.max(a.y0, a.y1 - r.height)), 150); } },
  { w: () => 1, go: b => setState(b, 'think', 3500) },
  { w: b => p(b, 'playfulness'), go: b => setState(b, 'noodle', 4000) },
  { w: b => p(b, 'playfulness'), go: b => setState(b, 'boba', 4000) },
  { w: b => p(b, 'social'), go: b => A.wave(b) },
  { w: b => p(b, 'playfulness'), go: b => { jump(b); setState(b, 'happy', 1200); } },
  // a nap; at night much more likely
  { w: b => p(b, 'sleepiness') * (night() ? 5 : .6), go: b => setState(b, 'sleep', rand(8000, 15000)) },
];
// things the two do together
const DUO = [
  { w: (a, b) => 1.5 * p(a, 'social') * p(b, 'playfulness'), go: () => A.all.dance() },
  { w: (a, b) => 1.5 * p(a, 'social'), go: () => A.all.hug() },
  { w: () => A.can('rose') ? .6 : 0, go: () => A.all.rose() },
  { w: () => .8, go: () => shown().forEach(b => setState(b, 'shy', 3000)) },
  { w: (a, b) => p(a, 'playfulness') * p(b, 'playfulness'), go: (a, b) => chase(a, b) },
];
const pick = list => {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  return list.find(x => (r -= x.weight) < 0) || list[0];
};

// one runs off, the other follows a few times, then they bump into each other happily
async function chase(runner, chaser) {
  const a = config.walkArea();
  for (let i = 0; i < 3; i++) {
    const r = rect(runner), x = rand(a.x0, a.x1 - r.width), y = rand(a.y0, Math.max(a.y0, a.y1 - r.height));
    setState(runner, 'happy'); setState(chaser, 'happy');
    const run = moveTo(runner, x, y, 330);
    await sleep(300);
    moveTo(chaser, x + (Math.random() < .5 ? -1 : 1) * r.width * .7, y, 360);
    await run;
  }
  await sleep(500);
  jump(runner); jump(chaser);
  setState(runner, 'normal'); setState(chaser, 'normal');
}

// the awake one goes over to wake up a napping partner
async function poke(awake, sleeper) {
  const r = rect(sleeper), side = center(awake).x < center(sleeper).x ? -1 : 1;
  await moveTo(awake, r.left + side * r.width * .7, r.top, 160);
  if (sleeper.state !== 'sleep') return;
  say(awake, awake.ch.lines.callPartner, { ms: 1500 });
  await sleep(1800);
  if (sleeper.state !== 'sleep') return;
  jump(awake);
  burst(center(sleeper).x, center(sleeper).y - 60, ['💢'], '#e33', 1, .1);
  setState(sleeper, 'surprised', 900);
  await sleep(1000);
  chase(awake, sleeper);
}

let nextPlay = 0;
function play(now) {
  if (!config.autoplay || env.fullscreen || now < nextPlay || now - activity.lastInteract < config.playAfter) return;
  const idle = shown().filter(free);
  const napper = shown().find(b => b.state === 'sleep' && !activity.manualSleep);
  if (napper && idle.length && Math.random() < .5) poke(idle[0], napper);
  else if (idle.length === 2 && Math.random() < .45) {
    const [a, b] = idle;
    pick(DUO.map(d => ({ ...d, weight: d.w(a, b) }))).go(a, b);
  } else if (idle.length) {
    const b = idle[Math.random() * idle.length | 0];
    pick(SOLO.map(s => ({ ...s, weight: s.w(b) }))).go(b);
  } else return;
  nextPlay = now + rand(5000, 10000);
}

setInterval(() => {
  const now = Date.now(), away = now - activity.lastActive > config.sleepAfter / (night() ? 3 : 1);
  if (away) bears.forEach(b => { if (free(b)) setState(b, 'sleep'); });
  else play(now);
  bears.forEach(b => {
    if (b.state !== 'sleep' || b.hidden) return;
    const r = rect(b);
    burst(r.left + r.width * .75, r.top + r.height * .15, ['z', 'Z'], '#4a7fd6', 1, .3);
  });
}, 900);
setInterval(savePositions, 5000);

// a quick flick of the cursor: the most playful free bear chases it
let lastChase = 0;
YB.on('zoom', ({ x, y }) => {
  const now = Date.now();
  if (!config.autoplay || env.fullscreen || now - lastChase < 8000) return;
  const b = shown().filter(free).sort((a, c) => p(c, 'playfulness') - p(a, 'playfulness'))[0];
  if (!b || Math.random() > p(b, 'playfulness')) return;
  lastChase = now;
  const r = rect(b);
  setState(b, 'happy');
  b.el.classList.add('dash');
  moveTo(b, x - r.width / 2, y - r.height * .6, 520).then(() => { b.el.classList.remove('dash'); jump(b); setState(b, 'happy', 1000); });
});

// one bear ate something alone while the other watched: "你又偷吃！" / "嘿嘿～"
YB.on('ate', async ({ eaters }) => {
  if (eaters.length !== 1) return;
  const eater = eaters[0], watcher = other(eater);
  if (!watcher || !free(watcher) || !watcher.ch.lines.scold || Math.random() > .5) return;
  await sleep(3800);
  setState(watcher, 'angry', 1600);
  say(watcher, watcher.ch.lines.scold, { ms: 1600 });
  await sleep(1700);
  if (eater.ch.lines.sneaky) { setState(eater, 'happy', 1500); say(eater, eater.ch.lines.sneaky, { ms: 1500 }); }
});

// a fullscreen app (game, video) took over: go quiet in the corner until it's gone
function setFullscreen(on) {
  if (env.fullscreen === on) return;
  env.fullscreen = on;
  if (!on) return;
  const s = shown(), r = rect(s[0] || bears[0]);
  s.forEach((b, i) => moveTo(b, innerWidth - r.width * (i + 1.1), innerHeight - r.height, 400));
}

return { env, setFullscreen };
})();
