// The pet package picked in the 角色 menu (desktop, see platform/desktop.js): a Codex / Petdex package of 1–2
// members, saved as { key, name, members: [{ name, sheet }] }. Each member becomes a character drawn from its
// sprite sheet's frames instead of the SVG renderer; the shell loads the sheet images once the page is up.
(() => {
  let pack;
  try { pack = JSON.parse(localStorage.getItem('pack') || 'null'); } catch {}
  if (!pack?.members?.length) return;
  const ids = pack.members.map((_, i) => 'pet-' + 'ab'[i]);
  pack.members.forEach((mb, i) => {
    const partner = pack.members[1 - i];
    YB.character({
      id: ids[i], name: mb.name, sprite: { sheet: mb.sheet },
      accessories: [], fx: ['♥', '♡'], fxColor: '#ff6b8a',
      personality: { sleepiness: .5, playfulness: .75, social: .8 },
      lines: partner ? { callPartner: partner.name + '！' } : {},
    });
  });
  // credit: what the package says (install-pets.mjs writes it), else a generic line
  const credit = [...new Set(pack.members.map(m => m.credit).filter(Boolean))].join('\n') || '社区宠物包 · 形象版权归原作者所有';
  YB.cast({ id: 'pack', key: pack.key, name: pack.name, icon: '🐾', members: ids, credit });
})();
