// 文件投喂: how the bears react to what they are fed, and today's menu (今日食谱).
// Items come from the desktop shell's check_meal: [{ path, isDir, bytes }].
YB.feeding = (() => {
  const HUGE = 500 * 1024 * 1024;
  // after: what the bear does once it has finished chewing
  const KINDS = [
    { id: 'folder', emoji: '📦', unit: '个', label: '文件夹', say: '一整箱！', chew: 2200, duo: true },
    { id: 'image', emoji: '🍎', unit: '张', label: '图片', say: '照片！好好吃～', ext: 'jpg jpeg png gif webp bmp heic heif svg ico tif tiff raw' },
    { id: 'audio', emoji: '🎵', unit: '首', label: '音乐', say: '音乐～ 边吃边跳！', after: 'dance', ext: 'mp3 wav flac aac ogg m4a wma ape opus' },
    { id: 'video', emoji: '🍿', unit: '部', label: '视频', say: '好大的视频！', chew: 2200, ext: 'mp4 mkv mov avi webm flv wmv m4v' },
    { id: 'archive', emoji: '🥨', unit: '个', label: '压缩包', say: '这个有点难消化……', chew: 3000, ext: 'zip rar 7z tar gz tgz xz bz2 zst iso' },
    { id: 'doc', emoji: '📚', unit: '份', label: '文档', say: '好多字……吃得有点困', after: 'yawn', ext: 'pdf doc docx txt md rtf ppt pptx xls xlsx csv odt epub' },
    { id: 'code', emoji: '💻', unit: '个', label: '代码', say: '程序？嚼起来咔咔响', ext: 'py js ts jsx tsx rs c h cpp hpp cs java kt go rb php html css scss json yaml yml toml xml sql sh ps1 lua swift' },
    { id: 'exe', emoji: '⚠️', unit: '个', label: '程序', say: '这个真的可以吃吗？', after: 'shiver', ext: 'exe msi bat cmd com apk dmg pkg deb rpm appimage' },
    { id: 'other', emoji: '🍪', unit: '个', label: '零食', say: '吃掉了，嗝～' },
  ];
  const byExt = new Map(KINDS.flatMap(k => (k.ext || '').split(' ').filter(Boolean).map(e => [e, k])));
  const kindOf = item => item.isDir ? KINDS[0] : byExt.get((item.path.split('.').pop() || '').toLowerCase()) || KINDS.at(-1);

  // the kind that best describes a meal: folders win, otherwise the most common kind
  function classify(items) {
    const counts = new Map();
    for (const it of items) { const k = kindOf(it); counts.set(k, (counts.get(k) || 0) + 1); }
    const main = counts.has(KINDS[0]) ? KINDS[0] : [...counts].sort((a, b) => b[1] - a[1])[0][0];
    return { kind: main, counts, huge: items.some(it => it.bytes > HUGE) };
  }

  // --- 今日食谱: per-day counts kept in localStorage ---
  const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD
  function load() {
    try { const d = JSON.parse(localStorage.getItem('diary') || 'null'); if (d?.date === today()) return d; } catch {}
    return { date: today(), counts: {} };
  }
  function record(items) {
    const d = load();
    for (const it of items) { const id = kindOf(it).id; d.counts[id] = (d.counts[id] || 0) + 1; }
    try { localStorage.setItem('diary', JSON.stringify(d)); } catch {}
  }
  function summary(name) {
    const d = load(), rows = KINDS.filter(k => d.counts[k.id]);
    if (!rows.length) return `今天${name}还什么都没吃呢\n把文件拖过来喂喂我吧～`;
    const total = rows.reduce((s, k) => s + d.counts[k.id], 0);
    return `今天${name}吃了\n` + rows.map(k => `${k.emoji} ${d.counts[k.id]} ${k.unit}${k.label}`).join('\n') +
      `\n今日饱腹度：${Math.min(100, total * 6)}%`;
  }

  return { classify, record, summary, kindOf };
})();
