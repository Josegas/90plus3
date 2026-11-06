# 90+3 — a portfolio that holds under pressure

**José Ángel García Pérez** · Cloud & DevOps Engineer · Culiacán, Sinaloa, México

Entry for the **AWS Student Builder Challenge — Build Your Tech Superpower**.

| | |
|---|---|
| **Live site** | https://main.d9xx5tcy9t9zl.amplifyapp.com |
| **Visitor dashboard** | https://main.d9xx5tcy9t9zl.amplifyapp.com/dashboard.html |
| **Public repository** | https://github.com/Josegas/90plus3 |
| **API** | https://fm2sw9o5v9.execute-api.us-east-1.amazonaws.com |

---

## The pitch

Most portfolios describe work. This one lets you **do** the work.

**90+3** is a bilingual portfolio with a public lab where any visitor inherits a system that is
**0–2 down** in stoppage time. Three bottlenecks are killing it. The visitor has three
substitutions, and every result comes from a **running API on AWS** — not an animation, not a
pre-recorded number.

The visitor is the protagonist. The opponent is the bottleneck. No login, no install, no
download, no waiting list.

> **The lab is the portfolio's argument.** Instead of claiming "I optimize systems", the site
> hands you a slow system, lets you fix it, and shows you the before/after measured in
> milliseconds on DynamoDB. If the claim were false, the lab would expose it immediately.

---

## What is on the site

The three required sections are there, and the lab is a fourth, integrated one:

| Section | What it contains |
|---|---|
| **01 · Work** | Six real projects, each with role, stack, outcome, metrics and a public repository link. Featured: *Refugio* (heat refuges for older adults, AWS Location Service + Terraform) and *Al Tiempo* (food safety when the cold chain fails). |
| **02 · Stack** | The eleven technologies I actually field, arranged as a **4–3–3 formation**. Each player has a position, a shirt number and evidence: *shipped*, *team project*, or *rising*. |
| **03 · The Lab** | The interactive feature: three real bottlenecks, three substitutions, a live scoreboard, a 500-request burst at the final whistle, and a public leaderboard. |
| **04 · About** | Who I am, how I work, and what I am looking for. Written as a professional profile, not an apology. |
| **Contact** | Direct email and LinkedIn, with a one-click copy. |
| **Visitor dashboard** | `/dashboard.html` — what visitors actually do in the lab: funnel, countries, devices, languages, real API latency and a live feed. |

**The hint is visible but never blocks navigation.** The hero card states
*"No login. 60 seconds. Real API."* and the lab's live bar states
*"Anonymous by default · no cookies"*. The top navigation remains fully usable at every
viewport; the lab is an invitation, not an interstitial.

---

## How the lab works

The visitor starts 0–2 down at minute 90:00. The clock runs. Three substitutions are available:

### 01 — Put a striker on · fix the access pattern
The inherited code runs a `Scan` with a filter to find **one** record. It works on a laptop.
In production it reads the whole table. The fix is a `Query` on a **sparse GSI** that contains
only the rows that need lookup by player.

```
Scan  50,001 rows  →  Query on GSI, 1 item
```

### 02 — Close the midfield · stop recomputing
The dashboard recomputes the same aggregate on every request: a full scan plus a sum of
50,000 items. The fix computes once and stores the result, then reads it with a single
`GetItem`.

```
Recompute 50,000 items  →  cached GetItem
```

### 03 — Change the wing · kill the N+1
Two hundred players are fetched with two hundred sequential round trips. The fix is two
`BatchGetItem` calls.

```
200 GetItem calls  →  2 BatchGetItem calls
```

Each substitution returns the **server-side measurement** of the real operation, before and
after. When the third one lands, the score becomes **3–2** and the final whistle fires a
**500-request burst at concurrency 10**, reporting p50 and p95 from inside Lambda.

A visitor who finishes can sign the match report. The leaderboard is public, ranked by
completion time, and resets daily. Signing is optional; playing never requires an account.

---

## Real measurements

These are observed ranges from the deployed stack in `us-east-1`, measured with
`process.hrtime.bigint()` inside Lambda. They are not simulated.

