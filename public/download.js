// A660 (A648 §15.7): kinexnote.com/download/ — the newest published version for Windows and Android from
// api.kinexnote.com (installers on dl.kinexnote.com), the mirror for mainland China and the SHA-256 of each file.
(function () {
  const root = document.documentElement;
  const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8787' : 'https://api.kinexnote.com';
  const en = () => root.dataset.lang === 'en';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const size = bytes => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '');
  const date = ms => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
  let data = null, failed = false;

  function render() {
    const box = document.getElementById('downloads');
    if (failed) { box.innerHTML = `<p class="offline">${en() ? 'Can’t connect right now — please try again later.' : '暂时连不上，稍后再看。'}</p>`; return; }
    if (!data) return;
    const latest = data.releases[0];
    const files = latest?.downloads;
    if (!latest || !files || (!files.windows && !files.android)) {
      box.innerHTML = `<p class="dl-note">${en() ? 'The beta installers are being prepared and will appear here once published. What is being worked on: <a class="inline-link" href="../updates/">Updates</a>.' : '内测安装包正在准备，发布后就在这里下载。正在做什么，可以在<a class="inline-link" href="../updates/">动态</a>里看。'}</p>`;
      return;
    }
    const card = (name, file, kind, needs) => `<article class="dl-card">
      <h2>${name}</h2>
      <div class="meta"><span>KineX ${esc(latest.version)}</span><span class="dot"></span><span>${date(latest.releasedAt)}</span><span class="dot"></span><span>${size(file.size)}</span></div>
      <p class="fine">${needs}</p>
      <div class="row-b"><a class="btn" href="${esc(file.url)}">${en() ? `Download ${kind}` : `下载${kind}`}</a>${files.mirror ? `<a class="btn ghost" href="${esc(files.mirror)}" rel="noopener">${en() ? 'Mirror (China)' : '国内备用'}</a>` : ''}</div>
      <p class="hash">SHA-256 ${esc(file.sha256)}</p>
    </article>`;
    box.innerHTML = `<div class="dl-grid">
      ${files.windows ? card('Windows', files.windows, en() ? 'installer (.exe)' : '安装包（.exe）', en() ? 'Windows 10 or 11, 64-bit.' : 'Windows 10 / 11，64 位。') : ''}
      ${files.android ? card('Android', files.android, en() ? 'APK' : ' APK', en() ? 'Android 7.0 or later. The first install asks you to allow installs from this browser.' : 'Android 7.0 及以上。第一次安装时，系统会问是否允许这个浏览器安装应用。') : ''}
    </div>
    <p class="dl-note">${en() ? `What’s new in ${esc(latest.version)}: <a class="inline-link" href="../updates/#changelog">the changelog</a>. The checksum lets you confirm the file is the one we published.` : `${esc(latest.version)} 更新了什么：见<a class="inline-link" href="../updates/#changelog">更新日志</a>。校验值可以用来确认下载的文件和我们发布的一致。`}</p>`;
  }

  fetch(`${API}/v1/releases`).then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then(body => { data = body; render(); }).catch(() => { failed = true; render(); });
  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
})();
