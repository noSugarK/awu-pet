// Website shell (index.html): page buttons + the download menu.
const { cast } = PET;
PET.bears.forEach(b => PET.setSprite(b.id, b.ch.sprite.sheet));
document.querySelector('h1').innerHTML = `${cast.members.map(id => YB.characters[id].name).join(' &amp; ')}<small>${cast.tagline || ''}</small>`;
document.querySelector('.credit').textContent = `${cast.credit} · Powered by noSugarK · 形象版权归原作者所有，本站为非商业粉丝作品`;
for (const id of ['think', 'dance', 'shy', 'sleep']) {
  const btn = document.getElementById(id);
  btn.hidden = !PET.can(id); // unsupported sheet actions stay hidden
  btn.onclick = () => PET.run(id);
}
// 角色: one button per cast (only once there is more than one)
const casts = Object.values(PET.casts);
if (casts.length > 1) {
  const row = document.createElement('div');
  row.className = 'actions';
  row.innerHTML = '<span class="label">角色</span>';
  for (const c of casts) {
    const btn = document.createElement('button');
    btn.textContent = `${c.icon} ${c.name}`;
    btn.setAttribute('aria-pressed', c === cast);
    btn.onclick = () => PET.setCast(c.id);
    row.append(btn);
  }
  document.querySelector('footer').prepend(row);
}
// Download menu: every entry starts out pointing at the latest release page; once GitHub answers,
// each one links straight to its installer in that release (asset names contain the version).
(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/noSugarK/awu-pet/releases/latest', { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const release = await res.json();
    document.querySelector('.dl-version').textContent = release.tag_name;
    for (const a of document.querySelectorAll('.dl [data-asset]')) {
      const asset = release.assets.find(x => x.name.endsWith(a.dataset.asset));
      if (asset) { a.href = asset.browser_download_url; a.removeAttribute('target'); }
    }
  } catch {} // offline or rate-limited: the release page links still work
})();
// touch screens have no hover: the first tap opens the menu instead of following the link
const dl = document.querySelector('.dl');
dl.querySelector('.top-btn').addEventListener('click', e => {
  if (matchMedia('(hover: none)').matches && !dl.classList.contains('open')) { e.preventDefault(); dl.classList.add('open'); }
});
addEventListener('pointerdown', e => { if (!dl.contains(e.target)) dl.classList.remove('open'); });
