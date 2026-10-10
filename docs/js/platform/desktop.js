// Desktop shell (pet.html inside Tauri, desktop/src-tauri): bridges the pet runtime and Rust.
// Designed by 黄小B · Powered by noSugarK
(() => {
const T = window.__TAURI__;
if (!T) return; // opened in a normal browser
const { invoke } = T.core;
const { listen } = T.event;

// --- settings live in the webview's localStorage; Rust only mirrors them in the menus ---
const DEFAULTS = { show: PET.cast.members, size: 180, glasses: false, scarf: false, autoplay: true, onTop: true, explorerMenu: true };
let settings = DEFAULTS;
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('settings') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('settings', JSON.stringify(settings)); } catch {} };

// bears live on the taskbars: the window spans every monitor and Rust says where each one's work area is
// (x, y, w, h, primary first); a bear starts bottom-right of the primary one and wanders along the bottom edge of
// whichever monitor it is on; it is remembered where it was left
const bearH = () => PET.rect(PET.bears[0]).height;
let screens = [[0, 0, innerWidth, innerHeight]];
const screenOf = b => { // the monitor holding the bear's centre, else the nearest one
  if (!b) return screens[0];
  const r = PET.rect(b), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const gap = ([sx, sy, w, h]) => Math.hypot(Math.max(sx - x, 0, x - sx - w), Math.max(sy - y, 0, y - sy - h));
  return screens.reduce((a, s) => gap(s) < gap(a) ? s : a);
};
Object.assign(PET.config, {
  sparkTrail: false,
  sleepAfter: 90000,
  playAfter: 15000,
  rememberPosition: true,
  home: () => { const [x, y, w, h] = screens[0]; return { x: x + w - bearH() * 2, y: y + h - bearH() / 2 }; },
  walkArea: b => { const [x, y, w, h] = screenOf(b); return { x0: x, x1: x + w, y0: y + h - bearH(), y1: y + h }; },
});
// keep a bear on a monitor: one dropped (or left, before a monitor was unplugged) between screens goes to the nearest
function onScreen(b) {
  const [x, y, w, h] = screenOf(b), r = PET.rect(b);
  const nx = Math.min(Math.max(b.x, x), x + w - r.width), ny = Math.min(Math.max(b.y, y), y + h - r.height);
  if (nx !== b.x || ny !== b.y) YB.rt.moveTo(b, nx, ny, 500);
}
function setScreens(list) {
  if (!list?.length) return;
  screens = list;
  PET.bears.forEach(onScreen);
}
invoke('screen_areas').then(setScreens);
listen('screens', e => setScreens(e.payload));
YB.on('dropped', onScreen);

// 角色 menu (radial + tray): every character once — the built-in ones and the members of the pet packages found on
// disk (Rust's list_pets) — ticked when on screen; picking one adds it or takes it away (see packs.js), up to MAX
const visible = () => PET.bears.filter(b => !b.hidden);
const MAX = 4;
let packs = [];
const keyOf = e => e.builtin ? 'b:' + e.builtin : `p:${e.key}#${e.index}`;
// everyone who can be picked; a built-in character a package also has (e.g. 一二 drawn from frames) gives way to it
function available() {
  const fromPacks = packs.flatMap(p => p.members.map((m, index) => ({ key: p.key, index, name: m.name, sheet: m.sheet, credit: m.credit, awu: m.awu })));
  const names = new Set(fromPacks.map(e => e.name));
  return [...Object.values(YB.characters).filter(ch => !ch.sprite && !names.has(ch.name)).map(ch => ({ builtin: ch.id })), ...fromPacks];
}
// who is on screen now, as roster entries; a built-in character that a package also has counts as the package one
function current() {
  let list = visible().map(b => ({ builtin: b.id }));
  // the same filter packs.js used, so entries line up with PET.bears
  if (PET.cast.id === 'roster') try { list = JSON.parse(localStorage.getItem('roster')).filter(r => r.builtin ? YB.characters[r.builtin] : r.sheet).filter((e, i) => !PET.bears[i]?.hidden); } catch {}
  const avail = available();
  return list.map(e => e.builtin && avail.find(a => !a.builtin && a.name === YB.characters[e.builtin].name) || e);
}
function roles() {
  const on = new Set(current().map(keyOf));
  const icon = e => e.builtin ? Object.values(PET.casts).find(c => c.members.includes(e.builtin))?.icon : '🐾';
  return [
    ...available().map(e => ({ id: 'pick:' + keyOf(e), icon: icon(e), label: e.name || YB.characters[e.builtin].name, checked: on.has(keyOf(e)) })),
    { id: 'open_pets', icon: '📂', label: '宠物包文件夹', checked: false },
  ];
}
function setRoster(list) {
  try { localStorage.setItem('roster', JSON.stringify(list)); } catch {}
  settings.show = []; // everyone in the roster is shown
  save();
  PET.setCast('roster');
}
// Explorer's "请X删除" entries follow who is shown; 'all' sends everyone
function eaters() {
  if (!settings.explorerMenu) return [];
  const list = visible().map(b => ({ id: b.id, label: `请${b.ch.name}删除` }));
  const all = list.length > 2 ? '请大家一起删除' : `请${visible().map(b => b.ch.name).join('和')}删除`;
  return list.length > 1 ? [...list, { id: 'all', label: all }] : list;
}

