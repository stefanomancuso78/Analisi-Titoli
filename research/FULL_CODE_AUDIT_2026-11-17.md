# StokIQ — Audit del codice e del rilascio, 17 novembre 2026

**Base revision:** `f32365cb884110cb5ef423f164cdc5f4e2ade428` (main, GitHub CI run 44138730044, 341/341 unit/integration tests passed, build passed).

**Approach and scope:** full repository inventory (186 tracked blobs, 23 `drizzle/0000…0022` SQL migrations, test suite, workflow/build, README/docs, scripts, Worker/server/UI modules); targeted manual source inspection of authorization, simulator and model visibility, backup/restore, HTTP acquisition, queue selection, semantic analysis, tests 1–4 and shadow learner; static pattern inventory for execution sinks, dynamic SQL, HTML and network retrieval. Production is separately checked through read-only StokIQ connector metrics. This is **not** a formal proof of absence of vulnerabilities, code-coverage instrumented run, independent penetration test, complete provider license audit, or a deployment/production smoke test. The green CI demonstrates only the tests actually written.

**Changes made during review:** no runtime code was integrated as part of this audit. An exploratory privacy-restriction change was intentionally **not merged** after existing tests established it contradicted the designed password-reader experience. Do not apply that change without changing the intended access policy.

## Executive assessment

- **Internal research code and regression discipline:** reasonably mature for experimental monitoring, with immutable protocol/outcome triggers, multiple source-level controls, and reproducible automated tests. Not yet evidence of predictive performance.
- **Security/product confidentiality:** requires explicit hosting identity trust verification and a documented decision on password-reader visibility before commercial multi-tenant use. No exploit of the deployed Sites service has been proven.
- **Acquisition:** operational fragility is material: real source/provider errors, incomplete primary coverage and a long independent research follow-up queue.
- **Financial/scientific validity:** Test 4 has no matured outcomes; a trainable shadow model is not proof of alpha. Any claim that a model has learned an investable edge would currently be unsupported.
- **Resilience:** encrypted paged backup is verified but intentionally not atomic, and the CI bundle does not carry a full fresh-install migration sequence. Hosting disaster recovery is not proven.
- **Release:** GitHub green does not equal a deployed Sites revision. The currently running Sites build SHA could not be proved from this review.

## Findings, ordered by impact

### AUD-01 — HIGH / external trust contract not verified: identity asserted through upstream headers
**Evidence:** `worker/production.js::pdRole` and `worker/index.js::owner` use `oai-authenticated-user-email`; `simPrincipal` reads `oai-authenticated-user-id`. The Worker itself does not authenticate a header signature. Unit tests intentionally use injected authentication headers. This is acceptable **only if** the hosting boundary strips client-supplied identity headers and injects authenticated, non-spoofable values. The source and green CI alone do not establish that guarantee.

**Required proof:** from an unauthenticated direct HTTP client test requests that supply identity-named headers and confirm they **never** gain owner/manager operations or access to private user portfolios; separately verify genuine Sites-authenticated requests still work. Document the provider's guaranteed header semantics. Avoid modifying the trusted-header contract blindly: that would break the already-connected owner workflow. **Status:** deployment trust check required; no claim of a live vulnerability.

### AUD-02 — HIGH / intended access policy but important privacy scope: administrative clients visible to password readers
**Evidence:** `worker/index.js::simulatorEndpoint(GET)` includes registered admin principals and `simulation_clients` for password-authenticated readers; `tests/production.test.js` explicitly asserts this behavior (read-only workspace includes admin portfolios and clients but excludes unrelated visitor simulations). `worker/workspace-tools.js::wsManaged` limits modification, not the intended read-only visibility. This is not an accidental authorization regression; a proposed restrictive change correctly failed existing regression tests and was not merged.

**Decision:** if StokIQ is a single shared analytical workspace, document that users of the shared password can view named admin clients and their positions; do not store confidential client data there. If intended for independent clients or professional managers, define a new per-tenant access policy, migrate safely, and add negative IDOR tests. No silent change to existing scope. **Status:** product/privacy decision needed before multi-client commercial launch.

### AUD-03 — HIGH / release-blocking evidence gap: current Sites identity and environment not verified
**Evidence:** `.github/workflows/checks.yml` runs Node 24 tests and an isolated build using `.openai/hosting.example.json` when no live hosting file exists. The example includes `REPLACE_WITH_YOUR_OWN_SITE_PROJECT_ID`. `build.mjs` builds and imports a concatenated Worker bundle, but neither CI nor commit merge updates the existing Sites revision. **Required:** record existing Sites revision, exact SHA, D1/R2 bindings, owner identity, `CREDENTIAL_MASTER_KEY`, backup, schema and all Test 1–4 reference IDs before one authorized deployment. Smoke test permission denials as well as positive paths afterward. **Status:** code build verified; actual deployment not verified.

