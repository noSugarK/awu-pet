// Built-in sprite pet, drawn from the bundled 一二 pet package.
YB.character({
  id: 'yier', name: '一二',
  sprite: { sheet: 'img/yier-spritesheet.webp', actions: [[3, '👋', '挥手'], [4, '🙌', '欢呼'], [5, '😭', '哭哭'], [6, '☺️', '扭扭'], [7, '💃', '跳舞'], [8, '🥰', '卖萌']], states: { shy: 6, dance: 7 } },
  fx: ['♥', '♡'], fxColor: '#ff6b8a',
  personality: { sleepiness: .6, playfulness: .7, social: .9 },
  lines: { callPartner: '布布！', scold: '你又偷吃？' },
});
