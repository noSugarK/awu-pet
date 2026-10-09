// Radial (marking) menu: hold the right button, flick toward an item and release to pick it;
// or release first and then click. Hovering a category opens its children on an outer ring.
//   YB.radial.open({ x, y, items: [{ id, icon, label, checked?, children? }], onPick(id) })
YB.radial = (() => {
const R0 = 34, R1 = 112, R2 = 186;      // ring radii: dead zone, categories, children
const CHILD_SPAN = 26;                   // degrees per child on the outer ring
const NS = 'http://www.w3.org/2000/svg';
let menu = null;

const polar = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)]; // 0° = up, clockwise
function sector(r0, r1, a0, a1) {
  const [x0, y0] = polar(r1, a0), [x1, y1] = polar(r1, a1), [x2, y2] = polar(r0, a1), [x3, y3] = polar(r0, a0);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${big} 0 ${x3} ${y3} Z`;
}
const angleOf = (dx, dy) => (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
const near = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

function open({ x, y, items, onPick, gesture = true }) {
  close();
  const step = 360 / items.length;
  const cats = items.map((it, i) => ({ ...it, a: i * step }));
  const pad = R2 + 12; // keep the whole menu on screen
  x = Math.min(Math.max(x, pad), innerWidth - pad);
  y = Math.min(Math.max(y, pad), innerHeight - pad);

  const el = document.createElement('div');
  el.className = 'radial';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${-R2 - 4} ${-R2 - 4} ${2 * R2 + 8} ${2 * R2 + 8}`);
  el.append(svg);
  document.body.append(el);

  const node = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.append(n); return n; };
  const label = (g, it, r, a) => {
    const [lx, ly] = polar(r, a);
    node('text', { x: lx, y: ly - 4, class: 'icon' }, g).textContent = it.icon;
    node('text', { x: lx, y: ly + 15, class: 'text' }, g).textContent = (it.checked ? '✓ ' : '') + it.label;
  };
  cats.forEach(c => {
    c.g = node('g', { class: 'slice' + (c.children ? ' has-kids' : '') });
    node('path', { d: sector(R0, R1, c.a - step / 2 + 1, c.a + step / 2 - 1) }, c.g);
    label(c.g, c, (R0 + R1) / 2 + 2, c.a);
  });
  const hub = node('circle', { r: R0 - 4, class: 'hub' });
  const outer = node('g', { class: 'outer' });
  node('text', { x: 0, y: 5, class: 'hub-text' }).textContent = '✕';

  menu = { el, x, y, cats, onPick, cat: null, kid: null, kids: [], moved: false, gesture };

  function showKids(c) {
    outer.replaceChildren();
    menu.kids = [];
    if (!c?.children) return;
    const n = c.children.length, a0 = c.a - (n - 1) * CHILD_SPAN / 2;
    menu.kids = c.children.map((k, i) => {
      const a = a0 + i * CHILD_SPAN, g = node('g', { class: 'slice kid' }, outer);
      node('path', { d: sector(R1 + 4, R2, a - CHILD_SPAN / 2 + 1, a + CHILD_SPAN / 2 - 1) }, g);
      label(g, k, (R1 + R2) / 2 + 4, a);
      return { ...k, a, g };
    });
  }
  // highlight what the pointer points at: categories in the inner ring, children beyond it
  menu.track = (px, py) => {
    const dx = px - x, dy = py - y, d = Math.hypot(dx, dy), a = angleOf(dx, dy);
    if (d > 8) menu.moved = true;
    let cat = menu.cat, kid = null;
    if (d < R0) cat = null;
    else if (d < R1 || !menu.kids.length) cat = cats.reduce((b, c) => near(a, c.a) < near(a, b.a) ? c : b);
    else kid = menu.kids.find(k => near(a, k.a) <= CHILD_SPAN / 2) || null;
    if (cat !== menu.cat) { menu.cat = cat; showKids(cat); }
    menu.kid = kid;
    cats.forEach(c => c.g.classList.toggle('on', c === menu.cat));
    menu.kids.forEach(k => k.g.classList.toggle('on', k === kid));
    hub.classList.toggle('on', !cat);
  };
  menu.pick = () => {
    const hit = menu.kid || (menu.cat && !menu.cat.children ? menu.cat : null);
    if (!hit) return false;
    close();
    onPick(hit.id);
    return true;
  };
  requestAnimationFrame(() => el.classList.add('shown'));
}

function close() { menu?.el.remove(); menu = null; }

// pointer handling: moves highlight; releasing the right button after a flick picks; clicks pick or close
addEventListener('pointermove', e => menu?.track(e.clientX, e.clientY), true);
addEventListener('pointerup', e => {
  if (!menu) return;
  if (e.button === 2 && menu.gesture) { menu.gesture = false; if (menu.moved) menu.pick(); return; }
  if (e.button !== 0) return;
  if (Math.hypot(e.clientX - menu.x, e.clientY - menu.y) > R2 + 10) return close(); // clicked outside
  menu.track(e.clientX, e.clientY);
  if (!menu.pick() && !menu.cat) close();
}, true);
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

return { open, close, isOpen: () => !!menu };
})();
