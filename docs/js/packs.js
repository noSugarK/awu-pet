// Who is on screen, picked one by one in the 角色 menu (desktop, see platform/desktop.js): up to 4 characters,
// mixing built-in ones and members of Codex / Petdex pet packages. Saved as a list of
//   { builtin: '<character id>' }  or  { key, index, name, sheet, credit }  (a package member)
// Package members become characters drawn from their sprite sheet's frames; the shell loads the sheets.
(() => {
  let roster;
  try { roster = JSON.parse(localStorage.getItem('roster') || 'null'); } catch {}
  roster = (roster || []).filter(r => r.builtin ? YB.characters[r.builtin] : r.sheet);
  if (!roster.length) return;
  const ids = roster.map((r, i) => r.builtin || 'pet-' + i), names = ids.map((id, i) => roster[i].name || YB.characters[id]?.name);
  roster.forEach((r, i) => {
    if (r.builtin) return;
    const partner = names[(i + 1) % names.length];
    YB.character({
      id: ids[i], name: r.name, sprite: { sheet: r.sheet },
      accessories: [], fx: ['♥', '♡'], fxColor: '#ff6b8a',
      personality: { sleepiness: .5, playfulness: .75, social: .8 },
      lines: roster.length > 1 ? { callPartner: partner + '！' } : {},
    });
  });
  // credits: each package says its own (install-pets.mjs writes them); built-in ones come from their cast
  const credits = roster.map(r => r.builtin ? Object.values(YB.casts).find(c => c.members.includes(r.builtin))?.credit : r.credit || '社区宠物包 · 形象版权归原作者所有');
  YB.cast({ id: 'roster', name: names.length > 2 ? '大家' : names.join('和'), icon: '🐾', members: ids, credit: [...new Set(credits.filter(Boolean))].join('\n') });
})();
