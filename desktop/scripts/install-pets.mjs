// Fetches the community pet packages Awu Pet uses into its pets folder (the app ships none of them).
// Each set is a folder; one with two package folders inside is a pair (a 角色 menu entry named after the folder).
// Run: node desktop/scripts/install-pets.mjs   (Node 18+; re-run to update; --dry-run prints the plan)
//      behind a proxy (HTTPS_PROXY set): NODE_USE_ENV_PROXY=1 node desktop/scripts/install-pets.mjs   (Node 24+)
// Sources: Petdex (https://petdex.dev — user-submitted fan art) and littlegqqq/Yier-Bubu on GitHub.
// Their pictures belong to their authors and the characters' rights holders: for personal use only.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SETS = [
  { dir: '一二布布', ip: 'Designed by 黄小B', members: [
    { name: '一二', github: 'littlegqqq/Yier-Bubu/main/pets/yier' },
    { name: '布布', github: 'littlegqqq/Yier-Bubu/main/pets/bubu' },
  ] },
  { dir: '小白和小金毛', ip: '线条小狗 © moonlab_studio', members: [{ name: '小白', petdex: 'line-puppy' }, { name: '小金毛', petdex: 'xiao-jimao' }] },
  { dir: '噜噜和噜妹', ip: '噜噜与噜妹 © 原作者（抖音）', members: [{ name: '噜噜', petdex: 'lulu-3' }, { name: '噜妹', petdex: 'lumei' }] },
  { dir: '奶龙', ip: '奶龙 © 第七印象', members: [{ name: '奶龙', petdex: 'nailong-4' }] },
  { dir: '奶蛙', ip: '奶龙 © 第七印象', members: [{ name: '奶蛙', petdex: 'nailong' }] },
];

// Tauri's app data folder for identifier com.nosugark.yierbubupet
const ID = 'com.nosugark.yierbubupet';
const appData = process.platform === 'win32' ? join(process.env.APPDATA, ID)
  : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', ID)
  : join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), ID);
const PETS = join(appData, 'pets');
const dry = process.argv.includes('--dry-run');

async function get(url, as = 'json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'json' ? res.json() : Buffer.from(await res.arrayBuffer());
}

// Petdex's public catalogue: one row per pet, fields named in `fields`, asset paths relative to `assetBase`
const catalogue = await get('https://assets.petdex.dev/manifests/petdex-v2.json');
const petdex = new Map(catalogue.pets.map(row => {
  const o = Array.isArray(row) ? Object.fromEntries(catalogue.fields.map((f, i) => [f, row[i]])) : row;
  return [o.slug, o];
}));

for (const set of SETS) {
  const setDir = join(PETS, set.dir);
  if (!dry) { await rm(setDir, { recursive: true, force: true }); await mkdir(setDir, { recursive: true }); }
  for (const [i, m] of set.members.entries()) {
    let manifest, sheetUrl, source, artist;
    if (m.petdex) {
      const p = petdex.get(m.petdex);
      if (!p) throw new Error(`Petdex 上找不到 ${m.petdex}`);
      manifest = await get(`${catalogue.assetBase}/${p.petJson}`);
      sheetUrl = `${catalogue.assetBase}/${p.spritesheet}`;
      source = `https://petdex.dev/pets/${m.petdex}`;
      artist = `Petdex ${p.submittedBy || '未注明作者'}`;
    } else {
      const base = `https://raw.githubusercontent.com/${m.github}`;
      manifest = await get(`${base}/pet.json`);
      sheetUrl = `${base}/${manifest.spritesheetPath || 'spritesheet.webp'}`;
      source = `https://github.com/${m.github.split('/').slice(0, 2).join('/')}`;
      artist = m.github.split('/').slice(0, 2).join('/');
    }
    const sheet = 'spritesheet' + (sheetUrl.match(/\.(webp|png)$/i)?.[0] || '.webp');
    // a pair keeps its order by folder name; a single set holds the package directly
    const dir = set.members.length > 1 ? join(setDir, `${i + 1}-${m.name}`) : setDir;
    console.log(`${set.dir} / ${m.name}  ←  ${source}（${artist}）`);
    if (dry) continue;
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, sheet), await get(sheetUrl, 'bytes'));
    await writeFile(join(dir, 'pet.json'), JSON.stringify({ ...manifest, displayName: m.name, spritesheetPath: sheet, source, credit: `${set.ip} · 精灵图：${artist}` }, null, 2));
  }
}
console.log(dry ? '\n（只打印了计划，没有下载）' : `\n已装到 ${PETS}\n在桌宠右键菜单「角色」里选择。`);
