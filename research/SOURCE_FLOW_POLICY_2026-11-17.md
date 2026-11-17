# StokIQ — Source-to-signal operations, 17 November 2026

## The measurable goal
Keep a sustainable feed of verified, time-stamped economic evidence that can produce **new** prospective Test 4 decisions, and measure those decisions on true post-publication closes against same-session SPY, at the already frozen rules and costs. Infrastructure tests do not demonstrate investment alpha.

## Verified production baseline (2026-11-17 around 09:13 UTC)
- 59 tracked issuers; 52 with fresh primary discovery channels, 7 gaps: CSCO, GILD, LEU, MA, STM, SU.PA, VWS.CO. An IR URL configured but returning no readable announcement links is **not** live coverage.
- Over 24h, 58 acquired readable texts became eligible for semantic reading and 58 analyses completed; pending semantic reading was 0. Acquisition queue 17; 34 source outages. Semantic throughput and URL acquisition have different units and should never be compared as interchangeable.
- Test 4 prospective-decision-v1 started at 2026-11-17T09:16:00Z; implementation/protocol integrity true, initial case count zero (correct, no backfilled cases).
- The 6 original capital-v3.1 samples have 2026-11-16 values and **paired XLK benchmarks**; no longer hold the former missing-benchmark warnings. Those six samples still each contain AMD only and HRP vs equal weight is indistinguishable for a one-asset basket.

## Official discovery and fallback priority
1. Original issuer IR and official regulatory filings with defensible issuer identity. Use SEC submissions/CIK##########.json solely for SEC-filed 8-K, 10-Q, 10-K and 6-K (not a full mirror of an issuer's IR). The code can seed a SEC fallback only where the SEC's own company_tickers.json already establishes a unique ticker/CIK match and no SEC-company stream exists; never guess CIK by company name.
2. Official FDA, EMA, ClinicalTrials.gov and EPO OPS records for regulatory/clinical/patent developments; a metadata notice is not proof of economic materiality or approval. Large/unsupported PDFs remain explicit evidence gaps until a verified primary HTML/text alternative is found.
3. Nasdaq Nordic and GlobeNewswire RSS as discovery sources only. Match unique issuer names or conservative aliases, never a ticker alone. The RSS record is not primary economic proof; follow through to issuer/filing where possible. Feed availability is not equal to end-to-end document acquisition; confirm successful scans and downloaded full text in production.
4. Additional news sites can provide leads but never replace original documents or bypass access controls. Respect all fair-access, attribution, copyright and redistribution conditions.

## Source scheduler and automatic stop conditions
- The hourly task uses source_refresh_cycle only for sources that are enabled and due by next_poll. The worker enforces a UTC hourly atomic source reservation to prevent another orchestrator from exceeding the budget. Source limits are a maximum, **not a target**.
- Backlog hard-stop: acquisition.pending >= 30, reading.pending >= 12, or untriaged >= 20.
- Soft pause: reading.pending >= 6, or prolonged semantic delay/imbalance. When reading.pending >= 3 or acquisition.pending >= 24: at most 1 new poll per hour. At acquisition.pending >= 15: at most 2. With healthy queues: at most 4. If completed readings fall behind arrivals by more than 5 in 24h, cap polls at 1; if acquisition arrivals exceed completed jobs by more than 12, cap at 2.
- Discovery selector reserves approximately one in four *eligible scans* for a general discovery source; the other three prefer issuer primary gaps and oldest due source. Honor explicit 403/429/credentials backoff, source-specific error counters and increasing waits for repeated transient failures (1h, 4h, 12h, 24h). Never reset backoffs to make a coverage count look good.
- Spend up to 2 complete economic readings per hourly automation run, oldest plus materiality priority. Stop on busy, empty or stale queue, source not due, hourly quota, or failure of provenance/whole-text review. Do not fabricate a whole-text review from an incomplete extraction.

## Prospective validation and prices
- Existing authenticated parallel_cycle records new Test 3 cases and associated Test 4 shadow snapshots **only when the code and protocol are compatible**, after complete reading. A once-daily test4_cycle can advance entries/maturities and a bounded price sweep even if no new semantic document was qualified that hour.
- Test 4 enforces post-publication entry, timestamped benchmark SPY close on the same session, minimum 30 appaired outcomes, 5 cohorts, 5 distinct companies, sufficient coverage and manual independent review before even preliminary claims.
- The market refresh uses actual acquired Nasdaq closes when available, and logs errors. SPY and XLK and pending study symbols are due roughly every 18h; skip repeated calls if not due. Nasdaq HTTP 520 is not a price. No automatic Yahoo/Stooq/ADR substitution; provider-adjusted and raw prices are not interchangeable.
- For sustained unavailable or insufficient price access, the next realistic **licensed** options are EODHD Business or Twelve Data business offerings, subject to the user's explicit authorization, commercial terms and exchange licenses. No API purchase, credentials export or contract is initiated by the task.

## Separation and validation
Do not mutate frozen Test 1/2/3 protocols, original portfolios, immutable fills or old previsions. New prospective cases are append-only; no retrospective cherry-picking. Promote no model or portfolio automatically. Before production deployment require full npm tests/build, preflight schema and a verified encrypted backup. After deployment check actual source and queue behavior, quote coverage, Test 4 protocol integrity and all old samples; no claim of success on the basis of green CI alone.

## Official source references
- SEC submissions JSON and rate/fair access: https://www.sec.gov/search-filings/edgar-application-programming-interfaces and https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
- Nasdaq Nordic issuer news coverage: https://www.nasdaq.com/european-market-activity/news/company-news
- GlobeNewswire RSS categories: https://www.globenewswire.com/rss/list
- Twelve Data business usage and redistribution: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage
