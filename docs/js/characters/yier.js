// 一二 · Designed by 黄小B · Powered by noSugarK
// Character data only: how she looks, how she behaves. Rendering lives in core/render.js.
YB.character({
  id: 'yier',
  name: '一二',
  look: {
    body: '#fffdf8',
    ear: '#5b3524',
    earIn: null,          // solid dark ears
    blush: '#f9a9a0',
    tongue: true,         // ω mouth with a pink tongue
    accessories: ['collar', 'bow'],
    shoulder: [55, 159],  // on the body edge, so the arms stick out sideways
    restArm: 40,          // degrees outward
    armCap: true,         // outline where the arm leaves the body
    sleepArm: [21, 56],   // paw offset when lying down
  },
  fx: ['♥', '♡'],
  fxColor: '#ff6b8a',
  // 0..1, used by behaviors/brain.js to weigh what she does on her own
  personality: { sleepiness: .6, playfulness: .7, social: .9 },
  lines: { callPartner: '布布！', scold: '你又偷吃！' },
});
