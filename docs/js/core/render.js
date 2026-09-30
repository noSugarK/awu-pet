// Draws a bear as SVG from its character data (characters/*.js).
// Traced from design/reference/* : mochi head wider at the cheeks, round pear body, short legs,
// one rounded arm per side that grows out of the shoulder (only its outer edge + tip are outlined).
YB.INK = '#3a2317';

YB.bearSVG = (c, id) => {
  const INK = YB.INK, has = a => c.accessories.includes(a);
  const HEAD = 'M100 22 C150 22 181 50 184 98 C186 132 160 152 100 152 C40 152 14 132 16 98 C19 50 50 22 100 22 Z';
  const eye = x => `<ellipse cx="${x}" cy="103" rx="6" ry="7" fill="${INK}" stroke="none"/><circle cx="${x - 2}" cy="100.5" r="1.7" fill="#fff" stroke="none"/>`;
  const ear = (x, ix) => `<circle cx="${x}" cy="44" r="21" fill="${c.ear}"/>` + (c.earIn ? `<circle cx="${ix}" cy="41" r="11" fill="${c.earIn}" stroke="none"/>` : '');
  const mouth = c.tongue
    ? `<path class="m-normal" fill="#f28b82" stroke-width="2.5" d="M93 110 Q96.5 113 100 110 Q103.5 113 107 110 Q106 121 100 121 Q94 121 93 110 Z"/>`
    : `<path class="m-normal" fill="none" stroke-width="2.5" d="M93 111 Q96.5 116 100 111 Q103.5 116 107 111"/>`;
  // arm in shoulder-local coords, pointing down; CSS rotates it (positive = outward, the right arm is a mirror)
  const arm = side => `<g transform="translate(${c.shoulder})"><g class="arm arm-${side}">
      <path fill="${c.body}" stroke="none" d="M-10 0 A10 10 0 0 1 10 0 L10 16 A10 10 0 0 1 -10 16 Z"/>
      <path fill="none" d="M-10 0 L-10 16 A10 10 0 0 0 10 16 L10 8"/><path class="cap" fill="none" d="M-5 -8.66 A10 10 0 0 0 -10 0"/><path class="edge" fill="none" d="M10 8 L10 0"/></g></g>`;
  return `<svg viewBox="0 0 200 230" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   <g class="bodyparts">
    <g class="leg leg-l"><path fill="${c.body}" d="M50 204 C48 214 56 223 74 223 C90 223 99 220 99 210 L99 192 L56 192 Z"/></g>
    <g class="leg leg-r"><path fill="${c.body}" d="M150 204 C152 214 144 223 126 223 C110 223 101 220 101 210 L101 192 L144 192 Z"/></g>
    <path fill="${c.body}" stroke="none" d="M66 128 C46 150 40 186 50 204 C56 212 144 212 150 204 C160 186 154 150 134 128 Z"/>
    <path fill="none" d="M66 128 C46 150 40 186 50 204 M134 128 C154 150 160 186 150 204"/>
    ${has('collar') ? `<path fill="#6b3a26" stroke-width="2.5" d="M58 142 Q100 160 142 142 L142 147 Q100 164 58 147 Z"/>` : ''}
    <g class="prop p-scarf" fill="#e0473f">
      <path d="M52 136 Q100 162 148 136 L150 151 Q100 178 50 151 Z"/>
      <path d="M116 158 L122 198 L140 194 L132 154 Z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" d="M58 146 Q100 167 142 146 M124 190 L138 187"/>
    </g>
   </g>
   <g class="headpos"><g class="head">
      ${ear(42, 38)}${ear(158, 162)}
      <clipPath id="clip-${id}"><path d="${HEAD}"/></clipPath>
      <path fill="${c.body}" d="${HEAD}"/>
      <g clip-path="url(#clip-${id})"><g class="face">
        <circle class="blush" cx="51" cy="123" r="13" fill="${c.blush}" stroke="none"/>
        <circle class="blush" cx="149" cy="123" r="13" fill="${c.blush}" stroke="none"/>
        <g class="eyes-open">${eye(66)}${eye(134)}</g>
        <g class="eyes-happy" fill="none"><path d="M59 108 L70 102 L59 96"/><path d="M141 108 L130 102 L141 96"/></g>
        <g class="eyes-closed" fill="none"><path d="M58 103 Q66 109 74 103"/><path d="M126 103 Q134 109 142 103"/></g>
        <g class="brows"><path d="M55 89 L75 95"/><path d="M145 89 L125 95"/></g>
        <g class="tears" fill="#8fd3ff" stroke="none"><path d="M64 112 q-5 9 0 13 q5 -4 0 -13z"/><path d="M136 112 q-5 9 0 13 q5 -4 0 -13z"/></g>
        <g class="prop p-glasses" fill="#2b2b33">
          <rect x="49" y="92" width="34" height="21" rx="9"/><rect x="117" y="92" width="34" height="21" rx="9"/>
          <path fill="none" d="M83 99 Q100 93 117 99"/>
          <path fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" d="M56 98 L63 98 M124 98 L131 98"/>
        </g>
        ${mouth}
        <path class="m-smile" fill="#f28b82" stroke-width="2.5" d="M90 109 Q95 113 100 109 Q105 113 110 109 Q109 126 100 126 Q91 126 90 109 Z"/>
        <ellipse class="m-open" cx="100" cy="117" rx="5" ry="6.5" fill="#e0685e" stroke-width="2.5"/>
        <path class="m-frown" fill="none" stroke-width="2.5" d="M94 118 Q100 112 106 118"/>
        <g class="m-huge"><path fill="#7a2a24" d="M58 113 Q100 104 142 113 Q148 162 100 164 Q52 162 58 113 Z"/>
          <path fill="#f28b82" stroke="none" d="M74 148 Q100 128 126 148 Q114 160 100 160 Q86 160 74 148 Z"/>
          <path fill="#fff" stroke-width="2" d="M68 113 L76 125 L84 110 Z M116 110 L124 125 L132 113 Z"/></g>
      </g></g>
      <path fill="none" d="${HEAD}"/>
   </g></g>
   ${has('bow') ? `<g class="bodyparts" fill="#6b3a26" stroke-width="2.5">
      <path d="M100 158 C93 148 80 146 80 158 C80 170 93 168 100 158 Z"/><path d="M100 158 C107 148 120 146 120 158 C120 170 107 168 100 158 Z"/>
      <path fill="none" stroke-width="1.6" d="M86 153 Q90 158 86 163 M114 153 Q110 158 114 163"/>
      <ellipse cx="100" cy="158" rx="5.5" ry="6"/></g>` : ''}
   ${arm('l')}
   <g transform="translate(200 0) scale(-1 1)">${arm('r')}</g>
   <g class="prop p-noodle">
      <path fill="none" stroke="#f3c969" stroke-width="3" d="M98 180 C94 162 104 146 100 124"/>
      <g class="chop" stroke="#9a6334" stroke-width="3"><path d="M128 198 L106 126"/><path d="M134 196 L112 126"/></g>
      <path fill="#fffaf2" d="M64 178 L136 178 Q132 210 100 210 Q68 210 64 178 Z"/>
      <path fill="none" stroke="#e0473f" stroke-width="3" d="M69 188 Q100 197 131 188"/>
   </g>
   <g class="prop p-boba">
      <path stroke="#e0685e" stroke-width="4" d="M104 162 L110 118"/>
      <path fill="#f1dcc0" d="M84 164 L116 164 L112 206 L88 206 Z"/>
      <g fill="${INK}" stroke="none"><circle cx="93" cy="200" r="3"/><circle cx="100" cy="201" r="3"/><circle cx="107" cy="199" r="3"/><circle cx="97" cy="194" r="3"/><circle cx="104" cy="193" r="3"/></g>
      <rect x="81" y="158" width="38" height="7" rx="3" fill="#fff"/>
   </g>
   <g class="prop p-rose">
      <path fill="none" stroke="#4f9a4a" stroke-width="3.5" d="M110 204 Q115 178 120 152"/>
      <path fill="#6cc167" stroke-width="2.5" d="M115 182 Q127 172 132 179 Q124 188 115 182 Z"/>
      <circle cx="121" cy="143" r="12" fill="#e0473f"/>
      <path fill="none" stroke-width="2" d="M115 141 Q121 134 127 141 Q121 149 115 141"/>
   </g>
  </svg>`;
};
