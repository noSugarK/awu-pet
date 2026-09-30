// Bridge between the shared pet engine and the Tauri desktop shell (desktop/src-tauri).
// 一二 & 布布 · Designed by 黄小B · Powered by noSugarK
(() => {
const T = window.__TAURI__;
if (!T) return; // opened in a normal browser
const { invoke } = T.core;
const { listen } = T.event;

// --- settings, kept in the webview's localStorage ---
const DEFAULTS = { show: ['yier', 'bubu'], size: 180, glasses: false, scarf: false, autoplay: true };
let settings = DEFAULTS;
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('settings') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('settings', JSON.stringify(settings)); } catch {} };

// bears live on the taskbar: start bottom-right, wander along the bottom edge
const bearH = () => PET.rect(PET.bears[0]).height;
PET.config.sparkTrail = false;
PET.config.sleepAfter = 90000;
PET.config.playAfter = 15000;
PET.config.home = () => ({ x: innerWidth - bearH() * 2, y: innerHeight - bearH() / 2 });
PET.config.walkArea = () => ({ x0: 0, x1: innerWidth, y0: innerHeight - bearH(), y1: innerHeight });

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
setInterval(() => {
  const els = PET.dragging() ? [document.body] : document.querySelectorAll('.bear:not(.hidden), .bubble');
  const rects = [...els].map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const key = rects.map(r => [r.x | 0, r.y | 0, r.w | 0, r.h | 0].join()).join(';');
  if (key !== sent) { sent = key; invoke('set_hit_rects', { rects }); }
}, 50);

listen('cursor', e => PET.lookAt(e.payload[0], e.payload[1]));
listen('idle', e => PET.setIdle(e.payload));

// --- right click on a bear: native context menu (same as the tray menu) ---
addEventListener('contextmenu', e => {
  e.preventDefault();
  if (e.target.closest('.bear')) invoke('show_menu');
});

// --- menu commands from Rust ---
const sayAny = text => { const b = PET.bears.find(b => !b.hidden); if (b) PET.say(b, text, { ms: 4000 }); };
listen('menu', ({ payload: [id, checked] }) => {
  const [kind, arg] = id.split(':');
  if (kind === 'act') PET.run(arg);
  else if (kind === 'show') settings.show = arg === 'both' ? ['yier', 'bubu'] : [arg];
  else if (kind === 'size') settings.size = +arg;
  else if (kind === 'outfit') settings[arg] = checked;
  else if (id === 'autoplay') settings.autoplay = checked;
  else if (id === 'about') return sayAny('一二 & 布布 桌宠\nDesigned by 黄小B\nPowered by noSugarK');
  else return;
  save();
  apply();
});
listen('notice', e => sayAny(e.payload));
listen('ask_empty', async ({ payload: n }) => {
  const b = PET.bears.find(b => !b.hidden);
  if (!b || await PET.say(b, `回收站里有 ${n} 个东西\n全部清空吗？清空后就找不回来了`, { choices: ['清空', '算了'] }) !== 0) return;
  try { PET.say(b, `清空了 ${await invoke('empty_trash')} 个，肚子舒服了～`); }
  catch (err) { PET.say(b, '清空失败…\n' + err); }
});

// --- feeding: drag files over a bear → huge mouth; drop → eaten into the recycle bin ---
const toCss = p => ({ x: p.x / devicePixelRatio, y: p.y / devicePixelRatio });
let target = null;
T.webview.getCurrentWebview().onDragDropEvent(async ({ payload: p }) => {
  if (p.type === 'enter' || p.type === 'over') {
    const pos = toCss(p.position);
    target = PET.bearAt(pos.x, pos.y);
    PET.hungry(target);
    return;
  }
  const b = target;
  target = null;
  PET.hungry(null);
  if (p.type !== 'drop' || !b) return;
  const meal = await invoke('check_meal', { paths: p.paths });
  if (!meal.allowed.length) return PET.say(b, '这个不能吃…\n（系统文件或找不到）');
  if (meal.needsConfirm) {
    const what = `${meal.allowed.length} 个${meal.hasDirs ? '（含文件夹）' : ''}`;
    if (await PET.say(b, `要吃掉 ${what} 吗？\n会放进回收站`, { choices: ['吃！', '不吃'] }) !== 0) return;
  }
  try {
    const n = await invoke('eat_files', { paths: meal.allowed });
    PET.eat(b, n, toCss(p.position));
    if (meal.blocked.length) setTimeout(() => PET.say(b, `有 ${meal.blocked.length} 个不能吃，吐掉了`), 4500);
  } catch (err) {
    PET.say(b, '呜…没吃下去\n' + err);
  }
});
})();
