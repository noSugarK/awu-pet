// 一二 · Designed by 黄小B · Powered by noSugarK
// Character = which model + how it's painted + how she behaves. Colours sampled from design/reference/yier-1.jpg.
YB.character({
  id: 'yier',
  name: '一二',
  model: 'chibi-bear',
  palette: {
    body: '#fdfdfb',
    outline: '#3f0c03',   // also eyes and mouth
    ear: '#440d02',       // solid dark ears
    earInner: null,
    blush: '#efb7aa',
    feet: '#3f0c03',      // dark little feet
    collar: '#420d05',
  },
  accessories: ['collar', 'bow'],
  fx: ['♥', '♡'],
  fxColor: '#ff6b8a',
  // 0..1, used by behaviors/brain.js to weigh what she does on her own
  personality: { sleepiness: .6, playfulness: .7, social: .9 },
  lines: { callPartner: '布布！', scold: '你又偷吃！' },
});
