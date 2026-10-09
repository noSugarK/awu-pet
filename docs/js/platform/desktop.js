// Desktop shell (pet.html inside Tauri, desktop/src-tauri): bridges the pet runtime and Rust.
// Designed by 黄小B · Powered by noSugarK
(() => {
const T = window.__TAURI__;
if (!T) return; // opened in a normal browser
const { invoke } = T.core;
const { listen } = T.event;

// --- settings live in the webview's localStorage; Rust only mirrors them in the menus ---
const DEFAULTS = { show: ['yier', 'bubu'], size: 180, glasses: false, scarf: false, autoplay: true, onTop: true, explorerMenu: true };
let settings = DEFAULTS;
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('settings') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('settings', JSON.stringify(settings)); } catch {} };

// bears live on the taskbar: start bottom-right, wander along the bottom edge, remember where they were left
const bearH = () => PET.rect(PET.bears[0]).height;
Object.assign(PET.config, {
  sparkTrail: false,
  sleepAfter: 90000,
  playAfter: 15000,
  rememberPosition: true,
  home: () => ({ x: innerWidth - bearH() * 2, y: innerHeight - bearH() / 2 }),
  walkArea: () => ({ x0: 0, x1: innerWidth, y0: innerHeight - bearH(), y1: innerHeight }),
});

function apply() {
  PET.setSize(settings.size);
  PET.show(settings.show);
  PET.outfit('glasses', settings.glasses);
  PET.outfit('scarf', settings.scarf);
  PET.config.autoplay = settings.autoplay;
  invoke('sync_menu', { settings });
}
apply();

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
  const autostart = await invoke('autostart_enabled');
  const on = { 'outfit:glasses': settings.glasses, 'outfit:scarf': settings.scarf, on_top: settings.onTop,
    autoplay: settings.autoplay, explorer_menu: settings.explorerMenu, autostart };
  const leaf = (id, icon, label) => ({ id, icon, label, checked: on[id] });
  YB.radial.open({
    x: e.clientX, y: e.clientY,
    items: [
      { icon: '🤗', label: '互动', children: [leaf('act:hug', '🤗', '抱抱'), leaf('act:wave', '👋', '挥手'), leaf('act:dance', '🎵', '跳舞'), leaf('act:shy', '😊', '害羞'), leaf('act:rose', '🌹', '送花')] },
      { icon: '💭', label: '动作', children: [leaf('act:think', '💭', '思考'), leaf('act:sleep', '💤', '睡觉'), leaf('act:noodle', '🍜', '吃面'), leaf('act:boba', '🧋', '奶茶')] },
      { icon: '🕶️', label: '装扮', children: [leaf('outfit:glasses', '🕶️', '墨镜'), leaf('outfit:scarf', '🧣', '围巾')] },
      { icon: '🍪', label: '投喂', children: [leaf('diary', '📒', '今日食谱'), leaf('undo', '↩️', '吐出来')] },
      { icon: '🗑️', label: '回收站', children: [leaf('open_trash', '📂', '打开'), leaf('empty_trash', '🧹', '清空')] },
      { icon: '⚙️', label: '设置', children: [leaf('on_top', '📌', '置顶'), leaf('autoplay', '🧸', '自己玩'), leaf('autostart', '🚀', '开机自启'), leaf('explorer_menu', '🖱️', '文件菜单')] },
      leaf('toggle', '🙈', '隐藏'),
      leaf('about', 'ℹ️', '关于'),
    ],
    onPick: id => (RUST_ITEMS.has(id) ? invoke('menu_action', { id }) : handleMenu(id)),
  });
  sendHitRects(); // take the whole window right away so a fast flick isn't lost
});
// items whose work happens in Rust (files, autostart, the window itself)
const RUST_ITEMS = new Set(['undo', 'open_trash', 'empty_trash', 'autostart', 'toggle', 'quit']);

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
const visible = () => PET.bears.filter(b => !b.hidden);
const sayAny = (text, ms = 4000) => { const b = visible()[0]; if (b) PET.say(b, text, { ms }); };
const TOGGLES = { 'outfit:glasses': 'glasses', 'outfit:scarf': 'scarf', autoplay: 'autoplay', on_top: 'onTop', explorer_menu: 'explorerMenu' };
function handleMenu(id) {
  const [kind, arg] = id.split(':');
  if (kind === 'act') return PET.run(arg);
  if (id === 'diary') return sayAny(PET.diary(visible().map(b => b.ch.name).join('和')), 6000);
  if (id === 'about') return sayAny('YierBubu-Pet · 一二布布桌宠\nDesigned by 黄小B\nPowered by noSugarK');
  if (kind === 'show') settings.show = arg === 'both' ? ['yier', 'bubu'] : [arg];
  else if (kind === 'size') settings.size = +arg;
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

// Explorer's right-click "请一二删除 / 请布布删除 / 请一二布布删除": run to the file, then eat it
listen('errand', async ({ payload: { who, paths, target } }) => {
  let list = visible().filter(b => who === 'both' || b.id === who);
  if (!list.length) list = visible().slice(0, 1);
  if (!list.length) return;
  const spot = target ? { x: target[0], y: target[1] } : cursor;
  const goHome = await PET.errand(list, spot);
  await feed(list, paths, spot);
  goHome();
});

invoke('pet_ready');
})();
