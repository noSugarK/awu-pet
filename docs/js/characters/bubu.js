// 布布 · Designed by 黄小B · Powered by noSugarK
// Character = which model + how it's painted + how he behaves. Colours sampled from design/reference/bubu-1.jpg.
YB.character({
  id: 'bubu',
  name: '布布',
  model: 'chibi-bear',
  palette: {
    body: '#e2b08e',
    outline: '#4a261a',   // also eyes and mouth
    ear: '#e2b08e',
    earInner: '#4a261a',
    blush: '#fcce93',
    feet: '#e2b08e',      // feet in body colour, outlined
  },
  accessories: [],
  fx: ['★', '✦'],
  fxColor: '#f5b400',
  giver: true,            // brings the rose
  personality: { sleepiness: .4, playfulness: .9, social: .8 },
  lines: { callPartner: '一二！', sneaky: '嘿嘿～' },
});
