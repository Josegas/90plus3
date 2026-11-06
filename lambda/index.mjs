/* ============================================================
   90+3 — public API
   Amplify → API Gateway (HTTP API) → Lambda (Node 20) → DynamoDB
   Same contract as dev/server.js. Every number is measured.
   ============================================================ */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

const ROWS = process.env.ROWS_TABLE || '903-rows';
const LEAGUE = process.env.LEAGUE_TABLE || '903-league';
const EVENTS = process.env.EVENTS_TABLE || '903-events';

const TARGET_SK = 'row#49999';
const TARGET_GSI = 'player#p-target';
const BATCH_KEYS = Array.from({ length: 200 }, (_, i) => ({
  pk: 'match#' + (i % 256),
  sk: 'row#' + i
}));

/* ------------------------------ helpers ------------------------------ */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400'
};

const json = (code, obj) => ({
  statusCode: code,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS },
  body: JSON.stringify(obj)
});

const pct = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
};

const today = () => new Date().toISOString().slice(0, 10);
const langOf = (v) => (v === 'es' ? 'es' : 'en');

function countryOf(event, body) {
  const h = event.headers || {};
  const raw =
    h['cloudfront-viewer-country'] ||
    h['x-country'] ||
    (body && body.country) ||
    'XX';
  const c = String(raw).toUpperCase().slice(0, 2);
  return /^[A-Z]{2}$/.test(c) ? c : 'XX';
}

function nameOf(v) {
  const s = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return s || 'Anonymous';
}

const sidOf = (v) => String(v || '').slice(0, 64);

/* ------------------------------ metrics (EMF) ------------------------------ */

function emit(mode, ms, extra = {}) {
  console.log(JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: '90plus3',
        Dimensions: [['Mode']],
        Metrics: [
          { Name: 'ServerMs', Unit: 'Milliseconds' },
          { Name: 'Calls', Unit: 'Count' }
        ]
      }]
    },
    Mode: mode,
    ServerMs: ms,
    Calls: 1,
    ...extra
  }));
}

/* ------------------------------ workloads ------------------------------ */

async function benchNaive() {
  let scanned = 0;
  let found = null;
  let key;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: ROWS,
      FilterExpression: 'sk = :t',
      ExpressionAttributeValues: { ':t': TARGET_SK },
      ProjectionExpression: 'pk, sk',
      ExclusiveStartKey: key
    }));
    scanned += res.ScannedCount || 0;
    if (res.Items && res.Items.length) found = res.Items[0];
    key = res.LastEvaluatedKey;
  } while (key);
  return { rowsScanned: scanned, found: !!found };
}

async function benchIndexed() {
  const res = await ddb.send(new QueryCommand({
    TableName: ROWS,
    IndexName: 'byPlayer',
    KeyConditionExpression: 'gsi1pk = :p',
    ExpressionAttributeValues: { ':p': TARGET_GSI },
    Limit: 1
  }));
  return { rowsScanned: res.Count || 0, found: !!(res.Items && res.Items.length) };
}

async function benchUncached() {
  let sum = 0;
  let count = 0;
  let key;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: ROWS,
      FilterExpression: 'begins_with(sk, :r)',
      ExpressionAttributeValues: { ':r': 'row#' },
      ProjectionExpression: 'score',
      ExclusiveStartKey: key
    }));
    for (const it of res.Items || []) { sum += Number(it.score) || 0; count++; }
    key = res.LastEvaluatedKey;
  } while (key);

  // Recompute stores the result: the next read can be cached.
  await ddb.send(new PutCommand({
    TableName: ROWS,
    Item: { pk: 'meta', sk: 'aggregate', sum, count, computedAt: Date.now() }
  }));

  return { computed: count, sum };
}

async function benchCached() {
  const res = await ddb.send(new GetCommand({
    TableName: ROWS,
    Key: { pk: 'meta', sk: 'aggregate' }
  }));
  const item = res.Item || { sum: 0, count: 0 };
  return { computed: 0, sum: item.sum, count: item.count, cached: true };
}

async function benchNPlusOne() {
  let total = 0;
  for (const k of BATCH_KEYS) {
    const res = await ddb.send(new GetCommand({ TableName: ROWS, Key: k }));
    if (res.Item) total += Number(res.Item.score) || 0;
  }
  return { queries: BATCH_KEYS.length, total };
}

async function benchBatch() {
  let total = 0;
  let queries = 0;
  for (let i = 0; i < BATCH_KEYS.length; i += 100) {
    const chunk = BATCH_KEYS.slice(i, i + 100);
    queries++;
    let pending = chunk;
    while (pending.length) {
      const res = await ddb.send(new BatchGetCommand({
        RequestItems: { [ROWS]: { Keys: pending } }
      }));
      const items = (res.Responses && res.Responses[ROWS]) || [];
      for (const it of items) total += Number(it.score) || 0;
      pending = (res.UnprocessedKeys && res.UnprocessedKeys[ROWS] && res.UnprocessedKeys[ROWS].Keys) || [];
    }
  }
  return { queries, total };
}

const MODES = {
  naive: benchNaive,
  indexed: benchIndexed,
  uncached: benchUncached,
  cached: benchCached,
  nplus1: benchNPlusOne,
  batch: benchBatch
};

async function recordBench(mode, ms) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: EVENTS,
      Key: { pk: 'bench', sk: mode },
      UpdateExpression: 'ADD #n :one, totalMs :ms SET lastMs = :ms, updatedAt = :now',
      ExpressionAttributeNames: { '#n': 'n' },
      ExpressionAttributeValues: { ':one': 1, ':ms': Math.round(ms * 100) / 100, ':now': Date.now() }
    }));
  } catch (e) { /* metrics must never break the request */ }
}

async function handleBench(qs) {
  const mode = (qs && qs.mode) || 'indexed';
  const fn = MODES[mode];
  if (!fn) return json(400, { ok: false, error: 'unknown mode: ' + mode });

  const t0 = process.hrtime.bigint();
  const payload = await fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;

  emit(mode, ms);
  recordBench(mode, ms).catch(() => {});
  return json(200, { ok: true, mode, serverMs: +ms.toFixed(2), ...payload });
}

/* ------------------------------ burst ------------------------------ */

