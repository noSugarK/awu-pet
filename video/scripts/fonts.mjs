// Downloads Noto Sans SC (500 + 900) subset to exactly the characters used in src/, into public/fonts/.
// One small woff2 per weight instead of ~200 unicode-range chunks fetched at render time.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const used = readdirSync(src).filter(f => f.endsWith('.tsx')).map(f => readFileSync(new URL(f, src), 'utf8')).join('');
const text = [...new Set(ascii + used.replace(/[\x00-\x7f]/g, ''))].join('');
const dir = new URL('../public/fonts/', import.meta.url);
mkdirSync(dir, { recursive: true });

// fonts.googleapis.com resets connections now and then; retry a few times
const get = async (url, opts, tries = 6) => {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, opts); if (r.ok) return r; throw new Error(`HTTP ${r.status}`); }
    catch (e) { if (i >= tries) throw e; await new Promise(r => setTimeout(r, 1500 * i)); }
  }
};
const ua = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' };
for (const w of [500, 900]) {
  const css = await (await get(`https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${w}&text=${encodeURIComponent(text)}`, { headers: ua })).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`no font url for weight ${w}:\n${css}`);
  writeFileSync(new URL(`noto-sans-sc-${w}.woff2`, dir), Buffer.from(await (await get(url)).arrayBuffer()));
}
console.log(`fonts: Noto Sans SC 500/900, ${[...text].length} glyphs`);
