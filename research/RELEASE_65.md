# Release 65 · observation and prospective capital

Implemented and published source contains:
- Dedicated Bilanci e guidance view and per-stock dossier facts. SEC XBRL snapshots preserve filed-date cutoffs, units, duration, accessions and hash; comparisons exclude non-positive percentage bases and incompatible periods.
- Point-in-time CIK catalog from 41 already acquired SEC issuer records; exact issuer identity is checked again against returned company facts. Sources without verified mappings are not guessed.
- Official IR index, RSS and issuer-hosted transcript/document discovery. Newly found URLs are registered then acquired, not reported as read immediately. Errors and daily source cadence are visible.
- Grounded numeric extraction queue: full acquired-text scope, exact numerical and temporal quotations, reported-versus-guidance type. Empty extracts are allowed. Source-grounded model extraction is not an independent audit.
- Capital-v3.1: separate prospective HRP/equal-weight study, 3 risk profiles each, USD 10,000 per sample. Common 60-return covariance, source/currency consistency and freshness, concentration caps, immutable plans and future-close execution using the existing audited paper ledger.
- HRP option in the personal/client simulator with EUR/USD budget. No silent fallback for unavailable covariance/history/candidates. Portfolio USD/EUR valuation uses dated FX; optimizer uses local-currency returns and does not model FX risk.
- Separate immutable imports of previously acquired Nasdaq historical closes; recording time is now. Historical prices are not inserted into the frozen tests' price ledger by this import.
- Historical price-only prediction benchmark with temporal holdout and label embargo. Selected-case returns are negative; all outcomes retained. No production model promotion.
- Actual professional-data-license declaration, source issues, critical alerts, backup timestamp and model-training count exposed as separate readiness fields. This release does not assert commercial entitlement, a fully restored hosting drill or validated alpha.

First activation, acquisitions and portfolio creation must be read back from production. An empty candidate queue legitimately creates no invested portfolios. Existing test 1/2/3 forecast protocols are not modified; capital-v3.1 is an additional capital experiment and named protocol.

Not connected by this release: Quartr/RavenPack/AlphaSense/Patsnap proprietary APIs/datasets; Qlib/RD-Agent and QuantConnect/LEAN runtimes; Claude execution API. No account registration, paid purchase, broker order or guessed credential was performed. Their functions are addressed in part by open implementations, not falsely labeled as installed products.