async function handleBurst(body) {
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
      const i = (next - 1) % 200;
      try {
        const res = await ddb.send(new GetCommand({
          TableName: ROWS,
          Key: { pk: 'match#' + i, sk: 'row#' + i },
          ConsistentRead: false
        }));
        if (!res.Item) throw new Error('miss');
        times.push(Number(process.hrtime.bigint() - s) / 1e6);
        okCount++;
      } catch (e) {
        failCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
  times.sort((a, b) => a - b);
  const p50 = +pct(times, 50).toFixed(2);
  const p95 = +pct(times, 95).toFixed(2);

  try {
    await ddb.send(new UpdateCommand({
      TableName: EVENTS,
      Key: { pk: 'stats', sk: 'global' },
      UpdateExpression: 'ADD bursts :one SET bestP95 = if_not_exists(bestP95, :p95)',
      ExpressionAttributeValues: { ':one': 1, ':p95': p95 }
    }));
    // keep the best (lowest) p95 seen
    await ddb.send(new UpdateCommand({
      TableName: EVENTS,
      Key: { pk: 'stats', sk: 'global' },
      UpdateExpression: 'SET bestP95 = :p95',
      ConditionExpression: 'bestP95 > :p95',
      ExpressionAttributeValues: { ':p95': p95 }
    })).catch(() => {});
  } catch (e) { /* ignore */ }

  emit('burst', totalMs, { okCount, failCount, p95 });

  return json(200, {
    ok: true, total: n, concurrency, okCount, failCount,
    seconds: +(totalMs / 1000).toFixed(2), p50, p95
  });
}

/* ------------------------------ events ------------------------------ */

const FEED_TYPES = ['lab_start', 'sub1', 'sub2', 'sub3', 'win', 'sign', 'project', 'contact', 'share', 'lang'];

async function handleEvent(body, event) {
  const sid = sidOf(body.sid);
  const type = String(body.type || '').slice(0, 24);
  if (!sid || !type) return json(400, { ok: false, error: 'sid and type required' });

  const now = Date.now();
  const country = countryOf(event, body);
  const lang = langOf(body.lang);

  const names = {};
  const values = { ':one': 1, ':now': now };
  const adds = [];

  const bump = (key) => {
    const k = key.replace(/[^a-zA-Z0-9_]/g, '_');
    names['#' + k] = key;
    adds.push('#' + k + ' :one');
  };

  if (type === 'visit') {
    bump('visits');
    const lk = 'lang_' + lang;
    bump(lk);
    const w = Number(body.meta && body.meta.w) || 0;
    if (w) bump(w < 820 ? 'device_mobile' : 'device_desktop');
    const ck = 'country_' + country;
    bump(ck);
  }
  if (type === 'lab_start') bump('plays');
  if (type === 'win') bump('wins');
  if (type === 'sub1' || type === 'sub2' || type === 'sub3') bump('funnel_' + type);
  if (type === 'sign') bump('signs');
  if (type === 'project') bump('project_clicks');
  if (type === 'contact') bump('contact_clicks');
  if (type === 'share') bump('shares');

  if (adds.length) {
    await ddb.send(new UpdateCommand({
      TableName: EVENTS,
      Key: { pk: 'stats', sk: 'global' },
      UpdateExpression: 'SET updatedAt = :now ADD ' + adds.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    }));
  }

  // presence (TTL) — approximate "online now"
  await ddb.send(new PutCommand({
    TableName: EVENTS,
    Item: { pk: 'presence', sk: sid, expires: Math.floor(now / 1000) + 120, seenAt: now }
  }));

  if (FEED_TYPES.includes(type)) {
    await ddb.send(new PutCommand({
      TableName: EVENTS,
      Item: {
        pk: 'evt',
        sk: String(now).padStart(13, '0') + '#' + Math.random().toString(36).slice(2, 7),
        type, sid, country, lang, ts: now,
        name: body.name ? nameOf(body.name) : '',
        expires: Math.floor(now / 1000) + 7 * 86400
      }
    }));
  }

  return json(200, { ok: true });
}

/* ------------------------------ report / league ------------------------------ */

async function handleReport(body, event) {
  const sid = sidOf(body.sid);
  const name = nameOf(body.name);
  const score = String(body.score || '3-2').slice(0, 8);
  const seconds = Math.max(0, Math.min(3600, Number(body.seconds) || 0));
  const country = countryOf(event, body);
  const lang = langOf(body.lang);
  const now = Date.now();
  const day = today();

  const pad = String(Math.round(seconds * 100)).padStart(8, '0');
  const sk = 'run#' + pad + '#' + String(now).padStart(13, '0') + '#' + Math.random().toString(36).slice(2, 6);

  await ddb.send(new PutCommand({
    TableName: LEAGUE,
    Item: { pk: 'day#' + day, sk, name, score, seconds, country, lang, ts: now, sid }
  }));

  // rank = how many finished faster today, + 1
  const before = await ddb.send(new QueryCommand({
    TableName: LEAGUE,
    KeyConditionExpression: 'pk = :d AND sk < :k',
    ExpressionAttributeValues: { ':d': 'day#' + day, ':k': sk },
    Select: 'COUNT'
  }));
  const rank = (before.Count || 0) + 1;

  const total = await ddb.send(new QueryCommand({
    TableName: LEAGUE,
    KeyConditionExpression: 'pk = :d',
    ExpressionAttributeValues: { ':d': 'day#' + day },
    Select: 'COUNT'
  }));

  await ddb.send(new UpdateCommand({
    TableName: EVENTS,
    Key: { pk: 'stats', sk: 'global' },
    UpdateExpression: 'ADD signs :one',
    ExpressionAttributeValues: { ':one': 1 }
  })).catch(() => {});

  await ddb.send(new PutCommand({
    TableName: EVENTS,
    Item: {
      pk: 'evt',
      sk: String(now).padStart(13, '0') + '#' + Math.random().toString(36).slice(2, 7),
      type: 'sign', sid, name, country, lang, ts: now,
      expires: Math.floor(now / 1000) + 7 * 86400
    }
  })).catch(() => {});

  return json(200, { ok: true, rank, total: total.Count || 0 });
}

async function handleLeague() {
  const res = await ddb.send(new QueryCommand({
    TableName: LEAGUE,
    KeyConditionExpression: 'pk = :d',
    ExpressionAttributeValues: { ':d': 'day#' + today() },
    ScanIndexForward: true,
    Limit: 20
  }));
  const rows = (res.Items || []).map((r) => ({
    name: r.name, score: r.score, seconds: r.seconds, country: r.country, lang: r.lang, ts: r.ts
  }));
  return json(200, { ok: true, rows, total: rows.length });
}

async function handleFeed() {
  const res = await ddb.send(new QueryCommand({
    TableName: EVENTS,
    KeyConditionExpression: 'pk = :e',
    ExpressionAttributeValues: { ':e': 'evt' },
    ScanIndexForward: false,
    Limit: 14
  }));
  const rows = (res.Items || []).map((e) => ({
    type: e.type, name: e.name || '', country: e.country, ts: e.ts
  }));
  return json(200, { ok: true, rows });
}

async function handleStats() {
  const benchModes = ['naive', 'indexed', 'uncached', 'cached', 'nplus1', 'batch'];
  const [statsRes, presenceRes, benchRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: EVENTS, Key: { pk: 'stats', sk: 'global' } })),
    ddb.send(new QueryCommand({
      TableName: EVENTS,
      KeyConditionExpression: 'pk = :p',
      FilterExpression: '#e > :now',
      ExpressionAttributeNames: { '#e': 'expires' },
      ExpressionAttributeValues: { ':p': 'presence', ':now': Math.floor(Date.now() / 1000) },
      ProjectionExpression: 'sk',
      Limit: 500
    })),
    ddb.send(new BatchGetCommand({
      RequestItems: { [EVENTS]: { Keys: benchModes.map((m) => ({ pk: 'bench', sk: m })) } }
    }))
  ]);

  const s = statsRes.Item || {};
  const online = Math.max(1, (presenceRes.Items || []).length);

  const langs = {};
  const countries = {};
  Object.keys(s).forEach((k) => {
    if (k.startsWith('lang_')) langs[k.slice(5)] = s[k];
    if (k.startsWith('country_')) countries[k.slice(8)] = s[k];
  });

  return json(200, {
    ok: true,
    plays: s.plays || 0,
    wins: s.wins || 0,
    visits: s.visits || 0,
    signs: s.signs || 0,
    shares: s.shares || 0,
    project_clicks: s.project_clicks || 0,
    contact_clicks: s.contact_clicks || 0,
    bestP95: s.bestP95 || null,
    online,
    funnel: {
      visit: s.visits || 0,
      lab_start: s.plays || 0,
      sub1: s.funnel_sub1 || 0,
      sub2: s.funnel_sub2 || 0,
      sub3: s.funnel_sub3 || 0,
      win: s.wins || 0,
      sign: s.signs || 0
    },
    langs,
    countries,
    devices: {
      mobile: s.device_mobile || 0,
      desktop: s.device_desktop || 0
    },
    bench: Object.fromEntries(
      ((benchRes.Responses && benchRes.Responses[EVENTS]) || []).map((b) => [b.sk, {
        n: b.n || 0,
        avgMs: b.n ? +(b.totalMs / b.n).toFixed(2) : null,
        lastMs: b.lastMs == null ? null : b.lastMs
      }])
    )
  });
}

/* ------------------------------ router ------------------------------ */

export async function handler(event) {
  const method = event.requestContext && event.requestContext.http && event.requestContext.http.method
    ? event.requestContext.http.method
    : (event.httpMethod || 'GET');

  const rawPath = event.rawPath || event.path || '/';
  const qs = event.queryStringParameters || {};

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  let body = {};
  if (event.body) {
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = JSON.parse(raw || '{}');
    } catch (e) {
      return json(400, { ok: false, error: 'invalid json' });
    }
  }

  try {
    if (rawPath === '/api/bench') return await handleBench(qs);
    if (rawPath === '/api/burst' && method === 'POST') return await handleBurst(body);
    if (rawPath === '/api/report' && method === 'POST') return await handleReport(body, event);
    if (rawPath === '/api/league') return await handleLeague();
    if (rawPath === '/api/feed') return await handleFeed();
    if (rawPath === '/api/event' && method === 'POST') return await handleEvent(body, event);
    if (rawPath === '/api/stats') return await handleStats();
    return json(404, { ok: false, error: 'not found', path: rawPath });
  } catch (err) {
    console.error('handler error', err && err.stack ? err.stack : err);
    return json(500, { ok: false, error: 'internal error' });
  }
}
