// Runs the site's own renderer (docs/js) in Node so the video draws exactly the same bears.
// Output: src/bears.generated.json — { yier: { svg, model }, bubu: { svg, model } }
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const js = f => readFileSync(new URL(`../../docs/js/${f}`, import.meta.url), 'utf8');
const ctx = vm.createContext({ EventTarget, CustomEvent: class extends Event {} });
for (const f of ['core/yb.js', 'models/chibi-bear.js', 'characters/yier.js', 'characters/bubu.js', 'core/render.js'])
  vm.runInContext(js(f), ctx, { filename: f });

const out = vm.runInContext(`Object.fromEntries(Object.values(YB.characters).map(ch =>
  [ch.id, { svg: YB.render.bear(ch), model: YB.models[ch.model] }]))`, ctx);
writeFileSync(new URL('../src/bears.generated.json', import.meta.url), JSON.stringify(out));
console.log('bears:', Object.keys(out).join(', '));
copyFileSync(new URL('../../docs/img/icon.png', import.meta.url), new URL('../public/icon.png', import.meta.url));
