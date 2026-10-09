// Renderer: paints a model (models/*.js) with a character's palette (characters/*.js).
// Faces, expressions, neckwear and props are generated from the model's anchors, so any model that
// provides the same fields works. The class names here are what css/pet.css animates.
YB.render = (() => {
const mirror = w => `translate(${w} 0) scale(-1 1)`;

// "啊——" waiting for food (design/reference/bubu-4.jpg): a big oval, tongue in the lower half, two small front teeth
// fills the face from just under the eyes down to the chin (bottom)
function hugeMouth(cx, cy, r, bottom) {
  const ry = Math.min(r * 2.9, bottom - cy - 1), rx = ry * 1.3;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#c4483e" stroke="none"/>
      <path fill="#e8735f" stroke="none" d="M${cx - rx * .8} ${cy + ry * .35} Q${cx} ${cy - ry * .3} ${cx + rx * .8} ${cy + ry * .35} Q${cx + rx * .5} ${cy + ry * .95} ${cx} ${cy + ry} Q${cx - rx * .5} ${cy + ry * .95} ${cx - rx * .8} ${cy + ry * .35} Z"/>
      <rect x="${cx - 8}" y="${cy - ry - 1}" width="7.5" height="8" rx="2" fill="#fff" stroke-width="1.6"/>
      <rect x="${cx + .5}" y="${cy - ry - 1}" width="7.5" height="8" rx="2" fill="#fff" stroke-width="1.6"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none"/>`;
}

// --- face features, around the model's eye / mouth anchors ---
function face(m, p) {
  const { eyes, eyeR: r, mouth: [mx, my], blush, blushR } = m.face, [L, R] = eyes;
  const each = (fn, side) => eyes.map(([x, y], i) => fn(x, y, i ? -side : side)).join('');
  return `
    ${blush.map(([x, y]) => `<circle class="blush" cx="${x}" cy="${y}" r="${blushR}" fill="${p.blush}" stroke="none"/>`).join('')}
    <g class="eyes-open" fill="${p.outline}" stroke="none">${eyes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <g class="eyes-happy" fill="none">${each((x, y, s) => `<path d="M${x - s * r} ${y + r * .8} L${x + s * r * .7} ${y} L${x - s * r} ${y - r * .8}"/>`, 1)}</g>
    <g class="eyes-closed" fill="none">${eyes.map(([x, y]) => `<path d="M${x - r} ${y} Q${x} ${y + r * .9} ${x + r} ${y}"/>`).join('')}</g>
    <g class="brows" fill="none">${each((x, y, s) => `<path d="M${x - s * r * 1.2} ${y - r * 1.7} L${x + s * r} ${y - r}"/>`, 1)}</g>
    <g class="tears" fill="#8fd3ff" stroke="none">${eyes.map(([x, y]) => `<path d="M${x} ${y + r + 2} q-5 9 0 13 q5 -4 0 -13z"/>`).join('')}</g>
    <g class="prop p-glasses" fill="#2b2b33">
      ${eyes.map(([x, y]) => `<rect x="${x - r * 2}" y="${y - r * 1.25}" width="${r * 4}" height="${r * 2.5}" rx="${r}"/>`).join('')}
      <path fill="none" d="M${L[0] + r * 2} ${L[1] - r * .6} Q${(L[0] + R[0]) / 2} ${L[1] - r * 1.4} ${R[0] - r * 2} ${R[1] - r * .6}"/>
      <path fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" d="${eyes.map(([x, y]) => `M${x - r * 1.3} ${y - r * .5} L${x - r * .5} ${y - r * .5}`).join(' ')}"/>
    </g>
    <path class="m-normal" fill="none" stroke-width="2.4" d="M${mx - 10} ${my - 1.5} C${mx - 10} ${my + 1.5} ${mx - 8} ${my + 2.5} ${mx - 5.5} ${my + 1.5}
      C${mx - 3.5} ${my + .5} ${mx - 2} ${my - 1.5} ${mx} ${my - 1.5} C${mx + 2} ${my - 1.5} ${mx + 3.5} ${my + .5} ${mx + 5.5} ${my + 1.5}
      C${mx + 8} ${my + 2.5} ${mx + 10} ${my + 1.5} ${mx + 10} ${my - 1.5}"/>
    <g transform="translate(${mx - 100} ${my - 113})">
      <path class="m-smile" fill="#f28b82" stroke-width="2.5" d="M90 109 Q95 113 100 109 Q105 113 110 109 Q109 126 100 126 Q91 126 90 109 Z"/>
      <ellipse class="m-open" cx="100" cy="117" rx="5" ry="6.5" fill="#e0685e" stroke-width="2.5"/>
      <path class="m-frown" fill="none" stroke-width="2.5" d="M94 118 Q100 112 106 118"/>
    </g>
    <g class="m-huge">${hugeMouth(mx, my + r * 3.1, r, m.neck.y)}</g>`;
}

// --- things worn at the neck, along the bottom of the head ---
const neckwear = {
  // a band tucked under the chin with a little two-lobed bow in front
  collar: (m, p) => {
    const { y, halfWidth: w } = m.neck, c = m.viewBox[0] / 2;
    return `<path fill="${p.collar}" stroke-width="2.4" d="M${c - w} ${y - 3} Q${c} ${y + 4} ${c + w} ${y - 3} L${c + w - 2} ${y + 3} Q${c} ${y + 19} ${c - w + 2} ${y + 3} Z"/>`;
  },
  bow: (m, p) => {
    const { y } = m.neck, c = m.viewBox[0] / 2;
    const lobe = `M${c - 3} ${y + 9} C${c - 9} ${y + 9} ${c - 18} ${y + 13} ${c - 18} ${y + 19} C${c - 18} ${y + 24.5} ${c - 11} ${y + 25.5} ${c - 7.5} ${y + 22} C${c - 5} ${y + 19.5} ${c - 3.5} ${y + 15} ${c - 2} ${y + 11} Z`;
    return `<g fill="${p.collar}" stroke-width="2.4"><path d="${lobe}"/><path d="${lobe}" transform="${mirror(m.viewBox[0])}"/></g>`;
  },
};
const scarf = m => {
  const { y, halfWidth: w } = m.neck, c = m.viewBox[0] / 2;
  return `<g class="prop p-scarf" fill="#e0473f">
    <path d="M${c - w - 4} ${y - 18} Q${c} ${y + 10} ${c + w + 4} ${y - 18} L${c + w + 6} ${y - 2} Q${c} ${y + 26} ${c - w - 6} ${y - 2} Z"/>
    <path d="M${c + 16} ${y + 6} L${c + 22} ${y + 46} L${c + 40} ${y + 42} L${c + 32} ${y + 2} Z"/>
    <path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" d="M${c - w + 2} ${y - 8} Q${c} ${y + 15} ${c + w - 2} ${y - 8} M${c + 24} ${y + 38} L${c + 38} ${y + 35}"/></g>`;
};

// --- props held in front: positioned from the model's hold point (paws) and mouth ---
function props(m, p) {
  const [hx, hy] = m.hold, [mx, my] = m.face.mouth;
  return `
   <g class="prop p-noodle">
      <path fill="none" stroke="#f3c969" stroke-width="3" d="M${hx - 2} ${hy - 14} C${hx - 6} ${hy - 32} ${mx + 4} ${my + 22} ${mx} ${my + 4}"/>
      <g class="chop" stroke="#9a6334" stroke-width="3" style="transform-origin:${hx + 30}px ${hy + 3}px"><path d="M${hx + 28} ${hy + 4} L${mx + 6} ${my + 12}"/><path d="M${hx + 34} ${hy + 2} L${mx + 12} ${my + 12}"/></g>
      <path fill="#fffaf2" d="M${hx - 36} ${hy - 16} L${hx + 36} ${hy - 16} Q${hx + 32} ${hy + 16} ${hx} ${hy + 16} Q${hx - 32} ${hy + 16} ${hx - 36} ${hy - 16} Z"/>
      <path fill="none" stroke="#e0473f" stroke-width="3" d="M${hx - 31} ${hy - 6} Q${hx} ${hy + 3} ${hx + 31} ${hy - 6}"/>
   </g>
   <g class="prop p-boba">
      <path stroke="#e0685e" stroke-width="4" d="M${hx + 4} ${hy - 32} L${mx + 9} ${my + 6}"/>
      <path fill="#f1dcc0" d="M${hx - 16} ${hy - 30} L${hx + 16} ${hy - 30} L${hx + 12} ${hy + 12} L${hx - 12} ${hy + 12} Z"/>
      <g fill="${p.outline}" stroke="none">${[[-7, 6], [0, 7], [7, 5], [-3, 0], [4, -1]].map(([dx, dy]) => `<circle cx="${hx + dx}" cy="${hy + dy}" r="3"/>`).join('')}</g>
      <rect x="${hx - 19}" y="${hy - 36}" width="38" height="7" rx="3" fill="#fff"/>
   </g>
   <g class="prop p-rose">
      <path fill="none" stroke="#4f9a4a" stroke-width="3.5" d="M${hx + 10} ${hy + 10} Q${hx + 15} ${hy - 16} ${hx + 20} ${hy - 42}"/>
      <path fill="#6cc167" stroke-width="2.5" d="M${hx + 15} ${hy - 12} Q${hx + 27} ${hy - 22} ${hx + 32} ${hy - 15} Q${hx + 24} ${hy - 6} ${hx + 15} ${hy - 12} Z"/>
      <circle cx="${hx + 21}" cy="${hy - 51}" r="12" fill="#e0473f"/>
      <path fill="none" stroke-width="2" d="M${hx + 15} ${hy - 53} Q${hx + 21} ${hy - 60} ${hx + 27} ${hy - 53} Q${hx + 21} ${hy - 45} ${hx + 15} ${hy - 53}"/>
   </g>`;
}

// the full bear: body → neckwear → head (clipped face) → arms → props
function bear(ch) {
  const m = YB.models[ch.model], p = ch.palette, [W, H] = m.viewBox, id = ch.id;
  const ears = m.ears.centers.map(([x, y]) => {
    const dx = W / 2 - x, dy = H * .35 - y, d = Math.hypot(dx, dy), o = m.ears.inner.offset;
    return `<circle cx="${x}" cy="${y}" r="${m.ears.r}" fill="${p.ear}"/>` +
      (p.earInner ? `<circle cx="${x + dx / d * o}" cy="${y + dy / d * o}" r="${m.ears.r * m.ears.inner.ratio}" fill="${p.earInner}" stroke="none"/>` : '');
  }).join('');
  const arm = side => `<g transform="translate(${m.arm.pivot})"><g class="arm arm-${side}">
      <path fill="${p.body}" stroke="none" d="${m.arm.fill}"/><path fill="none" d="${m.arm.outline}"/></g></g>`;
  // the collar is tucked under the chin (drawn before the head), the bow hangs over it
  const wear = kinds => ch.accessories.filter(a => kinds.includes(a)).map(a => neckwear[a](m, p)).join('');
  return `<svg viewBox="0 0 ${W} ${H}" stroke="${p.outline}" stroke-width="${m.stroke}" stroke-linejoin="round" stroke-linecap="round">
   <g class="bodyparts">
    ${m.feet.paths.map((d, i) => `<g class="leg leg-${i ? 'r' : 'l'}"><path fill="${p.feet}" d="${d}"/></g>`).join('')}
    <path fill="${p.body}" stroke="none" d="${m.body.fill}"/>
    <path fill="none" d="${m.body.outline} ${m.crotch}"/>
    ${wear(['collar'])}
    ${scarf(m)}
   </g>
   <g class="headpos"><g class="head">
      ${ears}
      <clipPath id="clip-${id}"><path d="${m.head}"/></clipPath>
      <path fill="${p.body}" d="${m.head}"/>
      <g clip-path="url(#clip-${id})"><g class="face">${face(m, p)}</g></g>
      <path fill="none" d="${m.head}"/>
   </g></g>
   <g class="bodyparts">${wear(['bow'])}</g>
   ${arm('l')}
   <g transform="${mirror(W)}">${arm('r')}</g>
   ${props(m, p)}
  </svg>`;
}

return { bear };
})();