function apply() {
  PET.setSize(settings.size);
  const ids = settings.show.filter(id => PET.cast.members.includes(id)); // saved while another cast was on
  PET.show(ids.length ? ids : PET.cast.members);
  PET.outfit('glasses', settings.glasses);
  PET.outfit('scarf', settings.scarf);
  PET.config.autoplay = settings.autoplay;
  invoke('sync_menu', { settings: { ...settings, roles: roles(), eaters: eaters() } });
}
apply();
invoke('list_pets').then(p => { packs = p; apply(); refreshRoster(); });
// packages may have been re-installed (new names, actions…): keep the saved roster's copies in step, reloading once.
// Nothing picked yet (first run): if a package draws the built-in characters from frames, show that one instead.
function refreshRoster() {
  let first = null;
  try { first = localStorage.getItem('roster'); } catch {}
  if (first === null && PET.cast.id !== 'roster') {
    const list = current();
    if (list.some(e => !e.builtin)) setRoster(list);
    return;
  }
  if (PET.cast.id !== 'roster') return;
  let saved;
  try { saved = JSON.parse(localStorage.getItem('roster')) || []; } catch { return; }
  const avail = available(), fresh = saved.map(e => (e.builtin
    ? avail.find(a => !a.builtin && a.name === YB.characters[e.builtin]?.name)
    : avail.find(a => keyOf(a) === keyOf(e)) || avail.find(a => !a.builtin && a.name === e.name)) || e);
  if (JSON.stringify(fresh) !== JSON.stringify(saved)) setRoster(fresh);
}

// characters from a pet package: their sheets come from the package files, through Rust
for (const b of PET.bears.filter(b => b.ch.sprite)) {
  invoke('read_pet_sheet', { path: b.ch.sprite.sheet })
    .then(bytes => PET.setSprite(b.id, URL.createObjectURL(new Blob([bytes]))))
    .catch(() => { // the package was moved or deleted: drop that character (or go back to the built-in cast)
      const rest = current().filter(e => e.sheet !== b.ch.sprite.sheet);
      if (rest.length) return setRoster(rest);
      try { localStorage.setItem('roster', '[]'); } catch {} // '[]', not removed: don't switch back to it on the next start
      settings.show = DEFAULTS.show;
      save();
      PET.setCast(Object.keys(PET.casts)[0]);
    });
}

// --- click-through: tell Rust where the bears (and their bubbles) are ---
let sent = '';
function sendHitRects() {
  const els = PET.dragging() || YB.radial.isOpen() ? [document.body] : document.querySelectorAll('.bear:not(.hidden), .bubble');
  const rects = [...els].map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const key = rects.map(r => [r.x | 0, r.y | 0, r.w | 0, r.h | 0].join()).join(';');
  if (key !== sent) { sent = key; invoke('set_hit_rects', { rects }); }
}
setInterval(sendHitRects, 50);

// --- what the computer is doing ---
let cursor = { x: innerWidth / 2, y: innerHeight / 2 };
listen('cursor', e => { cursor = { x: e.payload[0], y: e.payload[1] }; PET.lookAt(cursor.x, cursor.y); });
listen('idle', e => PET.setIdle(e.payload));
listen('fullscreen', e => PET.setFullscreen(e.payload));

