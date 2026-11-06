# 90+3 — form-ready answers

Copy-paste blocks for the submission form. Everything here matches the live site.

---

## Project title

**90+3 — A portfolio that holds under pressure**

## Tagline (one line)

A bilingual portfolio where any visitor inherits a system that is 0–2 down and fixes three real bottlenecks against a live AWS API.

## Short description (~50 words)

90+3 is a bilingual portfolio with a public lab. A visitor inherits a system that is 0–2 down in stoppage time and makes three substitutions: a full scan becomes an indexed query, a recomputed aggregate becomes a cache hit, and an N+1 becomes a batch read. Every number is measured live on AWS.

## Full description (~250 words)

Most portfolios describe work. 90+3 lets a visitor do it.

The site is a real portfolio — About, Skills and Projects — built around a public lab. The visitor inherits a system that is 0–2 down in stoppage time. Three bottlenecks are killing it: a full table scan to find one record, an aggregate recomputed on every request, and an N+1 that fires 200 sequential reads. The visitor has three substitutions, and each one returns the before/after measured server-side inside Lambda.

When the third substitution lands, the score becomes 3–2 and the final whistle fires a 500-request burst at concurrency 10, reporting p50 and p95. The visitor can sign the match report and appear in a public leaderboard that resets daily. No login, no install, no download.

Everything runs on AWS: Amplify hosts the site, API Gateway fronts a single Lambda, DynamoDB holds 50,000 rows with a sparse GSI, and CloudWatch collects logs and metrics. The whole stack is defined in Terraform.

The site also exposes a public visitor dashboard: a seven-stage funnel, countries estimated from browser locale, devices, languages, real API latency and a live feed. It is aggregate and anonymous by default — no cookies, no pixels, and Do Not Track disables tracking entirely.

Spanish and English are written as two native voices, not translated. The football metaphor is structural: the score is the latency budget, the clock is the deadline, and the substitutions are engineering decisions.

## Live URL

https://main.d9xx5tcy9t9zl.amplifyapp.com

## Repository

https://github.com/Josegas/90plus3

## Visitor dashboard

https://main.d9xx5tcy9t9zl.amplifyapp.com/dashboard.html

## AWS services used

AWS Amplify Hosting, Amazon API Gateway (HTTP API), AWS Lambda, Amazon DynamoDB, Amazon CloudWatch, AWS IAM.

## How the lab works

1. **Fix the access pattern** — `Scan` of 50,001 rows becomes a `Query` on a sparse GSI (1 item).
2. **Stop recomputing** — a full scan plus sum of 50,000 items becomes a cached `GetItem`.
3. **Kill the N+1** — 200 sequential `GetItem` calls become 2 `BatchGetItem` calls.
4. **Final whistle** — 500 requests at concurrency 10, with p50/p95 measured inside Lambda.

## Measured results

| Bottleneck | Before | After |
|---|---|---|
| Access pattern | 50,001 rows scanned · ~250–500 ms | 1 item · ~5–30 ms |
| Recomputed aggregate | 50,000 items summed · ~1.2–2.7 s | cached read · ~4–60 ms |
| N+1 | 200 sequential reads · ~1.25–2.4 s | 2 batched reads · ~38–92 ms |
| Load test | — | 500/500 OK · p50 ~32–53 ms · p95 ~64–116 ms |

## Visitor insight

The public dashboard shows what visitors actually do: a seven-stage funnel (visit → start → each fix → win → sign), countries from browser locale, device split, language split, real latency per benchmark mode, project/contact/share clicks, and a live anonymous feed. It proves the lab is used, not just visited.

## What I learned

- The bottleneck is rarely where the code looks slow: the N+1 was 200 harmless-looking calls, fixed by one batching decision.
- A sparse GSI is a design decision, not a trick: it is fast because it is deliberately small.
- Caching is a contract: the aggregate is only correct because the recompute path writes it.
- Measure server-side: browser timers lie under load.
- Anonymous analytics can be honest: aggregates, short TTLs and DNT support give insight without tracking anyone.
- A metaphor has to earn its place: football works because score, clock and substitutions map to latency, budget and access patterns.

## Challenges

- The first dataset (10,000 rows) made the scan→query gap only ~9×, so I reseeded to 50,000 rows to make the bottleneck honest.
- The burst initially reported 300 failures out of 500 — a real bug where `pk` and `sk` came from different indices. Fixed by deriving both from the same index; the burst went to 500/500.
- Lambda at 512 MB was CPU-bound while firing 500 requests; moving to 1 GB cut p50 from ~96 ms to ~40 ms.
- DynamoDB rejected the counter updates until the `ADD` clause and unused expression values were corrected.
- I chose Amplify manual deployments over GitHub OAuth to remove a failure mode close to the deadline.
- I chose browser locale over IP geolocation to avoid unnecessary personal data, and documented the accuracy tradeoff.

## Built with

JavaScript, HTML, CSS, Node.js 20, AWS SDK v3, Terraform, DynamoDB, Lambda, API Gateway, Amplify, CloudWatch.

## Screenshots

See [`docs/screenshots`](docs/screenshots) for the 14 product screenshots and [`docs/screenshots/aws`](docs/screenshots/aws) for the CloudWatch evidence.

## Optional: the one-line version

> A portfolio that doesn't claim it can hold under pressure — it hands you the system, the clock and three substitutions, and proves it with a live AWS API.
