'use strict';

/**
 * 90+3 — local API (dev).
 * Same contract as the Lambda version; JSON storage instead of DynamoDB.
 *
 *   GET  /api/bench?mode=naive|indexed|uncached|cached|nplus1|batch
 *   POST /api/burst    { n, concurrency }
 *   POST /api/report   { sid, name, score, seconds, lang }
 *   GET  /api/league
 *   GET  /api/feed
 *   POST /api/event    { sid, type, meta, lang }
 *   GET  /api/stats
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8101);
const ROOT = path.join(__dirname, '..', 'site');
const DATA_FILE = path.join(__dirname, 'data.json');

/* ------------------------------------------------------------------ */
/* Workloads                                                          */
/* ------------------------------------------------------------------ */

const N = 2_000_000;
const rows = new Array(N);
for (let i = 0; i < N; i++) {
  rows[i] = {
    pk: 'match#' + (i % 4096),
    sk: 'row#' + i,
    player: 'p' + (i % 997),
    value: (i * 2654435761) % 100000
  };
}

const index = new Map();
for (let i = 0; i < N; i += 1000) index.set(rows[i].sk, rows[i]);
const TARGET = 'row#' + (N - 1000);

const HEAVY_N = 400_000;
const heavy = new Array(HEAVY_N);
for (let i = 0; i < HEAVY_N; i++) heavy[i] = { id: i, score: (i * 7919) % 100000 };
let CACHED_SUM = 0;
for (let i = 0; i < HEAVY_N; i++) CACHED_SUM += heavy[i].score;

const BATCH = Array.from({ length: 200 }, (_, i) => ({
  id: i, name: 'player-' + i, score: (i * 31) % 1000
}));

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */

const EMPTY = { league: [], events: [], stats: {}, sessions: {}, names: {}, day: '' };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const base = Object.assign({}, EMPTY, d);
    if (base.day !== today()) {
      // Keep all-time counters, reset the daily board.
      base.league = [];
      base.day = today();
      base.stats = base.stats || {};
      base.stats.plays = 0;
      base.stats.wins = 0;
      base.stats.bestP95 = null;
    }
    return base;
  } catch {
    return Object.assign({}, EMPTY, { day: today() });
  }
}

function save(db) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); } catch { /* ignore */ }
}

