const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const handlers = {};
const makeNode = () => ({
  style: {}, classList: { add() {}, toggle() {} },
  append() {}, replaceChildren() {}, remove() {}, setAttribute() {},
});
const body = { append(node) { this.child = node; } };
const context = {
  YB: {}, document: { body, createElement: makeNode, createElementNS: makeNode },
  addEventListener(name, fn) { handlers[name] = fn; },
  requestAnimationFrame(fn) { fn(); }, innerWidth: 2304, innerHeight: 1032,
};
vm.runInNewContext(fs.readFileSync(__dirname + '/radial.js', 'utf8'), context);
let picked;
context.YB.radial.open({ x: 2220, y: 150, size: 280, bounds: [768, 0, 1536, 816],
  items: [{ id: 'action', icon: '!', label: '动作' }], onPick: id => { picked = id; } });
assert.equal(body.child.style.width, '280px');
assert.ok(parseFloat(body.child.style.left) <= 2304 - 198 * 280 / 380); // kept within this monitor
handlers.pointermove({ clientX: 2158, clientY: 100 });
handlers.pointerup({ button: 0, clientX: 2158, clientY: 100 });
assert.equal(picked, 'action'); // hit testing follows the scaled ring
