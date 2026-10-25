// A660: kinexnote.com/updates/ — 进度 (the roadmap board), 更新日志 (versions, year → version), 建议 (public ideas, votes,
// submitting, 我的反馈, the web sign-in). Data from api.kinexnote.com; what people wrote is shown as plain text. A classic
// script in public/ next to legal.js (which runs the language and theme switches), for the reason given there.
(function () {
  const root = document.documentElement;
  const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8787' : 'https://api.kinexnote.com';
  const $ = id => document.getElementById(id);
  const en = () => root.dataset.lang === 'en';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // plain text with its line breaks; web addresses (http, https only) become links
  const rich = value => esc(value).replace(/https?:\/\/[^\s<>"']+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${url}</a>`);
  const beijing = ms => new Date(ms + 8 * 3_600_000).toISOString();
  const date = ms => beijing(ms).slice(0, 10);
  const short = ms => beijing(ms).slice(5, 10);

  const WORDS = {
    leadRoadmap: ['KineX 接下来要做什么、正在做什么、最近做完了什么。想要的功能可以去“建议”里提，也可以给别人的建议投票。', 'What KineX does next, what is in progress and what was finished lately. Want something? Suggest it under Ideas, or vote for someone else’s.'],
    leadChangelog: ['KineX 每个版本改了什么。应用里的 设置 › 通用 › 版本 也能看到这些内容。', 'What changed in each version of KineX. The app shows the same under Settings › General › Version.'],
    leadFeedback: ['想要的功能在这里提，也可以给别人的建议投一票。新建议审核后公开；问题报告只有你和开发者能看到，在应用的 设置 › 反馈 里提交会自动带上版本和设备信息。', 'Suggest what you want, or vote for other people’s ideas. New ideas appear after review; bug reports are seen only by you and the developer — sent from the app (Settings › Feedback), they carry the version and device.'],
    planned: ['计划中', 'Planned'], started: ['进行中', 'In progress'], completed: ['已完成', 'Done'],
    all: ['全部', 'All'], updatedNow: ['实时更新', 'Live'], ideasVotes: ['{0} 条建议 · {1} 票', '{0} ideas · {1} votes'], target: ['目标 {0}', 'Target {0}'], shipped: ['{0} 完成', 'Shipped in {0}'],
    noItems: ['暂时没有', 'Nothing yet'], toLog: ['每个版本改了什么', 'What each version changed'], toLogLink: ['看更新日志 →', 'Read the changelog →'],
    offline: ['暂时连不上，稍后再看。', 'Can’t connect right now — please try again later.'], loading: ['读取中…', 'Loading…'],
    versions: ['版本', 'Versions'], latest: ['最新', 'Latest'], added: ['新功能', 'New'], improved: ['改进', 'Improved'], fixed: ['修复', 'Fixed'],
    noReleases: ['第一个公开版本还没发布。', 'The first public version isn’t out yet.'], mirror: ['国内备用下载', 'Mirror (China)'], hashes: ['校验值（SHA-256）', 'Checksums (SHA-256)'],
    hot: ['热门', 'Top'], newest: ['最新', 'Newest'], allTags: ['全部分类', 'All topics'], mine: ['我的反馈', 'My feedback'], publicIdeas: ['公开建议', 'Public ideas'],
    suggest: ['提建议', 'Suggest'], signIn: ['登录', 'Sign in'], signOut: ['退出', 'Sign out'], signedInAs: ['已登录 {0}', 'Signed in as {0}'], settings: ['昵称与通知', 'Name & email'],
    noIdeas: ['还没有公开的建议，来提第一条。', 'No public ideas yet — be the first.'], noMine: ['你还没有提过反馈。', 'You haven’t sent any feedback yet.'],
    votes: ['{0} 票', '{0} votes'], reply: ['官方已回复', 'Answered'], by: ['{0} · {1}', '{0} · {1}'], choose: ['点一条建议看详情。', 'Pick an idea to see it here.'],
    follow: ['邮件通知我进展', 'Email me about progress'], official: ['KINEX 官方回复', 'FROM KINEX'], onRoadmap: ['在开发进度里', 'On the roadmap'], history: ['进展', 'History'],
    evCreated: ['提交', 'Submitted'], evReply: ['官方回复', 'Official reply'], evMerged: ['和另一条重复，已合并', 'Merged into another idea'], evRoadmap: ['挂到开发进度', 'Linked to the roadmap'], evAuthor: ['作者补充', 'Added by the author'],
    duplicateOf: ['和“{0}”重复', 'Duplicate of “{0}”'], add: ['补充一句', 'Add a note'], addSend: ['补充', 'Add'], pendingNote: ['审核后公开，只有你能看到。', 'Only you can see it until it is reviewed.'], bugNote: ['问题报告只有你和开发者能看到。', 'Only you and the developer can see this report.'],
    idea: ['建议', 'Idea'], bug: ['问题', 'Bug'],
    submitTitle: ['提建议', 'Suggest an idea'], reportTitle: ['报告问题', 'Report a bug'], titleLabel: ['标题', 'Title'], bodyLabel: ['说明', 'Details'], optional: ['可不填', 'optional'],
    tagLabel: ['分类', 'Topic'], noTag: ['不选', 'None'], nickname: ['昵称', 'Name'], nicknameHint: ['公开显示在你的建议旁边', 'shown next to your ideas'], display: ['显示方式', 'Show it as'],
    displayFull: ['完整昵称', 'Full name'], displayInitial: ['只显示开头一个字', 'First character only'], displayAnon: ['匿名', 'Anonymous'],
    similar: ['可能和你的一样，投一票就行：', 'These may be the same — a vote is enough:'], voteIt: ['投一票', 'Vote'], voted: ['已投', 'Voted'],
    cancel: ['取消', 'Cancel'], submit: ['提交', 'Submit'], submittedIdea: ['已提交，审核后公开', 'Sent — it appears after review'], submittedBug: ['已提交，处理有进展时会邮件告诉你', 'Sent — we’ll email you as it moves'],
    bugFromApp: ['在 KineX 应用的 设置 › 反馈 里报告，会自动附上版本和设备信息，更容易查清楚。', 'Reporting from the KineX app (Settings › Feedback) attaches the version and device, which makes it easier to track down.'],
    loginTitle: ['登录 KineX 账号', 'Sign in to KineX'], loginSub: ['用邮箱登录，无需密码。网页登录只用来提交和投票，不占设备名额。', 'Sign in with your email, no password. A web sign-in is only for ideas and votes; it takes no device seat.'],
    email: ['邮箱', 'Email'], getCode: ['获取验证码', 'Send code'], working: ['正在做安全校验…', 'Running a quick check…'], sending: ['发送中…', 'Sending…'],
    codeSent: ['验证码已发送至 {0}', 'Code sent to {0}'], code: ['6 位验证码', '6-digit code'], login: ['登录', 'Sign in'], agreeLogin: ['同意并登录', 'Agree and sign in'],
    agreeTerms: ['同意《<a href="../terms/" target="_blank">用户协议</a>》和《<a href="../privacy/" target="_blank">隐私政策</a>》', 'I accept the <a href="../terms/" target="_blank">User Agreement</a> and the <a href="../privacy/" target="_blank">Privacy Policy</a>'],
    agreeAbroad: ['同意账号信息在境外服务器上处理', 'I agree to my account data being processed on servers outside mainland China'],
    newAccount: ['这个邮箱还没有 KineX 账号，同意下面两项就会创建。', 'This email has no KineX account yet; agreeing below creates one.'],
    profileTitle: ['昵称与通知', 'Name & email'], mailOn: ['反馈有进展时给我发邮件', 'Email me when my feedback moves'], save: ['保存', 'Save'], saved: ['已保存', 'Saved'],
    unsubTitle: ['退订反馈邮件', 'Unsubscribe'], unsubPost: ['以后这条反馈有进展时不再给你发邮件。', 'You won’t get emails about this item any more.'], unsubAll: ['以后不再收到任何反馈邮件；可以随时在“昵称与通知”里打开。', 'You won’t get any feedback emails; you can turn them back on under Name & email.'],
    unsubDo: ['确认退订', 'Unsubscribe'], unsubDone: ['已退订', 'Unsubscribed'],
    errors: ['出错了，请稍后再试', 'Something went wrong — please try again'], tooShort: ['标题太短', 'The title is too short'], needNick: ['先起个昵称', 'Pick a name first'],
    rate_limited: ['操作太频繁，请稍后再试', 'Too many tries — please wait a little'], code_wrong: ['验证码不对', 'Wrong code'], code_expired: ['验证码已失效，请重新获取', 'The code has expired — get a new one'],
    pow_invalid: ['安全校验没通过，请再试一次', 'The check failed — please try again'], bad_email: ['请输入正确的邮箱', 'Please enter a valid email'], forbidden: ['这个账号暂时不能提交反馈', 'This account can’t send feedback right now']
  };
  const t = (key, ...args) => { const pair = WORDS[key]; const text = pair ? pair[en() ? 1 : 0] : key; return args.reduce((s, a, i) => s.replace(`{${i}}`, a), text); };
  const STATUS = {
    idea: { pending: ['待审核', 'Under review'], rejected: ['未通过', 'Not approved'], open: ['已收到', 'Received'], planned: ['计划中', 'Planned'], started: ['进行中', 'In progress'], completed: ['已完成', 'Done'], declined: ['不做了', 'Not planned'], duplicate: ['重复', 'Duplicate'] },
    bug: { open: ['已收到', 'Received'], started: ['处理中', 'Working on it'], completed: ['已修复', 'Fixed'], cannot_reproduce: ['无法重现', 'Can’t reproduce'], duplicate: ['重复', 'Duplicate'] }
  };
  const TAGS = { reading: ['阅读', 'Reading'], board: ['白板', 'Board'], flashcards: ['闪卡与学习', 'Flashcards'], sync: ['同步', 'Sync'], tablet: ['平板', 'Tablet'], other: ['其他', 'Other'] };
  const pick = pair => (pair ? pair[en() ? 1 : 0] : '');
  const statusName = (kind, status) => pick(STATUS[kind]?.[status]) || status;
  const VOTABLE = ['open', 'planned', 'started'];

  // ---- requests: the site's cookie goes with them (credentials), only to api.kinexnote.com
  async function call(path, body) {
    const init = body === undefined ? { credentials: 'include' } : { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    const response = await fetch(API + path, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error?.message || t('errors')); error.code = data.error?.code; error.status = response.status; throw error; }
    return data;
  }
  const say = error => (WORDS[error.code] ? t(error.code) : error.code === 'bad_request' && /邮箱/.test(error.message) ? t('bad_email') : error.code === 'bad_request' ? error.message : !error.status ? t('offline') : t('errors'));
  let toastTimer;
  function toast(text) { const el = $('toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3200); }

  const state = { view: 'roadmap', roadmap: null, releases: null, ideas: null, sort: 'top', tag: '', rmTag: '', showMine: false, session: { signedIn: false }, mine: null, open: null, openData: null };

  // ---- the sign-in state and the account's own feedback
  async function refreshSession() {
    try { state.session = await call('/v1/auth/web/session'); } catch { state.session = { signedIn: false }; }
    state.mine = null;
    if (state.session.signedIn) { try { state.mine = await call('/v1/feedback/mine'); } catch { /* shown as signed out of its list */ } }
  }

  // ---------------------------------------------------------------- 进度
  async function showRoadmap() {
    const box = $('view-roadmap');
    if (!state.roadmap) {
      box.innerHTML = `<p class="loading">${t('loading')}</p>`;
      try { state.roadmap = (await call('/v1/roadmap')).items; } catch { box.innerHTML = `<p class="offline">${t('offline')}</p>`; return; }
    }
    const items = state.roadmap.filter(item => !state.rmTag || item.tag === state.rmTag);
    const column = status => {
      const list = items.filter(item => item.status === status);
      return `<section class="col"><div class="col-h"><span class="st ${status}">${t(status)}</span><small>${list.length}</small></div><div class="cards">${list.map(item => `
        <article class="card${status === 'completed' ? ' done' : ''}">
          <h3>${esc(en() ? item.title.en : item.title.zh)}</h3>
          ${(en() ? item.body.en : item.body.zh) ? `<p>${esc(en() ? item.body.en : item.body.zh)}</p>` : ''}
          <div class="meta">${item.tag ? `<span class="tag">${esc(pick(TAGS[item.tag]))}</span>` : ''}${item.tag && item.version ? '<span class="dot"></span>' : ''}${item.version ? `<span class="tag">${esc(status === 'completed' ? t('shipped', item.version) : t('target', item.version))}</span>` : ''}</div>
          ${item.ideas.length ? `<details class="sugg"><summary>${t('ideasVotes', item.ideas.length, item.votes)}</summary><ul>${item.ideas.map(idea => `<li><a href="?id=${esc(idea.id)}#feedback"><b>▲ ${idea.votes}</b>${esc(idea.title)}</a></li>`).join('')}</ul></details>` : ''}
        </article>`).join('') || `<p class="empty">${t('noItems')}</p>`}</div></section>`;
    };
    const tags = Object.keys(TAGS).filter(tag => state.roadmap.some(item => item.tag === tag));
    box.innerHTML = `
      ${tags.length > 1 ? `<div class="bar"><div class="chips" role="group">${['', ...tags].map(tag => `<button class="chip" data-rm-tag="${tag}" aria-pressed="${state.rmTag === tag}">${tag ? esc(pick(TAGS[tag])) : t('all')}</button>`).join('')}</div></div>` : ''}
      <div class="board">${column('planned')}${column('started')}${column('completed')}</div>
      <a class="tolog" href="#changelog"><span><strong>${t('toLog')}</strong>${t('leadChangelog')}</span><span>${t('toLogLink')}</span></a>`;
    box.querySelectorAll('[data-rm-tag]').forEach(button => { button.onclick = () => { state.rmTag = button.dataset.rmTag; showRoadmap(); }; });
  }

  // ---------------------------------------------------------------- 更新日志
  async function showChangelog() {
    const box = $('view-changelog');
    if (!state.releases) {
      box.innerHTML = `<p class="loading">${t('loading')}</p>`;
      try { state.releases = (await call('/v1/releases')).releases; } catch { box.innerHTML = `<p class="offline">${t('offline')}</p>`; return; }
    }
    const releases = state.releases;
    if (!releases.length) { box.innerHTML = `<p class="empty">${t('noReleases')} <a class="inline-link" href="../download/">${en() ? 'Download' : '下载页'}</a></p>`; return; }
    const id = version => `v-${version.replace(/[^0-9A-Za-z]+/g, '-')}`;
    const years = [...new Set(releases.map(r => beijing(r.releasedAt).slice(0, 4)))];
    const latestBadge = `<span class="badge">${t('latest')}</span>`;
    const nav = `<nav class="vnav"${years.length === 1 ? ' data-one' : ''} aria-label="${t('versions')}"><h2>${t('versions')}</h2>${years.map((year, index) => {
      const list = releases.filter(r => beijing(r.releasedAt).startsWith(year));
      return `<div class="year"${index === 0 ? ' data-open' : ''}><button type="button"><span>${year}</span><small>${list.length}</small></button><ol>${list.map(r => `<li><a href="#${id(r.version)}" data-version="${id(r.version)}"><span class="v">${esc(r.version)}</span>${r === releases[0] ? latestBadge : ''}<small>${short(r.releasedAt)}</small></a></li>`).join('')}</ol></div>`;
    }).join('')}</nav>`;
    const groups = notes => [['added', notes.added], ['improved', notes.improved], ['fixed', notes.fixed]].filter(([, items]) => items?.length)
      .map(([key, items]) => `<div class="grp"><span>${t(key)}</span><ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('');
    const downloads = r => {
      const d = r.downloads;
      if (!d) return '';
      const links = [d.windows && `<a href="${esc(d.windows.url)}">Windows</a>`, d.android && `<a href="${esc(d.android.url)}">Android</a>`, d.mirror && `<a href="${esc(d.mirror)}" rel="noopener">${t('mirror')}</a>`, (d.windows || d.android) && `<a href="../download/">${t('hashes')}</a>`].filter(Boolean);
      return links.length ? `<div class="dl">${links.join('')}</div>` : '';
    };
    let lastYear = '';
    const body = releases.map(r => {
      const year = beijing(r.releasedAt).slice(0, 4);
      const heading = years.length > 1 && year !== lastYear ? `<div class="yr">${year}</div>` : '';
      lastYear = year;
      return `${heading}<article class="rel" id="${id(r.version)}"><div class="rel-h"><span class="v">${esc(r.version)}</span>${r === releases[0] ? latestBadge : ''}<span class="d">${date(r.releasedAt)}</span></div><h3>${esc(r.title)}</h3>${groups(r.notes || {})}${downloads(r)}</article>`;
    }).join('');
    const mobile = `<div class="mobile-pick"><select aria-label="${t('versions')}">${years.map(year => `<optgroup label="${year}">${releases.filter(r => beijing(r.releasedAt).startsWith(year)).map(r => `<option value="${id(r.version)}">${esc(r.version)} · ${short(r.releasedAt)}${r === releases[0] ? `（${t('latest')}）` : ''}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
    box.innerHTML = `<div class="log">${nav}<div class="log-body">${mobile}${body}</div></div>`;
    box.querySelectorAll('.year > button').forEach(button => { button.onclick = () => button.parentElement.toggleAttribute('data-open'); });
    box.querySelector('.mobile-pick select').onchange = event => { document.getElementById(event.target.value)?.scrollIntoView({ behavior: 'smooth' }); };
    box.querySelectorAll('.vnav a').forEach(a => { a.onclick = event => { event.preventDefault(); document.getElementById(a.dataset.version)?.scrollIntoView({ behavior: 'smooth' }); }; });
    // the version in view is marked in the list, its year opened
    const links = [...box.querySelectorAll('.vnav a')];
    spy?.disconnect();
    spy = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.dataset.version === entry.target.id));
      links.find(a => a.classList.contains('on'))?.closest('.year')?.setAttribute('data-open', '');
    }), { rootMargin: '-20% 0px -70% 0px' });
    box.querySelectorAll('.rel').forEach(article => spy.observe(article));
  }
  let spy = null;

  // ---------------------------------------------------------------- 建议
  async function loadIdeas() {
    try { state.ideas = (await call(`/v1/feedback?sort=${state.sort === 'new' ? 'new' : 'top'}${state.tag ? `&tag=${state.tag}` : ''}`)).ideas; }
    catch { state.ideas = null; }
  }
  const voted = id => Boolean(state.mine?.votes.includes(id));
  function voteButton(post, big) {
    const can = post.kind === 'idea' && VOTABLE.includes(post.status);
    return `<button class="vote" data-vote="${esc(post.id)}" aria-pressed="${voted(post.id)}"${can ? '' : ' disabled'} aria-label="${t('voteIt')}">${big ? `${t('voteIt')} · ` : ''}${post.votes}</button>`;
  }

  async function showFeedback() {
    const box = $('view-feedback');
    if (!state.ideas && !state.showMine) { box.innerHTML = `<p class="loading">${t('loading')}</p>`; await loadIdeas(); if (!state.ideas) { box.innerHTML = `<p class="offline">${t('offline')}</p>`; return; } }
    const signed = state.session.signedIn;
    const list = state.showMine ? state.mine?.posts ?? [] : state.ideas;
    const rows = list.map(post => `<div class="row${post.kind === 'bug' ? ' bug' : ''}${state.open === post.id ? ' on' : ''}${post.status === 'pending' ? ' mine' : ''}" data-open="${esc(post.id)}">
        ${post.kind === 'idea' ? voteButton(post) : ''}
        <div><h3>${esc(post.title)}</h3>${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
          <div class="meta"><span class="st ${post.status}">${esc(statusName(post.kind, post.status))}</span>${post.kind === 'bug' ? `<span class="tag">${t('bug')}</span>` : ''}${post.tag ? `<span class="tag">${esc(pick(TAGS[post.tag]))}</span>` : ''}<span>${esc(post.author)} · ${date(post.createdAt)}</span>${post.hasReply ? `<span>${t('reply')}</span>` : ''}</div></div>
      </div>`).join('');
    box.innerHTML = `
      <div class="bar">
        ${state.showMine ? `<button class="chip" data-mine="0">${t('publicIdeas')}</button><button class="chip" aria-pressed="true">${t('mine')}</button>`
          : `<div class="chips" role="group"><button class="chip" data-sort="top" aria-pressed="${state.sort === 'top'}">${t('hot')}</button><button class="chip" data-sort="new" aria-pressed="${state.sort === 'new'}">${t('newest')}</button></div>
             <select class="in tag-pick" aria-label="${t('tagLabel')}"><option value="">${t('allTags')}</option>${Object.keys(TAGS).map(tag => `<option value="${tag}"${state.tag === tag ? ' selected' : ''}>${esc(pick(TAGS[tag]))}</option>`).join('')}</select>`}
        <span class="grow"></span>
        ${signed ? `<span class="who">${t('signedInAs', `<b>${esc(state.session.emailHint)}</b>`)}</span>${state.showMine ? '' : `<button class="text-btn" data-mine="1">${t('mine')}</button>`}<button class="text-btn" data-profile>${t('settings')}</button><button class="text-btn" data-signout>${t('signOut')}</button>`
          : `<button class="text-btn" data-signin>${t('signIn')}</button>`}
        <button class="btn" data-suggest>${t('suggest')}</button>
      </div>
      <div class="split"><div class="list">${rows || `<p class="empty">${state.showMine ? t('noMine') : t('noIdeas')}</p>`}</div><aside class="detail" id="detail">${state.open ? `<p class="loading">${t('loading')}</p>` : `<p class="empty">${t('choose')}</p>`}</aside></div>`;
    box.querySelectorAll('[data-sort]').forEach(b => { b.onclick = async () => { state.sort = b.dataset.sort; state.ideas = null; showFeedback(); }; });
    box.querySelector('.tag-pick')?.addEventListener('change', event => { state.tag = event.target.value; state.ideas = null; showFeedback(); });
    box.querySelectorAll('[data-mine]').forEach(b => { b.onclick = () => { state.showMine = b.dataset.mine === '1'; showFeedback(); }; });
    box.querySelector('[data-signin]')?.addEventListener('click', () => signIn());
    box.querySelector('[data-signout]')?.addEventListener('click', async () => { await call('/v1/auth/web/logout', {}).catch(() => {}); await refreshSession(); state.showMine = false; showFeedback(); });
    box.querySelector('[data-profile]')?.addEventListener('click', profileSheet);
    box.querySelector('[data-suggest]').onclick = () => (signed ? submitSheet('idea') : signIn(() => submitSheet('idea')));
    box.querySelectorAll('[data-open]').forEach(row => { row.onclick = event => { if (event.target.closest('[data-vote]')) return; openPost(row.dataset.open, true); }; });
    bindVotes(box);
    if (state.open) openPost(state.open, false);
  }

  function bindVotes(scope) {
    scope.querySelectorAll('[data-vote]').forEach(button => {
      button.onclick = async event => {
        event.stopPropagation();
        if (!state.session.signedIn) return signIn(() => button.click());
        const id = button.dataset.vote, on = !voted(id);
        try {
          const result = await call('/v1/feedback/vote', { id, on });
          if (state.mine) state.mine.votes = on ? [...state.mine.votes, id] : state.mine.votes.filter(v => v !== id);
          for (const post of [...(state.ideas ?? []), ...(state.mine?.posts ?? [])]) if (post.id === id) post.votes = result.votes;
          if (state.openData?.post.id === id) { state.openData.post.votes = result.votes; state.openData.post.voted = on; if (on) state.openData.post.subscribed = true; }
          showFeedback();
        } catch (error) { toast(say(error)); }
      };
    });
  }

  async function openPost(id, scroll) {
    state.open = id;
    const box = $('detail');
    if (!box) return;
    document.querySelectorAll('.row').forEach(row => row.classList.toggle('on', row.dataset.open === id));
    try {
      const data = state.openData?.post.id === id && !scroll ? state.openData : await call(`/v1/feedback/post?id=${encodeURIComponent(id)}`);
      state.openData = data;
      const p = data.post;
      const event = e => {
        const what = e.kind === 'status' ? `${esc(statusName(p.kind, e.from))} → ${esc(statusName(p.kind, e.to))}` : e.kind === 'created' ? t('evCreated') : e.kind === 'reply' ? t('evReply') : e.kind === 'merged' ? t('evMerged') : e.kind === 'roadmap' ? t('evRoadmap') : t('evAuthor');
        return `<li><time>${date(e.at)}</time>${what}${e.note && e.kind !== 'merged' && e.kind !== 'roadmap' && e.kind !== 'reply' ? `<span class="note">${rich(e.note)}</span>` : ''}</li>`;
      };
      box.innerHTML = `
        <div class="top"><span class="st ${p.status}">${esc(statusName(p.kind, p.status))}</span>${p.tag ? `<span class="tag">${esc(pick(TAGS[p.tag]))}</span>` : ''}${p.kind === 'bug' ? `<span class="tag">${t('bug')}</span>` : ''}</div>
        <h2>${esc(p.title)}</h2>
        <div class="meta by"><span>${esc(p.author)}</span><span class="dot"></span><span>${date(p.createdAt)}</span>${p.kind === 'idea' ? `<span class="dot"></span><span>${t('votes', p.votes)}</span>` : ''}</div>
        ${p.status === 'pending' ? `<p class="fine">${t('pendingNote')}</p>` : p.kind === 'bug' ? `<p class="fine">${t('bugNote')}</p>` : ''}
        ${p.duplicateOf ? `<div class="linked"><span>${esc(t('duplicateOf', p.duplicateOf.title))}</span><a href="?id=${esc(p.duplicateOf.id)}#feedback" data-goto="${esc(p.duplicateOf.id)}">→</a></div>` : ''}
        ${p.body ? `<div class="body">${rich(p.body)}</div>` : ''}
        ${p.officialReply ? `<div class="official"><small>${t('official')} · ${date(p.officialReplyAt)}</small><p>${rich(p.officialReply)}</p></div>` : ''}
        ${p.roadmap ? `<a class="linked" href="#roadmap"><span>${t('onRoadmap')}</span><b>${esc(en() ? p.roadmap.titleEn || p.roadmap.titleZh : p.roadmap.titleZh)}</b></a>` : ''}
        ${p.kind === 'idea' || state.session.signedIn ? `<div class="acts">${p.kind === 'idea' ? voteButton(p, true) : ''}${state.session.signedIn ? `<span class="toggle" role="switch" tabindex="0" aria-checked="${Boolean(p.subscribed)}" data-follow><i></i>${t('follow')}</span>` : ''}</div>` : ''}
        <div class="tl"><h4>${t('history')}</h4><ol>${data.events.map(event).join('')}</ol></div>
        ${p.mine ? `<form class="add-form" data-add><textarea class="in" maxlength="1000" placeholder="${t('add')}"></textarea><div class="row-b"><button class="btn small" type="submit">${t('addSend')}</button></div></form>` : ''}`;
      bindVotes(box);
      box.querySelector('[data-goto]')?.addEventListener('click', event => { event.preventDefault(); openPost(event.currentTarget.dataset.goto, true); });
      const follow = box.querySelector('[data-follow]');
      if (follow) follow.onclick = follow.onkeydown = async e => {
        if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        try { const r = await call('/v1/feedback/subscribe', { id, on: follow.getAttribute('aria-checked') !== 'true' }); p.subscribed = r.subscribed; follow.setAttribute('aria-checked', String(r.subscribed)); } catch (error) { toast(say(error)); }
      };
      box.querySelector('[data-add]')?.addEventListener('submit', async e => {
        e.preventDefault();
        const text = e.currentTarget.querySelector('textarea').value.trim();
        if (!text) return;
        try { await call('/v1/feedback/supplement', { id, text }); state.openData = null; openPost(id, false); } catch (error) { toast(say(error)); }
      });
      if (scroll && matchMedia('(max-width: 1000px)').matches) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const url = new URL(location.href); url.searchParams.set('id', id); url.searchParams.delete('unsub'); history.replaceState(null, '', url);
    } catch (error) {
      box.innerHTML = `<p class="empty">${error.status === 404 ? (en() ? 'This item isn’t public.' : '这条反馈不公开或已删除。') : t('offline')}</p>`;
    }
  }

  // ---------------------------------------------------------------- sheets
  function sheet(html, bind) {
    $('sheet').innerHTML = html;
    $('veil').hidden = false;
    const close = () => { $('veil').hidden = true; $('sheet').innerHTML = ''; };
    $('sheet').querySelectorAll('[data-close]').forEach(b => { b.onclick = close; });
    $('sheet').querySelector('input, textarea')?.focus();
    bind?.($('sheet'), close);
    return close;
  }
  $('veil').addEventListener('click', event => { if (event.target === $('veil')) { $('veil').hidden = true; } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('veil').hidden) $('veil').hidden = true; });

  /** A656: the server's sum before it mails a code, worked out in a worker. */
  async function solvePow() {
    const challenge = await call('/v1/auth/pow', {});
    const number = await new Promise((resolve, reject) => {
      const worker = new Worker('/pow-worker.js');
      worker.onmessage = event => { worker.terminate(); event.data >= 0 ? resolve(event.data) : reject(new Error('pow')); };
      worker.onerror = () => { worker.terminate(); reject(new Error('pow')); };
      worker.postMessage({ salt: challenge.salt, hash: challenge.hash, max: challenge.max });
    });
    return { ...challenge, number };
  }

  function signIn(then) {
    let email = '', needConsent = false;
    const stepEmail = () => sheet(`
      <h2>${t('loginTitle')}</h2><p class="sub">${t('loginSub')}</p>
      <form data-form><label class="field"><span>${t('email')}</span><input class="in" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}"></label>
      <p class="err" hidden></p><div class="row-b"><button class="btn ghost" type="button" data-close>${t('cancel')}</button><button class="btn" type="submit">${t('getCode')}</button></div></form>`, (s, close) => {
      s.querySelector('[data-form]').onsubmit = async event => {
        event.preventDefault();
        const button = s.querySelector('button[type="submit"]'), err = s.querySelector('.err');
        email = s.querySelector('input').value.trim();
        button.disabled = true; err.hidden = true;
        try {
          button.textContent = t('working');
          const pow = await solvePow();
          button.textContent = t('sending');
          await call('/v1/auth/web/start', { email, pow });
          stepCode(close);
        } catch (error) { err.textContent = say(error); err.hidden = false; button.disabled = false; button.textContent = t('getCode'); }
      };
    });
    const stepCode = () => sheet(`
      <h2>${t('loginTitle')}</h2><p class="sub">${t('codeSent', esc(email))}</p>
      <form data-form><label class="field"><span>${t('code')}</span><input class="in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
      <div data-consent ${needConsent ? '' : 'hidden'}><p class="fine">${t('newAccount')}</p><label class="check"><input type="checkbox" data-terms>${t('agreeTerms')}</label><label class="check"><input type="checkbox" data-abroad>${esc(t('agreeAbroad'))}</label></div>
      <p class="err" hidden></p><div class="row-b"><button class="btn ghost" type="button" data-close>${t('cancel')}</button><button class="btn" type="submit">${needConsent ? t('agreeLogin') : t('login')}</button></div></form>`, (s, close) => {
      s.querySelector('[data-form]').onsubmit = async event => {
        event.preventDefault();
        const err = s.querySelector('.err'), terms = s.querySelector('[data-terms]').checked, abroad = s.querySelector('[data-abroad]').checked;
        if (needConsent && !(terms && abroad)) { err.textContent = en() ? 'Please agree to both first.' : '请先勾选两项同意。'; err.hidden = false; return; }
        try {
          await call('/v1/auth/web/verify', { email, code: s.querySelector('input').value.trim(), ...(needConsent ? { consents: { terms, crossBorder: abroad, version: '1' } } : {}) });
          close();
          await refreshSession();
          if (state.view === 'feedback') showFeedback();
          then?.();
        } catch (error) {
          if (error.code === 'consent_required') { needConsent = true; const code = s.querySelector('input').value; stepCode(); $('sheet').querySelector('input').value = code; return; }
          err.textContent = say(error); err.hidden = false;
        }
      };
    });
    stepEmail();
  }

  function submitSheet(kind) {
    const needNick = kind === 'idea' && !state.mine?.profile.nickname;
    sheet(`
      <h2>${kind === 'idea' ? t('submitTitle') : t('reportTitle')}</h2>
      <div class="kinds chips" role="group"><button class="chip" type="button" data-kind="idea" aria-pressed="${kind === 'idea'}">${t('idea')}</button><button class="chip" type="button" data-kind="bug" aria-pressed="${kind === 'bug'}">${t('bug')}</button></div>
      ${kind === 'bug' ? `<p class="fine">${t('bugFromApp')}</p>` : ''}
      <form data-form>
        <label class="field"><span>${t('titleLabel')}</span><input class="in" name="title" maxlength="80" required></label>
        <div class="similar" hidden></div>
        <label class="field"><span>${t('bodyLabel')}<small>${t('optional')}</small></span><textarea class="in" name="body" maxlength="2000"></textarea></label>
        <label class="field"><span>${t('tagLabel')}</span><select class="in" name="tag"><option value="">${t('noTag')}</option>${Object.keys(TAGS).map(tag => `<option value="${tag}">${esc(pick(TAGS[tag]))}</option>`).join('')}</select></label>
        ${needNick ? `<label class="field"><span>${t('nickname')}<small>${t('nicknameHint')}</small></span><input class="in" name="nickname" maxlength="20" required></label>
          <label class="field"><span>${t('display')}</span><select class="in" name="display"><option value="full">${t('displayFull')}</option><option value="initial">${t('displayInitial')}</option><option value="anonymous">${t('displayAnon')}</option></select></label>` : ''}
        <p class="err" hidden></p>
        <div class="row-b"><button class="btn ghost" type="button" data-close>${t('cancel')}</button><button class="btn" type="submit">${t('submit')}</button></div>
      </form>`, (s, close) => {
      s.querySelectorAll('[data-kind]').forEach(b => { b.onclick = () => { if (b.dataset.kind !== kind) submitSheet(b.dataset.kind); }; });
      const form = s.querySelector('[data-form]'), similar = s.querySelector('.similar');
      let typing;
      if (kind === 'idea') form.title.oninput = () => {
        clearTimeout(typing);
        typing = setTimeout(async () => {
          const q = form.title.value.trim();
          if (q.length < 2) { similar.hidden = true; return; }
          try {
            const { ideas } = await call(`/v1/feedback/similar?q=${encodeURIComponent(q)}`);
            similar.hidden = !ideas.length;
            similar.innerHTML = `<small>${t('similar')}</small><ul>${ideas.map(idea => `<li><span>${esc(idea.title)} · ${t('votes', idea.votes)}</span><button class="btn ghost small" type="button" data-similar="${esc(idea.id)}">${voted(idea.id) ? t('voted') : t('voteIt')}</button></li>`).join('')}</ul>`;
            similar.querySelectorAll('[data-similar]').forEach(b => { b.onclick = async () => { try { await call('/v1/feedback/vote', { id: b.dataset.similar, on: true }); close(); await refreshSession(); state.ideas = null; state.open = b.dataset.similar; showFeedback(); } catch (error) { toast(say(error)); } }; });
          } catch { similar.hidden = true; }
        }, 350);
      };
      form.onsubmit = async event => {
        event.preventDefault();
        const err = s.querySelector('.err');
        if (form.title.value.trim().length < 2) { err.textContent = t('tooShort'); err.hidden = false; return; }
        if (needNick && !form.nickname.value.trim()) { err.textContent = t('needNick'); err.hidden = false; return; }
        try {
          const result = await call('/v1/feedback', { kind, title: form.title.value, body: form.body.value, tag: form.tag.value, platform: 'web', ...(needNick ? { nickname: form.nickname.value, nameDisplay: form.display.value } : {}) });
          close();
          toast(kind === 'idea' ? t('submittedIdea') : t('submittedBug'));
          await refreshSession();
          state.showMine = true; state.open = result.id; state.openData = null;
          showFeedback();
        } catch (error) { err.textContent = say(error); err.hidden = false; }
      };
    });
  }

  function profileSheet() {
    const profile = state.mine?.profile ?? { nickname: '', nameDisplay: 'full', feedbackMail: true };
    sheet(`
      <h2>${t('profileTitle')}</h2>
      <form data-form>
        <label class="field"><span>${t('nickname')}<small>${t('nicknameHint')}</small></span><input class="in" name="nickname" maxlength="20" value="${esc(profile.nickname)}"></label>
        <label class="field"><span>${t('display')}</span><select class="in" name="display">${[['full', 'displayFull'], ['initial', 'displayInitial'], ['anonymous', 'displayAnon']].map(([value, key]) => `<option value="${value}"${profile.nameDisplay === value ? ' selected' : ''}>${t(key)}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="mail"${profile.feedbackMail ? ' checked' : ''}>${t('mailOn')}</label>
        <p class="err" hidden></p>
        <div class="row-b"><button class="btn ghost" type="button" data-close>${t('cancel')}</button><button class="btn" type="submit">${t('save')}</button></div>
      </form>`, (s, close) => {
      const form = s.querySelector('[data-form]');
      form.onsubmit = async event => {
        event.preventDefault();
        try { await call('/v1/me/profile', { nickname: form.nickname.value, nameDisplay: form.display.value, feedbackMail: form.mail.checked }); close(); toast(t('saved')); await refreshSession(); showFeedback(); }
        catch (error) { const err = s.querySelector('.err'); err.textContent = say(error); err.hidden = false; }
      };
    });
  }

  function unsubscribeSheet(token) {
    const all = /\.all\./.test(token);
    sheet(`<h2>${t('unsubTitle')}</h2><p class="sub">${all ? t('unsubAll') : t('unsubPost')}</p><p class="err" hidden></p>
      <div class="row-b"><button class="btn ghost" type="button" data-close>${t('cancel')}</button><button class="btn" type="button" data-go>${t('unsubDo')}</button></div>`, (s, close) => {
      s.querySelector('[data-go]').onclick = async () => {
        try { const r = await call('/v1/feedback/unsubscribe', { token }); close(); toast(r.title ? `${t('unsubDone')}：${r.title}` : t('unsubDone')); const url = new URL(location.href); url.searchParams.delete('unsub'); history.replaceState(null, '', url); }
        catch (error) { const err = s.querySelector('.err'); err.textContent = say(error); err.hidden = false; }
      };
    });
  }

  // ---------------------------------------------------------------- the three views
  function route() {
    const hash = location.hash.slice(1);
    state.view = ['roadmap', 'changelog', 'feedback'].includes(hash) ? hash : new URLSearchParams(location.search).has('id') ? 'feedback' : 'roadmap';
    render();
  }
  function render() {
    document.querySelectorAll('.tabs a').forEach(a => { if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    for (const view of ['roadmap', 'changelog', 'feedback']) $(`view-${view}`).hidden = view !== state.view;
    $('lead').innerHTML = esc(t(state.view === 'roadmap' ? 'leadRoadmap' : state.view === 'changelog' ? 'leadChangelog' : 'leadFeedback'));
    if (state.view === 'roadmap') showRoadmap();
    else if (state.view === 'changelog') showChangelog();
    else showFeedback();
  }
  window.addEventListener('hashchange', route);
  // legal.js switches the language; the generated parts follow
  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ['data-lang'] });

  const params = new URLSearchParams(location.search);
  state.open = params.get('id');
  route();
  if (params.get('unsub')) unsubscribeSheet(params.get('unsub'));
  // the board and the changelog need no sign-in; 建议 redraws once it is known
  refreshSession().then(() => { if (state.view === 'feedback') showFeedback(); });
})();
