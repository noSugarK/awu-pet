// Small checks for movement cancellation and sprite rows without a DOM or desktop files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Both built-ins now use the bundled frame sheets; no vector renderer is loaded.
const builtins = [];
for (const id of ['yier', 'bubu']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, `../characters/${id}.js`), 'utf8'),
    { YB: { character: ch => builtins.push(ch) } });
  const asset = path.join(__dirname, '../../', builtins.at(-1).sprite.sheet);
  assert.equal(fs.readFileSync(asset).toString('ascii', 8, 12), 'WEBP');
}
for (const page of ['index.html', 'pet.html']) {
  const html = fs.readFileSync(path.join(__dirname, '../../', page), 'utf8');
  assert.ok(!html.includes('chibi-bear.js') && !html.includes('core/render.js'));
}

const source = fs.readFileSync(__dirname + '/runtime.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const moveTo = vm.runInNewContext(
  between('function moveTo(', '// --- effects ---') + '\nmoveTo',
  { rect: () => ({ width: 20, height: 20 }), clamp: (v, a, z) => Math.max(a, Math.min(z, v)), innerWidth: 100, innerHeight: 100 },
);
const bear = { goal: null };
const interrupted = moveTo(bear, 10, 10);
const arrived = moveTo(bear, 20, 20);

const spriteFrame = vm.runInNewContext(
  between('const ROW =', '// The sprite cell') +
  between('function spriteFrame(', '\nconst bears =') + '\nspriteFrame',
);
const sprite = { ch: { sprite: {} }, state: 'row10', el: { classList: { contains: () => false } },
  dir: 0, sheet: { cols: 8, rows: 12, frames: Array(12).fill(1) }, sprite: { style: {} } };
spriteFrame(sprite, 0, false);
assert.match(sprite.sprite.style.backgroundPosition, /90\.909.*%$/);