| Bottleneck | Before | After | Improvement |
|---|---|---|---|
| Access pattern | `Scan` **50,001 rows** · ~250–500 ms | `Query` on sparse GSI · **1 item** · ~5–30 ms | **~10–50×** |
| Recomputed aggregate | `Scan` + sum **50,000 items** · ~1.2–2.7 s | cached `GetItem` · ~5–60 ms | **~20–400×** |
| N+1 | **200** sequential `GetItem` · ~1.25–2.4 s | **2** `BatchGetItem` · ~45–92 ms | **~15–40×** |
| Load test | — | **500/500** requests OK · p50 ~32–53 ms · p95 ~64–116 ms · ~1.7–2.9 s | 0 errors |

The lab shows the number that the database actually produced. If DynamoDB is slow that day,
the lab is slow that day, and it says so.

---

## Visitor insight — the part most portfolios never show

The site does not just collect a counter. It exposes what visitors do, in public, at
`/dashboard.html`:

- **Five KPIs:** visits, matches started, comebacks, signed reports, completion rate.
- **A seven-stage funnel:** visit → started → fixed the scan → killed the recompute →
  killed the N+1 → won 3–2 → signed the report. This shows *where* people stop, not just
  how many arrived.
- **Countries** estimated from browser locale/timezone (not IP geolocation).
- **Devices** split mobile/desktop, and **language** split ES/EN.
- **Real API latency** per benchmark mode: calls, average and last measurement.
- **Engagement:** project clicks, contact clicks, shares.
- **A live feed** of anonymous events.

This is the same data the visitor generates by playing, shown back to everyone. It turns a
portfolio into a small public product: the visitor can see their own trace in the aggregate.

### Privacy by design

- **No cookies, no pixels, no fingerprinting.**
- A random session id in `localStorage` is never linked to a person.
- Country is estimated from `navigator.language` / timezone, never from an IP lookup.
- **`Do Not Track` disables event tracking entirely.**
- Anonymous events expire after **7 days** via DynamoDB TTL; the leaderboard resets daily.
- The dashboard states explicitly that counts are **events, not people**.

---

## Architecture

```
Browser — Amplify CDN
   │  static HTML / CSS / JS  +  fetch()
   ▼
Amazon API Gateway — HTTP API ($default route, CORS, throttling)
   │
   ▼
AWS Lambda — Node.js 20, arm64, 1 GB
   ├── GET  /api/bench    → real Scan / Query / GetItem / BatchGetItem
   ├── POST /api/burst    → 500 reads at concurrency 10, p50/p95
   ├── POST /api/report   → leaderboard entry + rank
   ├── GET  /api/league   → today's fastest runs
   ├── GET  /api/feed     → anonymous live feed
   ├── POST /api/event    → anonymous funnel events
   └── GET  /api/stats    → aggregate counters + bench averages
   │
   ├── DynamoDB  90plus3-rows    50,000 rows + sparse GSI `byPlayer`
   ├── DynamoDB  90plus3-league  today's reports, sorted by time
   └── DynamoDB  90plus3-events  feed, counters, presence, TTL 7 days
   │
   └── CloudWatch  logs · EMF metrics · error alarm
```

### Data model decisions

- **`90plus3-rows`** — `pk = match#<0..255>`, `sk = row#<i>`. Exactly one row carries
  `gsi1pk`, which makes `byPlayer` a **sparse index**. The point is not that the index is
  fast; the point is that only rows that need player lookup belong in it.
- **`90plus3-league`** — `pk = day#YYYY-MM-DD`,
  `sk = run#<seconds>#<timestamp>#<rand>`. A plain `Query` returns the fastest runs in order,
  and rank is a `COUNT` of keys that sort before the new one. No sorting in application code.
- **`90plus3-events`** — one partition for the live feed, one for counters, one for presence
  (TTL 120 s) and one for benchmark aggregates. Every anonymous event expires.

### Infrastructure as code

The whole stack is defined in Terraform (`infra/`): tables, IAM role, Lambda, HTTP API,
log groups, throttling, CORS and the CloudWatch error alarm. `site/config.js` holds the only
environment-specific value, which keeps deployment boring and repeatable.

### Cost and safety

- On-demand billing. A full play costs roughly **3,000 read units** (≈ $0.001).
- API Gateway throttles at **100 req/s with a burst of 200**.
- Lambda is least-privilege: only `GetItem`, `PutItem`, `UpdateItem`, `Query`, `Scan` and
  `BatchGetItem` on the three tables, plus log writes to its own log group.
