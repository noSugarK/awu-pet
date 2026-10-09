// Model: geometry only — no colours, no personality. Characters pick a model and paint it.
// Traced from the front views design/reference/yier-1.jpg and bubu-1.jpg (both bears share this shape):
// image px → model units: x = (px - 160) / 4, y = (py - 30) / 4.
//
// A model provides everything core/render.js and the animations need:
//   viewBox, head (closed path), ears, body (fill + visible outline), crotch, feet (+ step pivots),
//   arm (drawn pointing straight down from its shoulder pivot; the right arm is the mirror image),
//   face anchors (eyes, mouth, blush), neck (where collars / scarves sit), hold (where paws meet),
//   ground (feet bottom). Only the front view is used for now; side / back can be added under `views`.
YB.model({
  id: 'chibi-bear',
  name: 'Q版小熊',
  viewBox: [200, 256],
  stroke: 2.8,

  // wide dome head with a small step above the cheeks
  head: 'M100 3 C80 3 60 7 47 14 C33 22 22 34 15 48 C9 62 6 80 6 98 L6.3 112.5 L4.5 116.5 L4.6 127 ' +
        'C5 136 8 144 14 149 C22 156 34 160 50 161 C66 162.5 84 162.5 100 162.5 C116 162.5 134 162.5 150 161 ' +
        'C166 160 178 156 186 149 C192 144 195 136 195.4 127 L195.5 116.5 L193.7 112.5 L194 98 ' +
        'C194 80 191 62 185 48 C178 34 167 22 153 14 C140 7 120 3 100 3 Z',
  // ears sit behind the head; `inner` = offset toward the head + radius ratio of the inner patch
  ears: { centers: [[31, 21], [169, 21]], r: 20, inner: { offset: 4, ratio: .58 } },

  // torso under the head; the arms cover its upper sides, so only the part below them is outlined
  body: {
    fill: 'M44 158 C38 176 36 196 39 207 C40 217 44 228 50 234 C51 238 53 241 54 246 L146 246 ' +
          'C147 241 149 238 150 234 C156 228 160 217 161 207 C164 196 162 176 156 158 Z',
    outline: 'M39.5 205 C40.5 216 44 227 50 234 L53 240 M160.5 205 C159.5 216 156 227 150 234 L147 240',
  },
  crotch: 'M77.5 236 L122.5 236 M78 236 L76.5 240.5 M122 236 L123.5 240.5',
  feet: {
    paths: ['M55 240 L76 240 C78.5 240 79 244 78.5 248 C78 253 74 255 66 255 C58 255 53.5 253 53 249 C52.5 245 53 240 55 240 Z',
            'M145 240 L124 240 C121.5 240 121 244 121.5 248 C122 253 126 255 134 255 C142 255 146.5 253 147 249 C147.5 245 147 240 145 240 Z'],
    pivots: [[65, 247], [135, 247]],
  },

  // flat rounded arm hanging from the shoulder; rest = degrees outward (CSS rotates it for every pose)
  arm: {
    pivot: [44, 164],
    rest: 15,
    fill: 'M-1 -3 C-5 5 -8 17 -8 29 C-8.5 37 -6 43 0 45.5 C4 46 7 44 7 40 L7 6 C6 1 3 -3 -1 -3 Z',
    outline: 'M0 0 C-5 6 -8 17 -8 29 C-8.5 37 -6 43 0 45.5 C4 46 7 44 7 40 L7.2 8.5',
    // lying down: shift + rotation that puts the paws under the chin
    sleep: { shift: [10, 70], rotate: -78 },
  },

  face: { eyes: [[61, 106], [139, 106]], eyeR: 9, mouth: [99, 109], blush: [[34, 133], [166, 133]], blushR: 18 },
  neck: { y: 162.5, halfWidth: 56 },
  hold: [100, 194],
  ground: 254,
});