### AUD-04 — HIGH / disaster-recovery consistency: logical paged backup is not an atomic snapshot
**Evidence:** `worker/backup-pages.js::bkAdvance` reads tables/page rows independently under rowid ceilings; docs and manifest explicitly state it is not an atomic physical snapshot. It encrypts pages with AES-GCM, verifies the round-trip/checksums and some archived foreign-key references, but concurrent writes during a long export can produce a cross-table snapshot that never existed at one instant. The restoration rehearsal does not constitute live D1/R2/hosting failover.

**Remediation options:** quiescent/consistent export window (or provider-supported transactional snapshot where available); audit per-table high-water marks, mutation journal and manifest; periodic isolated restore and cross-table business-invariant verification; full disaster-recovery drill before professional production. Do not delete existing verified archives. **Status:** verified encrypted logical backup, not verified point-in-time restore.

### AUD-05 — MEDIUM-HIGH / rebuild risk: fresh-install migrations are not fully delivered with artifact
**Evidence:** `drizzle/0000_registry.sql` through `drizzle/0022_prospective_alpha.sql` are tracked, whereas `build.mjs` copies `migrations/0001_registry.sql`, `migrations/0002_calibrations.sql`, and `drizzle/0022_prospective_alpha.sql` into `dist/migrations`. That is not an ordered 23-step migration chain in the produced bundle. This may be acceptable when keeping the existing D1 schema but is not evidence that a new, empty environment can be installed from the artifact. **Remediation:** explicit schema manifest and version preflight for existing Sites; independently tested full fresh-install/restore process separate from deployment. Do not apply migrations blindly on the existing D1 DB. **Status:** missing fresh-install proof.

### AUD-06 — HIGH / real operational capacity: source and economic follow-up backlog
**Read-only status at 2026-11-17 17:45 UTC:** 59 tracked companies; 52 reporting primary discovery, 7 gaps; 36 connectors in outage/rate-limit/credential-required states; 57 recent quotes and 2 missing/stale. Graph acquisition: 15 pending. Semantic reading: 0 pending. **Research follow-ups are a different queue:** 795 jobs, 718 pending, 1 retry, 46 evidence-ready, 30 reviewed. Test 4: 5 source cases, 4 eligible/selected, 0 matured/paired outcomes.

**Root operational distinction:** `semantic pending=0` does not mean the backlog of researched counter-evidence is resolved. At 2 attempts per cycle, 718 pending jobs require at least 359 cycles merely to attempt once (assuming every attempt is successful and no arrivals). The actual rate and benefit need direct measurements, not an ETA or forced polling.

**Remediation:** due-only acquisition, provenance of full acquired text, queue-age metrics, per-provider backoffs, throughput by stage and promotion of reviewed evidence. Keep negative/non-US evidence and research-only outcomes. Reassess admission limits empirically. **Status:** measured capacity gap; avoid declaring full sourcing functional.

### AUD-07 — HIGH / unproven predictive benefit: prospective model and Test 4 sample insufficient
**Evidence:** `worker/learning-challenger.js` registers prospective shadow predictions before outcomes, uses matured training-fold cases, hashes trained versions and compares paired evaluation-fold Brier by model. `worker/test4.js` preserves no-auto-promotion and benchmark/same-session checks. Despite good controls, production has no matured Test 4 pairs. A 30-case sample threshold and 5 issuers/cohorts are minimum screening safeguards, not power analysis, independent replication or proof of net alpha.

**Remediation:** pre-registered negative controls; economically matched benchmarks and corporate-action completeness; uncertainty intervals, clusters by issuer/time, calibrated probabilities, fees, tax/FX assumptions appropriate to use; holdout that is not reused for tuning; documented human promotion decision. No real orders. **Status:** implementation exists, predictive skill not proven.

### AUD-08 — MEDIUM / scaling: full-table scans and a very large monolithic Worker/UI
**Evidence:** `worker/parallel.js::t3Cycle` pulls all `market_closes` ordered by `recorded_at` then builds per-symbol maps; the Worker index source is about 240 KB, `worker/production.js` about 99 KB, `worker/product-ui.js` about 96 KB, and the output from `build.mjs` concatenates many modules and embedded assets using a regex on import lines. `node build.mjs` detects JS initialization errors but does not simulate actual memory/CPU caps or real dataset size.

**Remediation:** add production-like bulk fixture with query-count/CPU/memory budgets; paginate/window SQL and compound indexes, separate API and HTML rendering boundaries, replace regex concatenation with a deterministic bundled build only after snapshot/regression equivalence tests. No urgent rewrite in the active Sites release. **Status:** scale and maintainability risk, not a proven present outage.

### AUD-09 — MEDIUM / browser defense in depth: permissive inline script policy
**Evidence:** `worker/index.js` HTML response sets CSP `script-src 'unsafe-inline'`, and many UI modules build dynamic `innerHTML`; a common HTML escaping helper `esc` is present. The static scan found no `eval`/`new Function` uses in the main server modules. No exploitable stored XSS was established from the inspected paths, but the CSP would not provide strong protection against a future interpolation mistake.

