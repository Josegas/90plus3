/* ============================================================
   90+3 — front end
   Real measurements against /api. No fake latency.
   Public leaderboard, live feed, anonymous events, ES/EN.
   ============================================================ */
(() => {
  'use strict';

  window.I18N.init();

  const API = (window.MATCH_API || '').replace(/\/$/, '');
  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = (k, v) => window.I18N.t(k, v);

  const sid = (() => {
    try {
      let s = localStorage.getItem('903-sid');
      if (!s) {
        s = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('903-sid', s);
      }
      return s;
    } catch (e) { return 's_anon'; }
  })();

  const state = {
    you: 0,
    them: 2,
    done: [false, false, false],
    results: [null, null, null],
    matchStart: 0,
    elapsed: 0,
    burst: null,
    signed: false
  };

  /* ------------------------------ utils ------------------------------ */

  let toastTimer = 0;
  function toast(msg, ms = 2600) {
    const el = $('toast');
    if (!el) return;
    el.innerHTML = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';

  // Approximate country from browser locale/timezone. No IP lookup, no cookies.
  const COUNTRY = (() => {
    try {
      const m = String(navigator.language || '').match(/[-_]([A-Za-z]{2})$/);
      if (m) return m[1].toUpperCase();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const map = {
        'America/Mexico_City': 'MX', 'America/Monterrey': 'MX', 'America/Tijuana': 'MX',
        'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL',
        'America/Argentina/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR',
        'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
        'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'Europe/Madrid': 'ES',
        'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
        'Asia/Kolkata': 'IN', 'Asia/Tokyo': 'JP', 'Australia/Sydney': 'AU'
      };
      return map[tz] || '';
    } catch (e) { return ''; }
  })();

  function track(type, meta) {
    if (dnt) return;
    try {
      fetch(API + '/api/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ sid, type, meta: meta || null, lang: window.I18N.lang, country: COUNTRY })
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function setClock() {
    const n = state.done.filter(Boolean).length;
    const label = n === 0 ? '90:00' : '90+' + n;
    const clock = $('mClock');
    if (clock) clock.textContent = label;
  }

  function bumpScore(animate) {
    const you = $('mYou');
    const them = $('mThem');
    if (you) you.textContent = state.you;
    if (them) them.textContent = state.them;
    if (animate && !reduced && you) {
      you.classList.remove('flip');
      void you.offsetWidth;
      you.classList.add('flip');
    }
  }

  /* ------------------------------ api ------------------------------ */

  async function bench(mode) {
    const t0 = performance.now();
    const res = await fetch(API + '/api/bench?mode=' + encodeURIComponent(mode), { cache: 'no-store' });
    const ms = performance.now() - t0;
    if (!res.ok) throw new Error('bench ' + mode + ' failed');
    const data = await res.json();
    return { wall: ms, server: Number(data.serverMs) || 0, data };
  }

  const RECORDED = {
    0: { before: 748.0, after: 0.09 },
    1: { before: 427.4, after: 0.10 },
    2: { before: 221.8, after: 0.27 }
  };

  function fmt(ms) {
    if (ms >= 100) return Math.round(ms) + ' ms';
    if (ms >= 10) return ms.toFixed(1) + ' ms';
    return ms.toFixed(2) + ' ms';
  }

  /* ------------------------------ subs ------------------------------ */

  const RUNNERS = [
    { before: 'naive', after: 'indexed', beforeLabel: 'scan', afterLabel: 'query', event: 'sub1' },
    { before: 'uncached', after: 'cached', beforeLabel: 'recompute', afterLabel: 'cache hit', event: 'sub2' },
    { before: 'nplus1', after: 'batch', beforeLabel: 'N+1', afterLabel: 'batch', event: 'sub3' }
  ];

  function renderResult(i) {
    const el = document.querySelector('.sub-result[data-result="' + i + '"]');
    if (!el) return;
    const r = state.results[i];
    if (!r) {
      el.textContent = t('lab.notMeasured');
      return;
    }
    el.innerHTML = '<s>' + r.beforeLabel + ' ' + fmt(r.before) + '</s>' +
      '<b>→ ' + r.afterLabel + ' ' + fmt(r.after) + '</b>';
  }

  function syncLabels() {
    for (let i = 0; i < 3; i++) {
      const btn = document.querySelector('.sub-btn[data-run="' + i + '"]');
      if (!btn) continue;
      btn.textContent = state.done[i] ? t('t.done') : t('lab.run');
      btn.disabled = !!state.done[i];
      renderResult(i);
    }
  }

  async function runSub(i) {
    if (state.done[i]) return;
    const card = document.querySelector('.sub[data-sub="' + i + '"]');
    const btn = card.querySelector('.sub-btn');
    const out = card.querySelector('.sub-result');

    card.classList.add('running');
    btn.textContent = t('t.working');
    out.textContent = t('t.measuring');

    if (!state.matchStart) {
      state.matchStart = performance.now();
      track('lab_start');
    }

    const spec = RUNNERS[i];
    let before, after, recorded = false;

    try {
      const b = await bench(spec.before);
      const a = await bench(spec.after);
      before = b.server;
      after = a.server;
    } catch (err) {
      before = RECORDED[i].before;
      after = RECORDED[i].after;
      recorded = true;
    }

    state.results[i] = { before, after, beforeLabel: spec.beforeLabel, afterLabel: spec.afterLabel };
    renderResult(i);

    card.classList.remove('running');
    card.classList.add('done');
    btn.textContent = t('t.done');
    btn.disabled = true;

    state.done[i] = true;
    state.you += 1;
    setClock();
    bumpScore(true);
    $('p' + i).classList.add('on');

    track(spec.event, { before: Math.round(before), after: Math.round(after * 100) / 100, recorded });

    if (recorded) {
      toast(t('t.apiOffline'), 4200);
    } else {
      toast(t('t.goal', { a: fmt(before), b: fmt(after) }), 2400);
    }

    if (state.done.every(Boolean)) {
      state.elapsed = (performance.now() - state.matchStart) / 1000;
      track('win', { seconds: Number(state.elapsed.toFixed(2)) });
      setTimeout(openFinale, 850);
    }
  }

  document.querySelectorAll('.sub-btn').forEach((btn) => {
    btn.addEventListener('click', () => runSub(Number(btn.dataset.run)));
  });

  /* ------------------------------ finale ------------------------------ */

  let confettiStop = null;

  async function openFinale() {
    const box = $('finale');
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('finaleKick').textContent = '90+3 · Full time';
    $('finaleSub').textContent = window.I18N.lang === 'es'
      ? 'Le diste la vuelta en tiempo de descuento.'
      : 'You turned it around in stoppage time.';
    $('signBlock').hidden = false;
    $('signedBlock').hidden = true;
    if (!reduced) confettiStop = confetti();
    setTimeout(() => $('managerName').focus(), 400);

    try {
      const res = await fetch(API + '/api/burst', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ n: 500, concurrency: 10 })
      });
      if (!res.ok) throw new Error('burst failed');
      const data = await res.json();
      state.burst = data;
      $('fBurst').textContent = data.okCount + '/' + data.total;
      $('fP50').textContent = data.p50 + ' ms';
      $('fP95').textContent = data.p95 + ' ms';
      $('finaleSub').textContent = t('t.finaleSub', {
        ok: data.okCount, n: data.total, s: data.seconds, fail: data.failCount
      });
    } catch (e) {
      $('fBurst').textContent = '500/500';
      $('fP50').textContent = '8.2 ms';
      $('fP95').textContent = '8.4 ms';
      $('finaleSub').textContent = t('t.finaleSubRecorded');
    }
  }

  function closeFinale() {
    $('finale').classList.remove('open');
    $('finale').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (confettiStop) { confettiStop(); confettiStop = null; }
  }

  $('closeFinale').addEventListener('click', closeFinale);
  $('closeFinale2').addEventListener('click', closeFinale);
  $('finale').addEventListener('click', (e) => { if (e.target.id === 'finale') closeFinale(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('finale').classList.contains('open')) closeFinale();
  });

  $('signBtn').addEventListener('click', signReport);
  $('managerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') signReport();
  });

  async function signReport() {
    if (state.signed) return;
    const input = $('managerName');
    const name = (input.value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    const btn = $('signBtn');
    btn.disabled = true;
    btn.textContent = '…';

    const payload = {
      sid,
      name: name || t('t.noName'),
      score: state.you + '-' + state.them,
      seconds: Number(state.elapsed.toFixed(2)),
      lang: window.I18N.lang,
      country: COUNTRY
    };

    let rank = null;
    let total = null;
    try {
      const res = await fetch(API + '/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('report failed');
      const data = await res.json();
      rank = data.rank;
      total = data.total;
      state.total = data.total;
      state.signed = true;
    } catch (e) {
      const local = JSON.parse(localStorage.getItem('903-league') || '[]');
      local.push(payload);
      local.sort((a, b) => a.seconds - b.seconds);
      localStorage.setItem('903-league', JSON.stringify(local.slice(0, 50)));
      rank = local.findIndex((r) => r.seconds === payload.seconds && r.name === payload.name) + 1;
      total = local.length;
      toast(t('t.offlineSaved'), 3200);
    }

    $('signBlock').hidden = true;
    $('signedBlock').hidden = false;
    $('signedRank').textContent = '#' + (rank || 1);
    $('signedText').textContent = (total === 1)
      ? t('t.signedOne', { name: payload.name })
      : t('t.signed', { name: payload.name, n: total || 1 });
    btn.disabled = false;
    btn.textContent = t('finale.signBtn');
    loadLeague();
    loadStats();
    loadFeed();
  }

  /* ------------------------------ league / feed ------------------------------ */

  const FLAGS = {
    MX: '🇲🇽', US: '🇺🇸', ES: '🇪🇸', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪',
    BR: '🇧🇷', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', IN: '🇮🇳', JP: '🇯🇵',
    AU: '🇦🇺', NL: '🇳🇱', PT: '🇵🇹', IT: '🇮🇹', SE: '🇸🇪', PL: '🇵🇱'
  };
  const flag = (c) => (c && FLAGS[String(c).toUpperCase()]) || '🌎';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function renderLeague(rows) {
    const body = $('leagueBody');
    const count = $('leagueCount');
    if (count) count.textContent = rows.length + (rows.length === 1 ? ' run' : ' runs');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty">' + esc(t('lab.noRuns')) + '</td></tr>';
      return;
    }
    body.innerHTML = rows.slice(0, 10).map((r, i) => {
      const secs = Number(r.seconds) || 0;
      return '<tr>' +
        '<td class="pos">' + (i + 1) + '</td>' +
        '<td class="nm">' + esc(r.name || t('t.anonymous')) + '</td>' +
        '<td class="cty">' + flag(r.country) + ' <span class="cc">' + esc(r.country || '—') + '</span></td>' +
        '<td class="mono" style="color:#cfdae6">' + esc(r.score || '3-2') + '</td>' +
        '<td class="time">' + secs.toFixed(2) + 's</td>' +
        '</tr>';
    }).join('');
  }

  function renderHeroTop(rows) {
    const ol = $('heroTop');
    if (!ol) return;
    if (!rows.length) {
      ol.innerHTML = '<li class="empty-row">' + esc(t('lab.noRuns')) + '</li>';
      return;
    }
    ol.innerHTML = rows.slice(0, 3).map((r, i) =>
      '<li><span class="p">' + (i + 1) + '</span><span>' + esc(r.name || t('t.anonymous')) +
      ' ' + flag(r.country) + '</span><span class="tm">' + (Number(r.seconds) || 0).toFixed(2) + 's</span></li>'
    ).join('');
  }

  async function loadLeague() {
    try {
      const res = await fetch(API + '/api/league', { cache: 'no-store' });
      if (!res.ok) throw new Error('league');
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      renderLeague(rows);
      renderHeroTop(rows);
    } catch (e) {
      const local = JSON.parse(localStorage.getItem('903-league') || '[]');
      renderLeague(local);
      renderHeroTop(local);
    }
  }

  function ago(ts) {
    const s = Math.max(0, (Date.now() - Number(ts || Date.now())) / 1000);
    if (s < 45) return t('t.now');
    if (s < 3600) return t('t.minAgo', { n: Math.round(s / 60) });
    return new Date(Number(ts)).toLocaleTimeString(window.I18N.lang, { hour: '2-digit', minute: '2-digit' });
  }

  function renderFeed(rows) {
    const ul = $('feedList');
    if (!ul) return;
    if (!rows.length) {
      ul.innerHTML = '<li class="empty-row">' + esc(t('lab.feedEmpty')) + '</li>';
      return;
    }
    ul.innerHTML = rows.slice(0, 12).map((ev) => {
      const label = t('t.ev.' + ev.type);
      const who = ev.name ? esc(ev.name) : t('t.anonymous');
      return '<li><span class="flag">' + flag(ev.country) + '</span>' +
        '<span class="who">' + who + '</span>' +
        '<span class="what">' + esc(label === 't.ev.' + ev.type ? ev.type : label) + '</span>' +
        '<span class="when">' + ago(ev.ts) + '</span></li>';
    }).join('');
  }

  async function loadFeed() {
    try {
      const res = await fetch(API + '/api/feed', { cache: 'no-store' });
      if (!res.ok) throw new Error('feed');
      const data = await res.json();
      renderFeed(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      renderFeed([]);
    }
  }

  function setStat(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function renderStats(s) {
    if (!s) return;
    setStat('heroPlays', s.plays || 0);
    setStat('heroWins', s.wins || 0);
    setStat('heroP95', (s.bestP95 ? s.bestP95 + ' ms' : '—'));
    setStat('labPlays', s.plays || 0);
    setStat('labWins', s.wins || 0);
    setStat('onlineNow', s.online || 1);
    setStat('labOnline', s.online || 1);
  }

  async function loadStats() {
    try {
      const res = await fetch(API + '/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('stats');
      const data = await res.json();
      renderStats(data);
    } catch (e) { /* keep placeholders */ }
  }

  /* ------------------------------ share ------------------------------ */

  async function share() {
    const url = location.origin + location.pathname + '?ref=share';
    const text = t('t.shareText', { s: (state.elapsed || 0).toFixed(2) });
    track('share');
    if (navigator.share) {
      try {
        await navigator.share({ title: t('t.shareTitle'), text, url });
        return;
      } catch (e) { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      toast(t('t.copied'));
    } catch (e) {
      toast(url);
    }
  }

  const shareBtn = $('shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', share);
  const shareBtn2 = $('shareBtn2');
  if (shareBtn2) shareBtn2.addEventListener('click', share);

  /* ------------------------------ confetti ------------------------------ */

  function confetti() {
    const canvas = $('confetti');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#ffc24b', '#ff9d2e', '#4fe08a', '#4fd8c8', '#e9eff6'];
    const parts = Array.from({ length: 150 }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.7,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1.8 + Math.random() * 3.4,
      s: 3 + Math.random() * 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.22,
      c: colors[(Math.random() * colors.length) | 0]
    }));

    let raf = 0;
    let alive = true;
    const start = performance.now();

    function frame(now) {
      if (!alive) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.012; p.r += p.vr;
        if (p.y > h + 30) { p.y = -20; p.x = Math.random() * w; p.vy = 1.8 + Math.random() * 2.6; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = now - start > 6500 ? 0.35 : 0.9;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    };
  }

  /* ------------------------------ extras ------------------------------ */

  const ticker = $('ticker');
  if (ticker) ticker.innerHTML += ticker.innerHTML;

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // Section views (once each per page load).
  const seen = new Set();
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const id = en.target.id;
        if (en.isIntersecting && id && !seen.has(id)) {
          seen.add(id);
          if (id !== 'top') track('section', { id });
        }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('section[id]').forEach((s) => so.observe(s));
  }

  // Project + contact clicks.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a.classList.contains('hl-link') && /^https?:/.test(a.href)) {
      track('project', { href: a.href });
    } else if (a.classList.contains('clink')) {
      track('contact', { kind: a.href.startsWith('mailto:') ? 'email' : 'link' });
    }
  });

  // Language picks.
  document.addEventListener('langpick', (e) => {
    track('lang', { to: e.detail.lang });
    syncLabels();
    loadLeague();
    loadFeed();
    if (state.signed) {
      const n = state.total || 1;
      const nm = ($('managerName').value || t('t.noName')).trim();
      $('signedText').textContent = n === 1
        ? t('t.signedOne', { name: nm })
        : t('t.signed', { name: nm, n });
    }
  });

  // "M" jumps to the lab. Never while typing.
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') {
      document.getElementById('lab').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      toast(t('t.whistle'), 2600);
    }
  });

  // Init.
  $('managerName').placeholder = t('t.placeholder');
  setClock();
  bumpScore(false);
  syncLabels();
  loadStats();
  loadLeague();
  loadFeed();
  track('visit', { ref: document.referrer || null, w: window.innerWidth });

  setInterval(loadStats, 15000);
  setInterval(loadLeague, 20000);
  setInterval(loadFeed, 12000);
})();
