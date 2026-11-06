/* ============================================================
   90+3 — visitor dashboard
   Reads /api/stats and /api/feed. Aggregate, anonymous, no cookies.
   ============================================================ */
(() => {
  'use strict';

  window.I18N.init();
  document.title = window.I18N.t('dash.docTitle');

  const API = (window.MATCH_API || '').replace(/\/$/, '');
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => window.I18N.t(k, v);

  const FLAGS = {
    MX: '🇲🇽', US: '🇺🇸', ES: '🇪🇸', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪',
    BR: '🇧🇷', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', IN: '🇮🇳', JP: '🇯🇵',
    AU: '🇦🇺', NL: '🇳🇱', PT: '🇵🇹', IT: '🇮🇹', SE: '🇸🇪', PL: '🇵🇱'
  };
  const flag = (c) => (c && FLAGS[String(c).toUpperCase()]) || '🌎';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };

  let last = 0;

  /* ------------------------------ stats ------------------------------ */

  function renderStats(s) {
    last = Date.now();
    set('kVisits', s.visits || 0);
    set('kPlays', s.plays || 0);
    set('kWins', s.wins || 0);
    set('kSigns', s.signs || 0);
    const rate = s.plays ? Math.round((s.wins / s.plays) * 100) : 0;
    set('kRate', rate + '%');

    set('eProjects', s.project_clicks || 0);
    set('eContact', s.contact_clicks || 0);
    set('eShares', s.shares || 0);

    renderFunnel(s.funnel || {});
    renderCountries(s.countries || {});
    renderDevices(s.devices || {});
    renderLangs(s.langs || {});
    renderBench(s.bench || {});
    updateAgo();
  }

  function renderFunnel(f) {
    const stages = ['visit', 'lab_start', 'sub1', 'sub2', 'sub3', 'win', 'sign'];
    const max = Math.max(1, ...stages.map((k) => Number(f[k]) || 0));
    const box = $('funnel');
    if (!box) return;

    const any = stages.some((k) => Number(f[k]) > 0);
    if (!any) {
      box.innerHTML = '<div class="empty">' + esc(t('dash.empty')) + '</div>';
      return;
    }

    box.innerHTML = stages.map((k, i) => {
      const n = Number(f[k]) || 0;
      const prev = i === 0 ? n : (Number(f[stages[i - 1]]) || 0);
      const pct = i === 0 ? 100 : (prev ? Math.round((n / prev) * 100) : 0);
      const w = Math.max(2, Math.round((n / max) * 100));
      const label = t('dash.stage.' + k);
      const sub = i === 0
        ? t('dash.ofVisits', { p: 100 })
        : t('dash.fromPrev', { p: pct });
      return '<div class="funnel-row">' +
        '<div class="funnel-lbl"><span>' + esc(label) + '</span><b>' + n + '</b></div>' +
        '<div class="funnel-track"><i style="width:' + w + '%"></i></div>' +
        '<div class="funnel-sub">' + esc(sub) + '</div>' +
        '</div>';
    }).join('');
  }

  function renderCountries(countries) {
    const box = $('countries');
    if (!box) return;
    const rows = Object.entries(countries)
      .filter(([c]) => c && c !== 'XX')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    if (!rows.length) {
      box.innerHTML = '<div class="empty">' + esc(t('dash.empty')) + '</div>';
      return;
    }
    const max = Math.max(...rows.map((r) => r[1]), 1);
    box.innerHTML = rows.map(([c, n]) =>
      '<div class="bar-row">' +
      '<span class="bar-name">' + flag(c) + ' ' + esc(c) + '</span>' +
      '<span class="bar-track"><i style="width:' + Math.max(3, Math.round((n / max) * 100)) + '%"></i></span>' +
      '<b class="bar-val">' + n + '</b>' +
      '</div>'
    ).join('');
  }

  function renderDevices(d) {
    set('dMobile', d.mobile || 0);
    set('dDesktop', d.desktop || 0);
  }

  function renderLangs(langs) {
    const box = $('langs');
    if (!box) return;
    const rows = Object.entries(langs).filter(([, n]) => n > 0);
    if (!rows.length) {
      box.innerHTML = '<span class="empty-inline">' + esc(t('dash.empty')) + '</span>';
      return;
    }
    box.innerHTML = rows
      .sort((a, b) => b[1] - a[1])
      .map(([l, n]) => '<span class="chip-lang">' + esc(l.toUpperCase()) + ' · ' + n + '</span>')
      .join('');
  }

  const BENCH_ORDER = ['naive', 'indexed', 'uncached', 'cached', 'nplus1', 'batch'];

  function renderBench(bench) {
    const body = $('benchBody');
    if (!body) return;
    const rows = BENCH_ORDER.filter((m) => bench[m] && bench[m].n);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" class="empty">' + esc(t('dash.empty')) + '</td></tr>';
      return;
    }
    body.innerHTML = rows.map((m) => {
      const b = bench[m];
      const avg = b.avgMs == null ? '—' : b.avgMs + ' ms';
      const last = b.lastMs == null ? '—' : b.lastMs + ' ms';
      return '<tr><td class="mode">' + esc(m) + '</td>' +
        '<td class="num">' + b.n + '</td>' +
        '<td class="num">' + avg + '</td>' +
        '<td class="num">' + last + '</td></tr>';
    }).join('');
  }

  /* ------------------------------ feed ------------------------------ */

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
    ul.innerHTML = rows.slice(0, 14).map((ev) => {
      const label = t('t.ev.' + ev.type);
      const who = ev.name ? esc(ev.name) : t('t.anonymous');
      return '<li><span class="flag">' + flag(ev.country) + '</span>' +
        '<span class="who">' + who + '</span>' +
        '<span class="what">' + esc(label === 't.ev.' + ev.type ? ev.type : label) + '</span>' +
        '<span class="when">' + ago(ev.ts) + '</span></li>';
    }).join('');
  }

  /* ------------------------------ refresh ------------------------------ */

  function updateAgo() {
    const el = $('dashUpdated');
    if (!el || !last) return;
    const s = Math.max(0, Math.round((Date.now() - last) / 1000));
    el.textContent = t('dash.updated', { s });
  }

  async function loadStats() {
    try {
      const res = await fetch(API + '/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('stats');
      renderStats(await res.json());
    } catch (e) {
      set('dashUpdated', t('dash.offline'));
    }
  }

  async function loadFeed() {
    try {
      const res = await fetch(API + '/api/feed', { cache: 'no-store' });
      if (!res.ok) throw new Error('feed');
      const data = await res.json();
      renderFeed(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) { /* keep last */ }
  }

  document.addEventListener('langchange', () => {
    document.title = t('dash.docTitle');
    loadStats();
    loadFeed();
  });

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  loadStats();
  loadFeed();
  setInterval(loadStats, 15000);
  setInterval(loadFeed, 12000);
  setInterval(updateAgo, 5000);
})();