**Remediation:** focused hostile-string DOM regression fixtures (issuer name, document title, URLs, notes, customer reference, graph labels), replace unsafe DOM interpolation as needed, then move toward nonce/hash-based CSP with tests and the Sites embedding contract. **Status:** defense-in-depth concern, not confirmed injection.

### AUD-10 — MEDIUM / semantics and data-quality: freshness and full text are different measures
**Evidence:** `worker/graph.js`, `worker/acquisition-batch.js`, `worker/semantic.js`, `worker/source-health.js` distinguish metadata, short fragments, primary text, economic interpretation, quote/valuation age. PR #31–33 corrected 150-char HTML false completions, ordered multi-part reading attestation and historical short-text visibility. `source-health` uses a previous-*weekday* indicator but not an actual exchange holiday calendar; primary discovery does not prove full-text retrieval.

**Remediation:** track a structured `actual_http_status → candidate_link → acquired_primary_document → 700-char qualified_text → read → interpreted → prospective_case` funnel; verify market calendars and provider entitlements; log the reason for any skipped stage. **Status:** good incremental gates, live source coverage still needs verification.

### AUD-11 — MEDIUM / security operations: shared password / rate-limit assumptions
**Evidence:** `worker/index.js` uses PBKDF2-SHA256 (100k iterations), a random 64-hex session token stored as a hash, HttpOnly/Secure/SameSite=Lax cookie, same-origin POST guard, and a per-`cf-connecting-ip` 10-attempt/15-minute limiter for unlock. The origin and IP/header trust ultimately depend on the hosting proxy. Shared password provides a **shared reading boundary**, not independent identity for multiple professional clients.

**Remediation:** exercise session expiry, rotation, forwarded identity/IP headers and request forgery against the actual hosting boundary; keep privileged write routes owner-only; consider user-specific authorization and audit logs before client tenancy. **Status:** basic controls present; live trust test and product confidentiality decision required.

### AUD-12 — MEDIUM / operational docs and observability drift
**Evidence:** README and `research/DEPLOY_HANDOFF_2026-11-17.md` contain older launch/PR/CI states while the current main is newer. The authoritative handoff is GitHub issue #29 and the dynamically verified current main SHA. `X-StokIQ-UI-Version` and HTML meta UI version differ; they are not cryptographic deploy IDs.

**Remediation:** generate a release manifest containing commit, build digest, migration state, content timestamp and component protocol IDs, exposed via an authenticated read-only health endpoint. Update documentation at each release; never claim publication based solely on source SHA. **Status:** documentation drift.

## Automated verification and positive controls reviewed

- GitHub run `44138730044`: 341 tests passed, Worker bundle build/import passed on `f32365cb884110cb5ef423f164cdc5f4e2ade428`. CI builds using an isolated hosting example, not the live project.
- Original Test 1–4 protocols, training/evaluation separation, append-only forecast/outcome controls, Test 4 immutable trigger coverage and no automatic trades appear deliberately guarded.
- Source fetches generally enforce HTTPS, redirect/host restrictions, size limits and retry/backoff; provider permission/terms and live success are separate.
- Password routes enforce cookie flags and anti-CSRF origin checks; configuration secrets remain on server and encrypted credentials/backups use AES-GCM.
- Tests cover synthetic acquisition, short/long documents, replay, principal-scoped access, model first registration, forecast timing, portfolio mark sparsity, bounded queues and isolated backup restore.
- **Important nuance:** Test `tests/production.test.js` deliberately checks shared read-only exposure of administrator portfolios/clients to password readers. This is an intended current product behavior, not a regression to patch without a product decision.

## Required release gates — in order

1. **Hosting-trust verification:** prove forged direct identity headers cannot grant elevated role in Sites; prove visitor sessions cannot write; verify intended read-only portfolio/client sharing and absence of unrelated visitor data.
2. **Recovery:** check current encrypted paged backup/manifest with the exact key; verify restored data consistency and no unintended schema drift on a copy. Do not run destructive restoration on the live database.
3. **Reproducible bundle:** tie Sites revision to exact main SHA and expected DB schema; confirm the actual hosting project ID/bindings/secrets without exposing them.
4. **Safe one-time release:** publish only after release gates; check GET/POST permissions, four experiment IDs and preserved history, sources/queues, quote timestamps, portfolio calculations and backup status.
5. **Sustained operation:** track actual acquisition/read/review throughput, provider outages, failed jobs, model registration completeness and prospective outcomes across multiple cycles. Do not advertise an economic edge before independently reviewed matched results.

## Conclusion

**Conditional go for continued internal research/code development. No-go for claiming deploy readiness, verified continuous autonomous learning, independent multi-client confidentiality, full hosting disaster recovery or professional investable alpha solely on current GitHub CI.** These require the concrete external/runtime tests and product decisions above. Keep existing Sites unchanged until preflight is met. Maintain original frozen experiments, predictions, secrets, and historical data.

Authoritative follow-up: issue #29 (single existing-Sites release handoff). This audit is evidence and prioritization, not a deployed application or a claim that every line was formally proven correct.
