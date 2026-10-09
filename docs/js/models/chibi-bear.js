// Model: geometry only — no colours, no personality. Characters pick a model and paint it.
// Traced from the front views design/reference/yier-1.jpg and bubu-1.jpg (both bears share this shape):
// image px → model units: x = (px - 160) / 4, y = (py - 30) / 4.
//
// A model provides everything core/render.js and the animations need:
//   viewBox, head (closed path), ears, body (fill + visible outline), crotch, legs (fill, outline, sole, step pivots),
//   arm (drawn pointing straight down from its shoulder pivot; the right arm is the mirror image),
//   face anchors (eyes, mouth, blush), neck (where collars / scarves sit), hold (where paws meet),
//   ground (feet bottom). Only the front view is used for now; side / back can be added under `views`.
YB.model({
  id: 'chibi-bear',
  name: 'Q版小熊',
  viewBox: [200, 256],
  stroke: 2.8,

  // wide dome head with a small step above the cheeks
  head: 'M100 3 C80 3 60 7 47 14 C33 22 22 34 15 48 C9 62 6 80 6 98 C6 105 6.5 110 6.6 112.5 C5.1 114.8 4.5 118 4.5 122 ' +
        'C4.5 134 8 144 14 149 C22 156 34 160 50 161 C66 162.5 84 162.5 100 162.5 C116 162.5 134 162.5 150 161 ' +
        'C166 160 178 156 186 149 C192 144 195.5 134 195.5 122 C195.5 118 194.9 114.8 193.4 112.5 C193.5 110 194 105 194 98 ' +
        'C194 80 191 62 185 48 C178 34 167 22 153 14 C140 7 120 3 100 3 Z',
  // ears sit behind the head; `inner` = offset toward the head + radius ratio of the inner patch
  ears: { centers: [[31, 21], [169, 21]], r: 20, inner: { offset: 4, ratio: .58 } },

  // torso: rounded shoulders reach up behind the head, so a tilted head never uncovers a gap, and the
  // sides are outlined all the way down — the arms hide that line until they are raised.
  // Its bottom edge is hidden behind the legs, which continue the silhouette.
  body: {
    fill: 'M100 118 C70 118 54 124 49 136 C46 143 44 150 44 158 C38 176 36 196 39 207 C40 217 44 228 49.7 232 ' +
          'C50.7 233.6 51.3 235.8 51.5 238 L79.5 237.3 L120.5 237.3 L148.5 238 C148.7 235.8 149.3 233.6 150.3 232 ' +
          'C156 228 160 217 161 207 C164 196 162 176 156 158 C156 150 154 143 151 136 C146 124 130 118 100 118 Z',
    outline: 'M49 136 C46 143 44 150 44 158 C38 176 36 196 39 207 C40 217 44 228 49.7 232 C50.7 233.6 51.3 235.8 51.5 238 M151 136 C154 143 156 150 156 158 C162 176 164 196 161 207 C160 217 156 228 150.3 232 C149.3 233.6 148.7 235.8 148.5 238',
  },
  // the gap between the legs: straight, overhanging the inner leg lines a little
  crotch: 'M77.5 237.3 L122.5 237.3',
  // each short leg continues the body side, rounds off at the bottom and rises back to the crotch;
  // `sole` is the lower part painted in the palette's feet colour. Pivots are where a step lifts from.
  legs: {
    fill: ['M51.5 238 C51.8 239.8 52.2 241 52.5 242.5 C51.5 249 56 253.8 65.6 253.8 C75 253.8 79.5 250 78.8 244.5 C78.5 242 78.3 240 79.5 237.3 L80 226 L48 226 Z',
           'M148.5 238 C148.2 239.8 147.8 241 147.5 242.5 C148.5 249 144 253.8 134.4 253.8 C125 253.8 120.5 250 121.2 244.5 C121.5 242 121.7 240 120.5 237.3 L120 226 L152 226 Z'],
    outline: ['M51.5 238 C51.8 239.8 52.2 241 52.5 242.5 C51.5 249 56 253.8 65.6 253.8 C75 253.8 79.5 250 78.8 244.5 C78.5 242 78.3 240 79.5 237.3',
              'M148.5 238 C148.2 239.8 147.8 241 147.5 242.5 C148.5 249 144 253.8 134.4 253.8 C125 253.8 120.5 250 121.2 244.5 C121.5 242 121.7 240 120.5 237.3'],
    sole: ['M52.4 242.6 Q65.6 239.8 78.6 241.8 C78.6 242.8 78.7 243.6 78.8 244.5 C79.5 250 75 253.8 65.6 253.8 C56 253.8 51.5 249 52.4 242.6 Z',
           'M147.6 242.6 Q134.4 239.8 121.4 241.8 C121.4 242.8 121.3 243.6 121.2 244.5 C120.5 250 125 253.8 134.4 253.8 C144 253.8 148.5 249 147.6 242.6 Z'],
    pivots: [[66, 247], [134, 247]],
  },

  // flat rounded arm hanging from the shoulder; rest = degrees outward (CSS rotates it for every pose)
  arm: {
    pivot: [44, 162],  // the top of the arm touches the bottom of the head outline
    rest: 15,
    fill: 'M0 0 C-5 6 -8 17 -8 29 C-8.5 37 -6 43 0 45 C4 45.5 7 43.5 7 40 C7.6 28 7.6 16 7 0 Z',
    outline: 'M0 0 C-5 6 -8 17 -8 29 C-8.5 37 -6 43 0 45 C4 45.5 7 43.5 7 40 C7.6 29 7.6 18 6.6 8',
    // lying down: shift + rotation that puts the paws under the chin
    sleep: { shift: [10, 70], rotate: -78 },
  },

  face: { eyes: [[61, 106], [139, 106]], eyeR: 9, mouth: [99, 109], blush: [[34, 133], [166, 133]], blushR: 18 },
  neck: { y: 162.5, halfWidth: 56 },
  hold: [100, 194],
  ground: 254,
});
