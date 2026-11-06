# 90+3 — a portfolio that holds under pressure

**José Ángel García Pérez** · Cloud & DevOps · Culiacán, Sinaloa, México
Entry for the **AWS Student Builder Challenge — Build Your Tech Superpower**.

A bilingual portfolio with a public, interactive lab: any visitor can inherit a system
that is **0–2 down**, fix three real bottlenecks, see their rank and leave an anonymous
trace. No login. No install. No fake latency.

- **Live site:** https://main.d2example.amplifyapp.com *(replace with the real URL after deploy)*
- **Visitor dashboard:** `/dashboard.html`
- **Stack:** AWS Amplify · API Gateway (HTTP API) · Lambda (Node 20, arm64) · DynamoDB · CloudWatch

---

## Why this exists

Most portfolios describe work. This one lets you *do* the work.

The lab is not an animation. Every number comes from a running API:

| Sub | Bottleneck | Before | After | Measured on |
|-----|-----------|--------|-------|-------------|
| 01 | Full table scan | `Scan` 50,001 rows | `Query` on a sparse GSI | DynamoDB |
| 02 | Recomputed aggregate | `Scan` + sum every request | `GetItem` on a cached aggregate | DynamoDB |
| 03 | N+1 | 200 sequential `GetItem` | 2 `BatchGetItem` calls | DynamoDB |

The final whistle fires a **500-request burst** at concurrency 10 and reports p50/p95
from the server side. A visitor who finishes can sign the match report and appear in
the public leaderboard.

## Architecture

```
Browser (Amplify CDN)
   │  static HTML/CSS/JS  +  fetch()
   ▼
API Gateway — HTTP API  ($default route, CORS, throttling)
   │
   ▼
Lambda — Node 20, arm64, 1 GB
   ├── /api/bench   → real DynamoDB Scan / Query / GetItem / BatchGetItem
   ├── /api/burst   → 500 concurrent reads, p50/p95
   ├── /api/report  → leaderboard entry + rank
   ├── /api/league  → top runs today
   ├── /api/feed    → anonymous live feed
   ├── /api/event   → anonymous funnel events
   └── /api/stats   → aggregate counters + bench averages
   │
   ├── DynamoDB `90plus3-rows`    (50k rows + sparse GSI `byPlayer`)
   ├── DynamoDB `90plus3-league`  (today's reports, sorted by time)
   └── DynamoDB `90plus3-events`  (feed, counters, presence, TTL 7 days)
   │
   └── CloudWatch (logs, EMF metrics, error alarm)
```

### DynamoDB design

- **Rows table** — `pk = match#<0..255>`, `sk = row#<i>`. The target row is the only one
  carrying `gsi1pk`, so `byPlayer` is a **sparse index**: `Query` touches 1 item,
  `Scan` touches the whole table.
- **League table** — `pk = day#YYYY-MM-DD`, `sk = run#<seconds>#<timestamp>#<rand>`.
  A plain `Query` returns the fastest runs in order, and rank is a `COUNT` of keys
  that sort before the new one.
- **Events table** — one partition for the live feed (`pk = evt`), one for counters
  (`pk = stats`), one for presence (`pk = presence`, TTL 120 s), one for bench
  aggregates (`pk = bench`). Every anonymous event expires in 7 days.

### Cost and safety

- On-demand billing. A full play costs roughly **3,000 read units** (≈ $0.001).
- API Gateway throttles at **100 req/s, burst 200**.
- Lambda is least-privilege: only `GetItem/PutItem/UpdateItem/Query/Scan/BatchGetItem`
  on the three tables.
- CloudWatch alarm on Lambda errors > 5 in 5 minutes.

## Privacy

- **No cookies, no pixels, no fingerprinting.**
- A random session id lives in `localStorage` and is never linked to a person.
- Country is **estimated from the browser locale/timezone**, not from IP geolocation.
- `Do Not Track` disables event tracking entirely.
- Events expire after 7 days; the leaderboard resets daily.
- The dashboard shows aggregates and explicitly says counts are events, not people.

## Run it locally

```bash
# 1. Local API + static site (no AWS needed)
cd dev
node server.js          # http://127.0.0.1:8101

# 2. Point the site at the deployed API instead
#    edit site/config.js
window.MATCH_API = "https://<api-id>.execute-api.us-east-1.amazonaws.com";
```

The local server implements the same contract as the Lambda, with an in-memory dataset
of 2,000,000 rows, so the UI works offline and falls back to recorded measurements
if the API is unreachable (clearly labeled in the UI).

## Deploy

```bash
cd infra
terraform init
terraform apply

# seed 50,000 rows + the cached aggregate
cd ../scripts && npm install && node seed.mjs && cd ../infra

# deploy the static site (Amplify manual deployment)
cd ../site && zip -r /tmp/site.zip .
aws amplify create-deployment --app-id <app-id> --branch-name main
curl -T /tmp/site.zip "<zipUploadUrl>"
aws amplify start-deployment --app-id <app-id> --branch-name main --job-id <job-id>
```

Terraform creates the tables, IAM role, Lambda, HTTP API, log groups and the error alarm.
`site/config.js` holds the only environment-specific value.

## API contract

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/bench?mode=naive\|indexed\|uncached\|cached\|nplus1\|batch` | Run one benchmark, return `serverMs` |
| `POST` | `/api/burst` | `{ n, concurrency }` → `{ okCount, failCount, p50, p95, seconds }` |
| `POST` | `/api/report` | `{ sid, name, score, seconds, lang, country }` → `{ rank, total }` |
| `GET` | `/api/league` | Top runs today |
| `GET` | `/api/feed` | Latest anonymous events |
| `POST` | `/api/event` | `{ sid, type, meta, lang, country }` |
| `GET` | `/api/stats` | Aggregate counters, funnel, bench averages |

All responses are JSON with permissive CORS. No authentication is required to read;
writing is rate-limited by API Gateway.

## What I learned

- **The bottleneck is rarely where the code looks slow.** The N+1 was 200 tiny calls;
  the fix was one line of batching, not a faster database.
- **A sparse GSI is a design decision, not a trick.** Only rows that need lookup by
  player belong in the index. That is why the query is O(1) and the scan is not.
- **Caching is a contract.** The aggregate is only safe because the recompute path
  writes it. Cache invalidation is the real work.
- **Measure server-side.** Browser timers lie under load; `process.hrtime` inside
  Lambda is the number I trust.
- **Anonymous analytics can be honest.** Aggregate counters, short TTLs and DNT support
  give useful insight without tracking anyone.

## Repo layout

```
site/        static portfolio + lab + visitor dashboard (bilingual ES/EN)
lambda/      single-file Node 20 handler (no bundler, SDK v3 from the runtime)
infra/       Terraform: DynamoDB, IAM, Lambda, API Gateway, CloudWatch
dev/         local API with the same contract, for offline development
scripts/     seed script for DynamoDB
```

## License

MIT — see `LICENSE`.
