# StokIQ — end-to-end reliability audit, 17 November 2026

## Goal and non-negotiable invariants

Find a versioned, prospectively validated, self-improving predictive model for future **research signals** relevant to buy/hold/sell investment decisions by private investors and professional managers. Store economic evidence centrally with source, acquisition time, first-known date and immutable historical outcomes. Management feedback and model training are separate from forecasting and actual execution.

**This release is not proof of predictive skill, a production trading service, or a new source of paid API data.** It preserves all original protocols, Test 1–4, Test 4 cases, six original portfolios, historic marks and published predictions. No migration, credential, R2 binding, or external subscription is added.

## Production evidence observed before changes (read-only StokIQ connector)

- At 2026-11-17 ~12:06 UTC, 59 companies, 52 reporting a recent primary discovery channel, 7 gaps (CSCO, GILD, LEU, MA, STM, SU.PA, VWS.CO); 36 sources in unavailable/error status. A successful HTTP status is not proof of a successfully acquired full-text document.
- Acquisition backlog: 15, semantic texts awaiting interpretation: 0; 318 saved economic assessments (38 qualified, 280 research-only). Their units differ: do not compare URL acquisitions and text analyses as if the same job.
- Separate research follow-ups: 795 jobs, 718 pending, 46 evidence_ready, 1 retry, 30 reviewed. Max two due jobs per research cycle (frozen research-followup-v1). At exactly one uninterrupted hourly cycle and zero arrivals, 718 pending need *at least* 359 cycles (~15 days); these assumptions do not hold yet, so actual throughput is not proven sustainable. Do not silently drop jobs, bypass next_attempt or force HTTP 403/429 access.
- Test 1 integrity false (known historical state); Test 2 and Test 3 integrity true; Test 4 integrity true, 4 selected prospective cases plus 1 excluded, 0 matured/paired results. No trained predictive model or demonstrated positive alpha.
- Six original Test 3 sample portfolios preserved; one holding each, so HRP/equal-weight return equality is not a comparison of diversified strategies. Capital-v3.1 requires 61 common closes; last sample reported 5.
- Encrypted backup verified 2026-11-17 06:07 UTC: 99 tables, 15,199 rows. This is not full hosting disaster recovery.
- Operational heartbeat had a >2h acquisition gap; a successful CI and a connected app do not certify that the hourly external ChatGPT task has adequate quota or continues operating.

## Evidence-backed fixes in this branch

1. **Value/provenance separation.** Distinguish the timestamp of the background calculation from the actual market close date. Recent persisted valuations are usable; if the background snapshot exceeds 26 hours (roughly a daily close cadence with more time for bounded portfolio rotation) the current value/return are withheld while a separately marked, timestamped **last verified historical value** remains visible. Critical or incomplete valuation results are never converted into a historical success. Benchmark and gross-return fields are withheld in the stale state.
2. **Bounded valuation work with concurrency protection.** Existing single-portfolio refresh is serialized with an atomic D1 lease; a separate `portfolio_batch` stage handles at most three normal portfolio valuations sequentially and reports partial errors. It changes no prices and does not invent new fills. The existing single-step contract remains available.
3. **Dashboard reporting completeness.** Manager API now reports the independent research-evidence backlog and portfolio freshness, instead of displaying '0 texts waiting' as though all knowledge work had finished.
4. **Price-data recency.** Separately flag quotes older than the previous weekday close (conservative EOD calendar heuristic). This is **not** an exchange holiday calendar, and it never supplies missing quotes or changes test entry eligibility.
5. **Owner self-service.** Maintenance console reads Test 1–3 and Test 4 separately, and offers existing single/bounded portfolio maintenance operations without Codex. Owner permissions remain enforced by the backend.
6. **Regression coverage.** Tests assert stale/historical labeling, weekend price reporting, bounded batches, single-writer protection, independent backlog counts, and no background price acquisition claims.

Earlier changes merged into main in PR #24 rotate a bounded set of pending Test 4 price symbols and give the oldest eligible research job one slot out of two. These need the actual Sites deployment before being called operative.

## Remaining external or longitudinal blockers: do not mark fixed by this release

- Sites deploy is separate from GitHub merge; repository Actions has no deploy credentials. A GitHub green CI is not a Sites revision ID or proof that stokiq.online serves this exact bundle.
- The acquisition task depends on a ChatGPT automation and its quotas. If it is not running, no code-only change to display panels creates new documents, prices or model outcomes.
- Current Nasdaq historical HTTP 520, some IR pages returning no parsable links, Business Wire not yet observed operational, SEC fallback not yet polled: must wait until naturally due and log HTTP status, observed documents, genuinely acquired texts, next_poll and backoff. No invented coverage; no unlicensed fallback to other venues.
- No evaluated training/evaluation cohorts have matured. Do not train on future outcomes, rewrite Test 4 decisions or assert auto-learning performance. Continue append-only evidence.
- Test 1 pre-existing integrity warning must remain visible and requires a separately approved forensic integrity comparison, not silent regeneration or updating its fingerprint.
- Exchange/market holidays, FX adjustment and commercial data licenses require validated, licensed exchange calendars and/or provider terms before professional deployment.

## Required release validation (single commit, single deployment)

1. Confirm main SHA and green tests **and build on the final merge SHA**; compare modified paths and verify no migration, protocol or resource binding changes. Do not deploy a branch or the older 9412fad release once the audit PR is merged.
2. Verify the most recent encrypted backup and its decrypt/manifest checks; preserve D1, R2 archive, authenticated sessions, password, OWNER_EMAIL and CREDENTIAL_MASTER_KEY. Never copy keys into GitHub.
3. Deploy this exact merge SHA once onto the existing Sites project. If the target revision already matches, do nothing.
4. As the authenticated owner, verify /api/simulator, /api/manager-status, /api/source-health, /api/parallel, /api/test4, /api/capital, /api/performance; verify 4 selected Test 4 cases, original portfolio IDs/amounts, original forecasts, quote source/date, backup integrity, and 401 anonymous API responses. Check both desktop and mobile.
5. Exercise only the **naturally due** bounded portfolio refresh and research/quote cycles, recording exact status, request count, before/after queue and closure dates; never bypass leases or provider backoffs.
6. Report Sites revision, full SHA, UTC/Dubai time, counts, errors and what remains unobserved. A two-hour green status does not establish multi-day sustainable operation.

## Architecture direction, not a new model release

Central immutable evidence and timestamped relationships → economic interpretation (with manager critique and counter-evidence) → versioned out-of-sample forecasts → paired future closes and benchmarks → mature net results → eligible challenger training → independent prospective evaluation → explicitly controlled promotion. Consumer/professional execution and advice require separate authorization, suitability, risk and market-data entitlement; no automatic orders are enabled here.