- A CloudWatch alarm fires when Lambda errors exceed 5 in 5 minutes.

---

## AWS services used

| Service | Role in the project |
|---|---|
| **AWS Amplify Hosting** | Hosts the bilingual site and the dashboard behind a CDN, with atomic manual deployments and a no-cookies cache configuration. |
| **Amazon API Gateway (HTTP API)** | Single `$default` route into Lambda, permissive CORS for the public lab, throttling, and JSON access logs. |
| **AWS Lambda** | All API logic in one Node.js 20 handler on arm64 with 1 GB of memory: benchmarks, burst, leaderboard, feed, events and stats. Emits custom EMF metrics. |
| **Amazon DynamoDB** | Three on-demand tables: the 50,000-row dataset with a sparse GSI, the daily leaderboard, and the anonymous event store with TTL. |
| **Amazon CloudWatch** | Logs for Lambda and API Gateway, the `90plus3` EMF metric namespace, and an error alarm. |
| **AWS IAM** | A least-privilege execution role scoped to the three tables and the function's log group. |
| **AWS STS / account** | Credentials and region `us-east-1` for deployment. |

Terraform (not an AWS service, but central to the entry) defines every resource above.

---

## Bilingual, not translated

The site ships **Spanish and English as two native voices**, not as a literal translation:

- Spanish is the voice of a manager in Culiacán: *"Mete un 9"*, *"Cierra el mediocampo"*,
  *"Cambia la banda"*, *"El sistema que heredaste"*.
- English is the voice of a technical profile: *"Put a striker on"*, *"Close the midfield"*,
  *"Change the wing"*, *"The system you inherited"*.

The language is chosen from the browser on first visit, persists in `localStorage`
(`903-lang`), and can be forced with `?lang=es` or `?lang=en`. The dashboard, the leaderboard,
the feed and the finale are fully localized, including dates and relative times.

---

## Craft details

- **Football is the engine, not a costume.** The score, the clock, the three substitutions,
  the 4–3–3 formation and the 90+3 finale all map to a real engineering decision. Remove the
  metaphor and the lab still works; remove the engineering and there is no site.
- **Responsive and accessible.** Audited at 1440, 1280, 1024, 960, 820, 768, 560, 390 and
  360 px with no horizontal overflow, no clipped text and no overlapping elements. Tap targets
  are at least 36×36 px on mobile. Keyboard focus is visible, the score is an `aria-live`
  region, and `prefers-reduced-motion` disables animation.
- **Honest fallback.** If the API is unreachable, the UI says so instead of inventing numbers.
- **No crests, no logos, no player images.** Only ideas: the comeback, 90+3, the scoreboard.

---

## Challenges (and how I solved them)

**1. The lab was not dramatic enough.**
The first dataset had 10,000 rows, so scan → query was only ~9× faster. That is a real
improvement, but it does not communicate a production problem. I reseeded to **50,000 rows**
and re-measured. The scan now reads 50,001 rows and the query reads 1. The bottleneck is
honest at that scale, and the cost stays around a tenth of a cent per play.

**2. The burst reported 300 failures out of 500 — a real bug.**
The load generator derived the partition key and the sort key from two different modulo
values, so 300 of the 500 keys did not exist. The lab was telling the truth: those reads
genuinely failed. I fixed it by deriving both keys from the same index, and the burst went to
**500/500**. This is the most useful bug in the project, because it is exactly the class of
mistake the lab is about.

**3. Lambda was CPU-bound, not network-bound.**
At 512 MB, signing and firing 500 requests dominated the measurement (p50 ~96 ms). Moving to
**1 GB** gave the function more CPU and the p50 dropped to ~40 ms. The lesson: in Lambda,
memory is also a performance knob.

**4. DynamoDB rejected the counter updates.**
`ADD` requires a value per attribute, and DynamoDB rejects unused
`ExpressionAttributeValues`. My first `UpdateExpression` mixed `SET` and `ADD` incorrectly
and returned a validation error. I rewrote the update to a single `SET updatedAt = :now ADD
#k :one, ...` and removed the unused values.

**5. Deployment reliability under a deadline.**
GitHub OAuth builds add a failure mode I could not afford hours before submission. I used
Amplify **manual deployments** from a reproducible script (`scripts/deploy-site.sh`) and kept
the repository public and independent of the hosting pipeline.

