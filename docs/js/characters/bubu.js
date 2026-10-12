// Built-in sprite pet, drawn from the bundled 布布 pet package.
YB.character({
  id: 'bubu', name: '布布',
  sprite: { sheet: 'img/bubu-spritesheet.webp', actions: [[3, '👋', '挥手'], [4, '🙌', '欢呼'], [5, '😭', '哭哭'], [6, '☺️', '扭扭'], [7, '🚶', '踏步'], [8, '🥺', '撒娇']], states: { shy: 8, dance: 7 } },
  fx: ['☀', '✨'], fxColor: '#f5b400',
  personality: { sleepiness: .4, playfulness: .9, social: .8 },
  lines: { callPartner: '一二！', sneaky: '嘿嘿～' },
});