// --- right click on a bear: radial menu (the tray keeps the native system menu) ---
// hold right, flick toward an item, release = pick; or release and click
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('pointerdown', async e => {
  if (e.button !== 2 || !e.target.closest('.bear')) return;
  const [autostart, found] = await Promise.all([invoke('autostart_enabled'), invoke('list_pets')]);
  packs = found;
  const on = { 'outfit:glasses': settings.glasses, 'outfit:scarf': settings.scarf, on_top: settings.onTop,
    autoplay: settings.autoplay, explorer_menu: settings.explorerMenu, autostart };
  const leaf = (id, icon, label) => ({ id, icon, label, checked: on[id] });
  // only what the cast on screen can do (a lone character has nobody to hug or dance with)
  const act = (name, icon, label) => PET.can(name) && leaf('act:' + name, icon, label);
  const cat = (icon, label, kids, hint) => (kids = kids.filter(Boolean)).length > 0 && { icon, label, children: kids, hint };
  // a pet drawn from frames offers its own actions (named after what its sheet shows); the others the usual ones
  const pet = PET.bears.find(b => b.el === e.target.closest('.bear')), sp = pet?.ch.sprite;
  // rows past the 9 Codex ones (newer sheets have more) are actions too
  const extra = sp ? Array.from({ length: Math.max(0, (pet.sheet.rows || 9) - 9) }, (_, k) => [9 + k, '✨', '动作' + (10 + k)]) : [];
  const moves = sp
    ? [cat('🤗', '互动', [act('hug', '🤗', '抱抱'), act('dance', '🎵', '跳舞')]),
       cat('✨', pet.ch.name, [...[...sp.actions, ...extra].map(([row, icon, label]) => leaf(`row:${pet.id}:${row}`, icon, label)),
         leaf(`row:${pet.id}:any`, '🎲', '随便来一个'), act('sleep', '💤', '睡觉')])]
    : [cat('🤗', '互动', [act('hug', '🤗', '抱抱'), act('wave', '👋', '挥手'), act('dance', '🎵', '跳舞'), act('shy', '😊', '害羞'), act('rose', '🌹', '送花')]),
       cat('💭', '动作', [act('think', '💭', '思考'), act('sleep', '💤', '睡觉'), act('noodle', '🍜', '吃面'), act('boba', '🧋', '奶茶')])];
  YB.radial.open({
    x: e.clientX, y: e.clientY,
    items: [
      cat('🔄', '角色', roles(), '点击：换成它 · 按住 Ctrl 或 Shift 点击：添加或移除（最多 4 只）'),
      ...moves,
      PET.can('outfit') && cat('🕶️', '装扮', [leaf('outfit:glasses', '🕶️', '墨镜'), leaf('outfit:scarf', '🧣', '围巾')]),
      cat('🍪', '投喂', [leaf('diary', '📒', '今日食谱'), leaf('undo', '↩️', '吐出来')]),
      cat('🗑️', '回收站', [leaf('open_trash', '📂', '打开'), leaf('empty_trash', '🧹', '清空')]),
      cat('⚙️', '设置', [leaf('on_top', '📌', '置顶'), leaf('autoplay', '🧸', '自己玩'), leaf('autostart', '🚀', '开机自启'), leaf('explorer_menu', '🖱️', '文件菜单')]),
      leaf('toggle', '🙈', '隐藏'),
      leaf('about', 'ℹ️', '关于'),
    ].filter(Boolean),
    onPick: (id, mods) => (RUST_ITEMS.has(id) ? invoke('menu_action', { id }) : handleMenu(id, mods)),
  });
  sendHitRects(); // take the whole window right away so a fast flick isn't lost
});
// items whose work happens in Rust (files, autostart, the window itself)
const RUST_ITEMS = new Set(['undo', 'open_trash', 'empty_trash', 'autostart', 'toggle', 'quit', 'open_pets']);

// --- mouse wheel over a bear: resize (feet stay put), remembered like the other settings ---
let saveSoon = 0;
addEventListener('wheel', e => {
  if (!e.target.closest('.bear')) return;
  e.preventDefault();
  settings.size = Math.round(Math.min(360, Math.max(90, settings.size * (e.deltaY < 0 ? 1.08 : 1 / 1.08))));
  PET.setSize(settings.size);
  clearTimeout(saveSoon);
  saveSoon = setTimeout(save, 400);
}, { passive: false });