**6. Privacy without losing insight.**
IP geolocation would have been easier, but it is unnecessary personal data for a portfolio
lab. I estimate country from the browser locale and timezone, accept the accuracy tradeoff,
and say so in the dashboard.

---

## What I learned

- **The bottleneck is rarely where the code looks slow.** The N+1 was 200 tiny calls that
  each looked harmless. The fix was one batching decision, not a faster database.
- **A sparse GSI is a design decision, not a trick.** The index is fast because it is small
  and deliberate. Putting every row in it would have hidden the lesson.
- **Caching is a contract.** The cached aggregate is only correct because the recompute path
  writes it. Cache invalidation is the real work; the `GetItem` is the easy part.
- **Measure server-side.** Browser timers lie under load. `process.hrtime` inside Lambda is
  the number I trust, and it is the number the visitor sees.
- **Anonymous analytics can be honest.** Aggregate counters, short TTLs and DNT support give
  useful product insight without tracking a single person.
- **A metaphor has to earn its place.** Football works here because the score, the clock and
  the substitutions map one-to-one to latency, budget and access patterns. Decoration would
  have made the portfolio weaker.

---

## Screenshots

All screenshots were captured from the **live site** against the **live API**, with zero
console errors.

### Product

| File | What it shows |
|---|---|
| `docs/screenshots/01-hero-en.png` | Hero in English: the claim, the live lab card, today's top 3 |
| `docs/screenshots/02-lab-before.png` | The lab before playing: 0–2, three substitutions, real API hint |
| `docs/screenshots/03-lab-mid.png` | Mid-run: measured before/after on the first substitutions |
| `docs/screenshots/04-lab-3-2.png` | The comeback: 3–2 with the three measured results |
| `docs/screenshots/05-finale.png` | The 90+3 finale: 500/500 requests, p50 and p95 |
| `docs/screenshots/06-signed.png` | A signed match report and the visitor's rank |
| `docs/screenshots/07-leaderboard.png` | The public leaderboard with real runs |
| `docs/screenshots/08-hero-es.png` | Hero in Spanish (native copy, not a translation) |
| `docs/screenshots/09-lab-es.png` | The lab in Spanish |
| `docs/screenshots/10-dashboard-en.png` | Visitor dashboard in English: KPIs, funnel, countries, latency |
| `docs/screenshots/11-dashboard-es.png` | Visitor dashboard in Spanish |
| `docs/screenshots/12-mobile-hero.png` | Mobile hero at 390 px |
| `docs/screenshots/13-mobile-finale.png` | Mobile finale, fully usable at 390 px |
| `docs/screenshots/14-mobile-signed.png` | Anonymous mobile signature and rank |

### AWS evidence (CloudWatch)

| File | What it shows |
|---|---|
| `docs/screenshots/aws/01-lambda.png` | Lambda invocations, errors and throttles for `90plus3-api` |
| `docs/screenshots/aws/02-lambda-duration.png` | Lambda duration: average, p95 and maximum |
| `docs/screenshots/aws/03-dynamodb.png` | Consumed read capacity for the three DynamoDB tables |
| `docs/screenshots/aws/04-api-gateway.png` | API Gateway requests, 4xx and 5xx |

---

## Repository

```
90plus3/
├── site/          static portfolio + lab + visitor dashboard (ES/EN)
├── lambda/        single-file Node.js 20 handler (AWS SDK v3 from the runtime)
├── infra/         Terraform: DynamoDB, IAM, Lambda, API Gateway, CloudWatch
├── dev/           local API with the same contract, for offline development
├── scripts/       DynamoDB seed + reproducible Amplify deployment
└── docs/          submission and screenshots
```

**Run the API locally:**

```bash
cd dev && node server.js     # http://127.0.0.1:8101
```

**Deploy:**

```bash
cd infra && terraform init && terraform apply
cd ../scripts && npm install && node seed.mjs
APP_ID=<amplify-app-id> ./scripts/deploy-site.sh
```

**License:** MIT.

---

## Final note

The site is not a mockup and the numbers are not decorative. The API is public, the database
is real, the code is open, and the lab will behave exactly as it does in the screenshots for
anyone who opens it next.

**Enter the lab: https://main.d9xx5tcy9t9zl.amplifyapp.com/#lab**
