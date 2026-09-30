// 布布 · Designed by 黄小B · Powered by noSugarK
// Character data only: how he looks, how he behaves. Rendering lives in core/render.js.
YB.character({
  id: 'bubu',
  name: '布布',
  look: {
    body: '#c9895a',
    ear: '#b87644',
    earIn: '#6f3f25',
    blush: '#f7aa3c',
    tongue: false,        // plain ω mouth
    accessories: [],
    shoulder: [62, 157],
    restArm: -32,         // curled paws resting in front of the belly
    armCap: false,
    sleepArm: [14, 58],
  },
  fx: ['★', '✦'],
  fxColor: '#f5b400',
  giver: true,            // brings the rose
  personality: { sleepiness: .4, playfulness: .9, social: .8 },
  lines: { callPartner: '一二！', sneaky: '嘿嘿～' },
});
