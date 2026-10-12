// The two recycle-bin celebrations are checked without touching desktop files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/actions.js', 'utf8');
const action = source.slice(source.indexOf('async function eat('), source.indexOf('// "请'));

async function check(random, expected) {
  const calls = [];
  const pet = { dir: 1, el: {
    classList: { remove: () => {}, add: () => {}, toggle: () => {} }, offsetWidth: 10,
  } };
  const kind = { emoji: '📄', say: '好吃', chew: 10 };
  const eat = vm.runInNewContext(action + '\neat', {
    Math: { random: () => random, min: Math.min },
    YB: { feeding: { classify: () => ({ kind, huge: false }), record: () => calls.push('record') }, emit: () => calls.push('ate') },
    interact: () => {}, center: () => ({ x: 100, y: 80 }), sleep: async () => {},
    setState: (_b, state) => calls.push(state),
    flyInto: () => calls.push('fly'), kickAway: () => calls.push('kick-file'),
    burst: () => {}, say: () => {}, all: {},
  });
  assert.equal(await eat([pet], [{ path: 'sample.txt' }], { x: 150, y: 100 }), expected);
  assert.ok(calls.includes(expected === 'eat' ? 'fly' : 'kick-file'));
  assert.ok(calls.includes(expected));
  assert.ok(!calls.includes(expected === 'eat' ? 'kick-file' : 'fly'));
}

Promise.all([check(.1, 'eat'), check(.9, 'kick')]).catch(err => { console.error(err); process.exitCode = 1; });
