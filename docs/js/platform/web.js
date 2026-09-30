// Website shell (index.html): page buttons + the download menu.
for (const id of ['think', 'dance', 'shy', 'sleep', 'noodle', 'boba', 'rose']) document.getElementById(id).onclick = () => PET.run(id);
for (const id of ['glasses', 'scarf']) {
  const btn = document.getElementById(id);
  btn.onclick = () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    PET.outfit(id, on);
  };
}

// Download menu: every entry starts out pointing at the latest release page; once GitHub answers,
// each one links straight to its installer in that release (asset names contain the version).
(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/noSugarK/yierbubu-pet/releases/latest', { headers: { Accept: 'application/vnd.github+json' } });
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
