// Who is on screen, picked one by one in the 角色 menu (desktop, see platform/desktop.js): up to 4 characters,
// mixing built-in ones and members of Codex / Petdex pet packages. Saved as a list of
//   { builtin: '<character id>' }  or  { key, index, name, sheet, credit, awu }  (a package member; awu: see install-pets.mjs)
// Package members become characters drawn from their sprite sheet's frames; the shell loads the sheets.
(() => {
  let roster;
  try { roster = JSON.parse(localStorage.getItem('roster') || 'null'); } catch {}
  roster = (roster || []).filter(r => r.builtin ? YB.characters[r.builtin] : r.sheet);
  if (!roster.length) return;
  const ids = roster.map((r, i) => r.builtin || 'pet-' + i), names = ids.map((id, i) => roster[i].name || YB.characters[id]?.name);
  // what a Codex sheet's rows 3–8 mean, for packages that don't name them (install-pets.mjs writes pet.json "awu")
  const GENERIC = [[3, '👋', '挥手'], [4, '🙌', '跳跳'], [5, '😢', '难过'], [6, '⏳', '等待'], [7, '💼', '忙碌'], [8, '👀', '查看']];
  roster.forEach((r, i) => {
    if (r.builtin) return;
    const partner = names[(i + 1) % names.length], awu = r.awu || {};
    YB.character({
      id: ids[i], name: r.name,
      sprite: { sheet: r.sheet, actions: awu.actions || GENERIC, states: awu.states || {}, flip: !!awu.flipRunning },
      accessories: [], fx: ['♥', '♡'], fxColor: '#ff6b8a',
      personality: { sleepiness: .5, playfulness: .75, social: .8 },
      lines: roster.length > 1 ? { callPartner: partner + '！' } : {},
    });
  });
  // credits: each package says its own (install-pets.mjs writes them); built-in ones come from their cast
  const credits = roster.map(r => r.builtin ? Object.values(YB.casts).find(c => c.members.includes(r.builtin))?.credit : r.credit || '社区宠物包 · 形象版权归原作者所有');
  YB.cast({ id: 'roster', name: names.length > 2 ? '大家' : names.join('和'), icon: '🐾', members: ids, credit: [...new Set(credits.filter(Boolean))].join('\n') });
})();