(async () => {
  assert.equal(await interrupted, false);
  bear.goal.done(true);
  assert.equal(await arrived, true);

  const desktop = fs.readFileSync(__dirname + '/../platform/desktop.js', 'utf8');
  const right = [1920, -522, 1536, 816], left = [0, 0, 1920, 1032];
  const screenAt = vm.runInNewContext(
    desktop.slice(desktop.indexOf('const screenAt ='), desktop.indexOf('Object.assign(PET.config')) + '\nscreenAt',
    { screens: [right, left], PET: { rect: () => ({ left: 1850, top: 600, width: 180, height: 180 }) } },
  );
  assert.equal(screenAt(2000, 100), right);
  let destination;
  const onScreen = vm.runInNewContext(
    desktop.slice(desktop.indexOf('function onScreen('), desktop.indexOf('function setScreens(')) + '\nonScreen',
    { screenAt, screenOf: () => left, PET: { rect: () => ({ width: 180, height: 180 }) },
      YB: { rt: { moveTo: (_bear, x, y) => { destination = [x, y]; } } } },
  );
  onScreen({ x: 1850, y: 600 }, { x: 2000, y: 100 });
  assert.deepEqual(destination, [1920, 114]);
  const sizedPet = { el: { style: {} } };
  const sizeSetting = { size: 180 };
  let bounds = { left: 100, top: 100, width: 180, height: 195, bottom: 295 };
  const resize = vm.runInNewContext(
    desktop.slice(desktop.indexOf('function resizePets()'), desktop.indexOf('Object.assign(PET.config')) + '\nresizePets',
    { PET: { bears: [sizedPet], rect: () => bounds }, YB: { rt: { setPos: () => {} } },
      screenOf: () => [0, 0, 768, 412, 1], settings: sizeSetting, devicePixelRatio: 2.5 },
  );
  resize();
  assert.equal(sizedPet.el.style.width, '72px'); // 180 physical pixels on the 100% monitor
  sizeSetting.size = 360;
  resize();
  assert.equal(sizedPet.el.style.width, '91px'); // capped on the smaller monitor
  bounds = { left: 800, top: 100, width: 180, height: 195, bottom: 295 };
  const resizeHighDpi = vm.runInNewContext(
    desktop.slice(desktop.indexOf('function resizePets()'), desktop.indexOf('Object.assign(PET.config')) + '\nresizePets',
    { PET: { bears: [sizedPet], rect: () => bounds }, YB: { rt: { setPos: () => {} } },
      screenOf: () => [768, 0, 1536, 816, 2.5], settings: { size: 180 }, devicePixelRatio: 2.5 },
  );
  resizeHighDpi();
  assert.equal(sizedPet.el.style.width, '180px');
  const menuSize = vm.runInNewContext(
    desktop.slice(desktop.indexOf('const menuSize ='), desktop.indexOf('function resizePets()')) + '\nmenuSize',
  );
  assert.equal(menuSize(72, [0, 0, 768, 412, 1]), 185.4);
  assert.equal(menuSize(180, [768, 0, 1536, 816, 2.5]), 409.5);
  const calls = [];
  let choice = 1;
  let moved = 1;
  let needsConfirm = true;
  const pet = { say: async (_bear, _text, options) => { if (options?.choices) { assert.deepEqual(Array.from(options.choices), ['移入回收站', '取消']); return choice; } },
    hungry: () => {}, eat: async () => calls.push('animate') };
  const feed = vm.runInNewContext(
    desktop.slice(desktop.indexOf('async function feed('), desktop.indexOf('// Drag files over a bear')) + '\nfeed',
    { PET: pet, invoke: async command => { calls.push(command); return command === 'eat_files' ? moved : { items: [{ path: 'example.txt' }], blocked: [], hasDirs: false, needsConfirm }; } },
  );
  assert.equal(await feed([{}], ['example.txt']), false);
  assert.deepEqual(calls, ['check_meal']);
  choice = 0;
  assert.equal(await feed([{}], ['example.txt']), true);
  assert.deepEqual(calls, ['check_meal', 'check_meal', 'eat_files', 'animate']);
  needsConfirm = false;
  choice = 1; // a small meal ignores the confirmation choice
  assert.equal(await feed([{}], ['example.txt']), true);
  assert.deepEqual(calls.slice(-3), ['check_meal', 'eat_files', 'animate']);
  moved = 0;
  assert.equal(await feed([{}], ['example.txt']), false);
  assert.deepEqual(calls.slice(-2), ['check_meal', 'eat_files']);

  const urls = [], installed = [];
  const catalogue = vm.runInNewContext(
    desktop.slice(desktop.indexOf('const CATALOG ='), desktop.indexOf('const keyOf =')) + '\nCATALOG',
  );
  for (const pack of catalogue) for (const dir of pack.dirs) {
    const folder = path.join(__dirname, '../../../desktop/optional-pets', pack.name, dir);
    assert.ok(fs.existsSync(path.join(folder, 'pet.json')) && fs.existsSync(path.join(folder, 'spritesheet.webp')));
  }
  const download = vm.runInNewContext(
    desktop.slice(desktop.indexOf('const CATALOG ='), desktop.indexOf('const keyOf =')) +
    desktop.slice(desktop.indexOf('async function downloadPack('), desktop.indexOf('const TOGGLES =')) + '\ndownloadPack',
    { sayAny: () => {}, apply: () => {}, fetch: async url => { urls.push(url); return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2]).buffer }; },
      invoke: async (command, payload) => { if (command === 'install_pet_pack') installed.push(payload); return []; } },
  );
  await download('dragon');
  assert.equal(urls.length, 2);
  assert.ok(urls.every(url => url.includes('/v0.5.1/desktop/src-tauri/pets/%E5%A5%B6%E9%BE%99/')));
  assert.equal(installed[0].id, 'dragon');
  assert.deepEqual(Array.from(installed[0].members[0].sheet), [1, 2]);
})().catch(error => { console.error(error); process.exitCode = 1; });