// --- menu commands from Rust ---
const sayAny = (text, ms = 4000) => { const b = visible()[0]; if (b) PET.say(b, text, { ms }); };
const TOGGLES = { 'outfit:glasses': 'glasses', 'outfit:scarf': 'scarf', autoplay: 'autoplay', on_top: 'onTop', explorer_menu: 'explorerMenu' };
function handleMenu(id, { add = false } = {}) { // add: Ctrl / Shift held (radial menu only)
  const [kind, arg] = id.split(':');
  if (kind === 'act') return PET.run(arg);
  if (kind === 'row') { const [, who, row] = id.split(':'); return PET.playRow(who, row === 'any' ? undefined : +row); }
  if (id === 'diary') return sayAny(PET.diary(visible().map(b => b.ch.name).join('和')), 6000);
  if (id === 'about') return sayAny(`Awu Pet · 嗷呜桌宠 · ${PET.cast.name}\n${PET.cast.credit}\nPowered by noSugarK`);
  // 角色: "pick:<key>" puts that character on screen or takes it away
  // 角色: a plain pick switches to that character; with Ctrl / Shift it is added or taken away
  if (kind === 'pick') {
    const k = id.slice(5), now = current(), on = now.some(e => keyOf(e) === k), entry = available().find(e => keyOf(e) === k);
    if (!add) return entry && !(on && now.length === 1) && setRoster([entry]);
    if (on && now.length === 1) return sayAny('至少要留一只陪你哦');
    if (!on && now.length >= MAX) return sayAny(`最多同时 ${MAX} 只哦\n先让一只回去休息吧`);
    if (!on && !entry) return;
    return setRoster(on ? now.filter(e => keyOf(e) !== k) : [...now, entry]);
  }
  if (kind === 'size') settings.size = +arg;
  else if (TOGGLES[id]) settings[TOGGLES[id]] = !settings[TOGGLES[id]];
  else return;
  save();
  apply();
}
listen('menu', ({ payload: id }) => handleMenu(id));
listen('notice', e => sayAny(e.payload));
listen('ask_empty', async ({ payload: n }) => {
  const b = visible()[0];
  if (!b || await PET.say(b, `回收站里有 ${n} 个东西\n全部清空吗？清空后就找不回来了`, { choices: ['清空', '算了'] }) !== 0) return;
  try { PET.say(b, `清空了 ${await invoke('empty_trash')} 个，肚子舒服了～`); }
  catch (err) { PET.say(b, '清空失败…\n' + err); }
});

// --- 文件投喂 ---
// check → (confirm) → trash → chew + react; eaters are the bears already standing there with their mouths open
async function feed(eaters, paths, from) {
  const meal = await invoke('check_meal', { paths });
  const lead = eaters[0];
  if (!meal.items.length) { PET.hungry(null); PET.say(lead, '这个不能吃…\n（系统文件或找不到）'); return false; }
  if (meal.needsConfirm) {
    const what = `${meal.items.length} 个${meal.hasDirs ? '（含文件夹）' : ''}`;
    if (await PET.say(lead, `要吃掉 ${what} 吗？\n会放进回收站`, { choices: ['吃！', '不吃'] }) !== 0) { PET.hungry(null); return false; }
  }
  // a folder is a big box: the partner comes to help carry it
  if (meal.hasDirs && eaters.length === 1) { const h = await PET.helper(lead); if (h) eaters = [lead, h]; }
  try {
    await invoke('eat_files', { paths: meal.items.map(it => it.path) });
  } catch (err) {
    PET.hungry(null);
    PET.say(lead, '呜…没吃下去\n' + err);
    return false;
  }
  await PET.eat(eaters, meal.items, from);
  if (meal.blocked.length) setTimeout(() => PET.say(lead, `有 ${meal.blocked.length} 个不能吃，吐掉了`), 4000);
  return true;
}

// drag files over a bear → huge mouth; drop → eaten
const toCss = p => ({ x: p.x / devicePixelRatio, y: p.y / devicePixelRatio });
let target = null;
T.webview.getCurrentWebview().onDragDropEvent(({ payload: p }) => {
  if (p.type === 'enter' || p.type === 'over') {
    const pos = toCss(p.position);
    target = PET.bearAt(pos.x, pos.y);
    PET.hungry(target);
    return;
  }
  const b = target;
  target = null;
  if (p.type !== 'drop' || !b) return PET.hungry(null);
  feed([b], p.paths, toCss(p.position));
});

// Explorer's right-click "请X删除" (who: a character id, or 'all' / the older 'both'): run to the file, then eat it
listen('errand', async ({ payload: { who, paths, target } }) => {
  let list = visible().filter(b => who === 'all' || who === 'both' || b.id === who);
  if (!list.length) list = visible().slice(0, 1);
  if (!list.length) return;
  const spot = target ? { x: target[0], y: target[1] } : cursor;
  const goHome = await PET.errand(list, spot);
  await feed(list, paths, spot);
  goHome();
});

invoke('pet_ready');
})();
