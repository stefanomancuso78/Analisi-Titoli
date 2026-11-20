# Verified recovery of the original study-v1 engine

The full Git history contains the exact original implementation at
`70d87846fd52fd54119006628e24f2505a38c50b` (initial reviewed source import).
Seven changes to worker/experiment.js were inspected across all fetched refs.
Run `node scripts/verify-study-v1-history.mjs` in a full checkout to reproduce
this read-only investigation; it executes the hash expressions of each
historical exEnsure and returns before any database access.

## Exact fingerprint algorithm

SHA256 UTF-8 of `[exPrepare.toString(), exValue.toString(),
exAdvance.toString(), exActionValue.toString()].join('\n')`, with an actual
newline separator, yields:
`86a4fb6ef5ce1dd38660a3a1195ea18342f18395194c0b0e2b2c58d273cf7968`.

SHA256 UTF-8 of `JSON.stringify(exRules) + '|' + implementation_hash` yields:
`f17e3fe12a364842e98d2e16ebfe04407d0dddd9ac3cccdecfaaef67f9bfac99`.
Both fingerprints also match in the final built Worker, not just source imports.
The later exValue rejects entry-day-only valuation; the historical function
retains its original conventional-cost behavior. That behavior is deliberately
isolated, not silently corrected inside the frozen engine.

## Isolation and integrity

worker/historical-study-v1.js encloses the original four functions and their
original helper dependencies. Their function bodies and names remain exact.
No historical exEnsure, backup, sampling, or migration implementation is copied.
The current four functions remain unchanged for other flows.

The dispatcher selects the historical valuation only for a stored study-v1
protocol with matching portfolio hash, verified stored payload hash, and exact
runtime historical implementation/rules fingerprints. Invalid payloads or
mismatched portfolio hashes are rejected. Existing closures are returned as
stored by the original algorithm; nothing is replayed against production.

The API retains implementation_compatible as compatibility with the **current**
engine. It separately exposes historical_engine_compatible and active_engine.
Integrity is derived from the stored payload check and a matching executable
engine; it is never assigned a success constant. Thus current compatibility
can stay false while verified historical-engine compatibility is true.
Historical-engine selection does **not** reopen enrollment; new study-v1 cases
remain disabled. No protocol, hash, date, weight, forecast, case, fill, mark,
closure, portfolio plan or result is updated by this release.

## Validation and limits

The private replay fixture was captured through bounded, read-only production
reads: the exact frozen protocol row (including its serialized payload and
payload hash), all twelve frozen fills of the three original study-v1 samples,
and the observed marks returned by that bounded page. Sample metadata is a
read-only status projection, not a full portfolio backup.

The private fixture remains local and is not sent to GitHub. CI uses clearly synthetic fixtures; the same tests accept a local snapshot through STUDY_V1_PRIVATE_FIXTURE.

Tests replay those fills on their observed entry closes in isolated SQLite,
check the original cost-only behavior, verify the current-engine path remains
pending for that same situation, and compare the original protocol, fill and
mark rows byte-for-byte afterwards. Negative tests cover invalid payload and
portfolio fingerprints. This is a bounded replay and checksum verification,
not a claim of full disaster recovery or predictive performance validation.

The existing four experiments and six capital-comparison portfolios are read
before and after deployment. No acquisition, training, evaluation or historical
recalculation cycle is invoked as part of publication. PR #49's chart-marker
correction is retained as the base commit d5c4f26728e73c4ee660767d62fe1f3e605472f3.