function bump(db, key, by = 1) {
  db.stats[key] = (db.stats[key] || 0) + by;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function country(req, body) {
  return String(
    req.headers['cloudfront-viewer-country'] ||
    req.headers['x-country'] ||
    (body && body.country) ||
    'MX'
  ).toUpperCase().slice(0, 2);
}

function langOf(v) {
  return v === 'es' ? 'es' : 'en';
}

function nameFor(db, sid) {
  return db.names[sid] || '';
}

function touch(db, sid) {
  if (!sid) return;
  db.sessions[sid] = Date.now();
}

function online(db) {
  const cut = Date.now() - 90 * 1000;
  return Object.keys(db.sessions).filter((s) => db.sessions[s] > cut).length || 1;
}

/* ------------------------------------------------------------------ */
/* Bench                                                              */
/* ------------------------------------------------------------------ */

const MODES = {
  naive() {
    let found = null;
    for (let k = 0; k < 30; k++) found = rows.find((r) => r.sk === TARGET);
    return { rowsScanned: N, found: !!found };
  },
  indexed() {
    const found = index.get(TARGET);
    return { rowsScanned: 1, found: !!found };
  },
  uncached() {
    let sum = 0;
    for (let k = 0; k < 180; k++) for (let i = 0; i < HEAVY_N; i++) sum += heavy[i].score;
    return { computed: HEAVY_N * 180, sum };
  },
  cached() {
    return { computed: 0, sum: CACHED_SUM };
  },
  async nplus1() {
    let total = 0;
    for (let i = 0; i < BATCH.length; i++) {
      await sleep(1);
      total += BATCH[i].score;
    }
    return { queries: BATCH.length, total };
  },
  batch() {
    let total = 0;
    for (let i = 0; i < BATCH.length; i++) total += BATCH[i].score;
    return { queries: 1, total };
  }
};

async function handleBench(u, res) {
  const mode = u.searchParams.get('mode') || 'indexed';
  const fn = MODES[mode];
  if (!fn) return send(res, 400, { ok: false, error: 'unknown mode: ' + mode });

  const t0 = process.hrtime.bigint();
  const payload = await fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;

  const db = load();
  db.stats.bench = db.stats.bench || {};
  const b = db.stats.bench[mode] || { n: 0, totalMs: 0 };
  b.n += 1;
  b.totalMs += ms;
  b.lastMs = +ms.toFixed(2);
  db.stats.bench[mode] = b;
  save(db);

  send(res, 200, { ok: true, mode, serverMs: +ms.toFixed(2), ...payload });
}

async function handleBurst(req, res) {
  const body = JSON.parse((await readBody(req)) || '{}');
  const n = Math.max(1, Math.min(2000, Number(body.n) || 500));
  const concurrency = Math.max(1, Math.min(50, Number(body.concurrency) || 10));

  const times = [];
  let okCount = 0;
  let failCount = 0;
  let next = 0;
  const t0 = process.hrtime.bigint();

  async function worker() {
    while (next < n) {
      next++;
      const s = process.hrtime.bigint();
      try {
        const row = index.get(TARGET);
        JSON.stringify(row);
        await sleep(8);
        times.push(Number(process.hrtime.bigint() - s) / 1e6);
        okCount++;
      } catch {
        failCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
  times.sort((a, b) => a - b);
  const p95 = +pct(times, 95).toFixed(2);

  const db = load();
  db.stats.bestP95 = db.stats.bestP95 ? Math.min(db.stats.bestP95, p95) : p95;
  db.stats.bursts = (db.stats.bursts || 0) + 1;
  save(db);

  send(res, 200, {
    ok: true,
    total: n,
    concurrency,
    okCount,
    failCount,
    seconds: +(totalMs / 1000).toFixed(2),
    p50: +pct(times, 50).toFixed(2),
    p95
  });
}

/* ------------------------------------------------------------------ */
/* Events / report / league / feed / stats                            */
/* ------------------------------------------------------------------ */

async function handleEvent(req, res) {
  const body = JSON.parse((await readBody(req)) || '{}');
  const sid = String(body.sid || '').slice(0, 64);
  const type = String(body.type || '').slice(0, 24);
  if (!sid || !type) return send(res, 400, { ok: false, error: 'sid and type required' });

  const db = load();
  touch(db, sid);

  if (type === 'visit') {
    if (!db.stats.seen || !db.stats.seen[sid]) {
      db.stats.seen = db.stats.seen || {};
      db.stats.seen[sid] = 1;
      bump(db, 'visits');
    }
    db.stats.langs = db.stats.langs || {};
    db.stats.langs[langOf(body.lang)] = (db.stats.langs[langOf(body.lang)] || 0) + 1;
    const w = Number(body.meta && body.meta.w) || 0;
    if (w) {
      db.stats.devices = db.stats.devices || { mobile: 0, desktop: 0 };
      db.stats.devices[w < 820 ? 'mobile' : 'desktop']++;
    }
    db.stats.countries = db.stats.countries || {};
    const c = country(req, body);
    db.stats.countries[c] = (db.stats.countries[c] || 0) + 1;
  }

  if (type === 'lab_start') bump(db, 'plays');
  if (type === 'win') bump(db, 'wins');
  if (type === 'sub1' || type === 'sub2' || type === 'sub3') bump(db, 'funnel_' + type);
  if (type === 'project') bump(db, 'project_clicks');
  if (type === 'contact') bump(db, 'contact_clicks');
  if (type === 'share') bump(db, 'shares');

  const feedTypes = ['lab_start', 'sub1', 'sub2', 'sub3', 'win', 'sign', 'project', 'contact', 'share', 'lang'];
  if (feedTypes.includes(type)) {
    db.events.push({
      type,
      sid,
      name: nameFor(db, sid),
      country: country(req, body),
      lang: langOf(body.lang),
      ts: Date.now()
    });
    db.events = db.events.slice(-200);
  }

  save(db);
  send(res, 200, { ok: true });
}

async function handleReport(req, res) {
  const body = JSON.parse((await readBody(req)) || '{}');
  const sid = String(body.sid || '').slice(0, 64);
  const name = String(body.name || 'Anonymous').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Anonymous';
  const score = String(body.score || '3-2').slice(0, 8);
  const seconds = Math.max(0, Math.min(3600, Number(body.seconds) || 0));
  const c = country(req, body);
  const db = load();

  touch(db, sid);
  if (sid) db.names[sid] = name;

  const entry = { name, score, seconds, country: c, lang: langOf(body.lang), ts: Date.now() };
  db.league.push(entry);
  db.league.sort((a, b) => a.seconds - b.seconds);
  db.league = db.league.slice(0, 100);
  bump(db, 'signs');
  db.events.push({ type: 'sign', sid, name, country: c, lang: langOf(body.lang), ts: Date.now() });
  db.events = db.events.slice(-200);
  save(db);

  const rank = db.league.findIndex((r) => r.ts === entry.ts) + 1;
  send(res, 200, { ok: true, rank, total: db.league.length });
}

function handleLeague(res) {
  const db = load();
  send(res, 200, { ok: true, rows: db.league.slice(0, 20), total: db.league.length });
}

function handleFeed(res) {
  const db = load();
  const rows = db.events.slice(-14).reverse().map((e) => ({
    type: e.type, name: e.name || '', country: e.country, ts: e.ts
  }));
  send(res, 200, { ok: true, rows });
}

function handleStats(res) {
  const db = load();
  const s = db.stats || {};
  send(res, 200, {
    ok: true,
    plays: s.plays || 0,
    wins: s.wins || 0,
    visits: s.visits || 0,
    signs: s.signs || 0,
    shares: s.shares || 0,
    project_clicks: s.project_clicks || 0,
    contact_clicks: s.contact_clicks || 0,
    bestP95: s.bestP95 || null,
    online: online(db),
    funnel: {
      visit: s.visits || 0,
      lab_start: s.plays || 0,
      sub1: s.funnel_sub1 || 0,
      sub2: s.funnel_sub2 || 0,
      sub3: s.funnel_sub3 || 0,
      win: s.wins || 0,
      sign: s.signs || 0
    },
    langs: s.langs || {},
    countries: s.countries || {},
    devices: s.devices || { mobile: 0, desktop: 0 },
    bench: Object.fromEntries(Object.entries(s.bench || {}).map(([k, v]) => [k, {
      n: v.n, avgMs: v.n ? +(v.totalMs / v.n).toFixed(2) : null, lastMs: v.lastMs
    }]))
  });
}

/* ------------------------------------------------------------------ */
/* Static                                                             */
/* ------------------------------------------------------------------ */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function serveStatic(u, res) {
  let rel = decodeURIComponent(u.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    res.end(data);
  });
}

/* ------------------------------------------------------------------ */
/* Server                                                             */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }

  try {
    if (u.pathname === '/api/bench') return await handleBench(u, res);
    if (u.pathname === '/api/burst' && req.method === 'POST') return await handleBurst(req, res);
    if (u.pathname === '/api/report' && req.method === 'POST') return await handleReport(req, res);
    if (u.pathname === '/api/league') return handleLeague(res);
    if (u.pathname === '/api/feed') return handleFeed(res);
    if (u.pathname === '/api/event' && req.method === 'POST') return await handleEvent(req, res);
    if (u.pathname === '/api/stats') return handleStats(res);
    return serveStatic(u, res);
  } catch (err) {
    send(res, 500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, () => {
  console.log(`90+3 dev on http://127.0.0.1:${PORT}`);
  console.log(`rows: ${N.toLocaleString()} · heavy: ${HEAVY_N.toLocaleString()}`);
});
