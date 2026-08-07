---
type: report
project: Dota Coach
task: Reduce error in the information shared in the coaching interface
date: '2026-08-07'
cycle: 2026-08-07-dota-coach
---

# Verification report — Dota Coach

**Task:** Reduce error in the information shared in the coaching interface
**Branch:** `auto/reduce-error-in-the-information-shared-in-the-coaching-inter`

## What was tested
An independent adversarial suite (14 checks) against `validate_constants.py`:
- **Comparison logic:** reordered roles (no false positive), value mismatch flagged, local-extra
  → `not_upstream`, upstream-extra → `missing_local`, empty-vs-empty, missing field (None),
  non-ASCII labels.
- **Input failure modes:** missing upstream dir → raises; malformed upstream JSON → raises.
- **CLI exit codes:** `--offline`→0, `--upstream-dir`==local→0, malformed→3, missing→3,
  `--json` emits valid JSON.

**Result: 14/14 passed.** The validator is mechanically robust — bad input fails cleanly, the
comparison is correct, and exit codes are honest.

## Findings (weaknesses / what broke)
Nothing *broke*, but the independent pass surfaced gaps the implementer's self-check missed:

1. **DoD gap — "core ability facts" were dropped.** The refined spec's subset explicitly named
   *"hero names/roles, item costs, **core ability facts**."* The implementation checks hero
   name/roles/attack_type/primary_attr and item dname/cost — **abilities are not validated at
   all.** One named element of the agreed scope silently didn't ship.
2. **Scope gap — `dota_knowledge*.py` unchecked.** The spec said compare
   *"`data/constants/` **and** `dota_knowledge*.py`."* Only the two JSON files are checked; the
   two large Python knowledge bases (which the council named as a knowledge source) are ignored.
   So "reduce error in the knowledge" is only partially delivered.
3. **`not_upstream` can cause false failures.** A local entry absent upstream is flagged and
   makes the run exit 1 — but that isn't necessarily an error (a locally-retained or
   deprecated entry). A future upstream removal would fail the check spuriously.
4. **`--insecure` is a security smell.** It disables TLS verification for the live fetch;
   habitual use is risky.
5. **No committed test suite.** The validator itself has no tests in the repo — the guard is
   unguarded against its own regressions.
6. **Live-endpoint coupling.** The default path depends on OpenDota availability + rate limits;
   flaky in CI. `--upstream-dir` mitigates but isn't the default.

## Improvements (prioritized)
1. **Extend coverage to close the DoD gap** — add a small set of *core ability facts* and wire
   in `dota_knowledge*.py` checks (even a few high-value fields). *This is the one that makes
   the task actually match its spec.*
2. **Make `not_upstream` a warning, not a failure** (or add an ignore-list); separate "stale"
   (`missing_local`) from "local extra" severity.
3. **Pin upstream for CI** (`--upstream-dir` with a periodically-refreshed snapshot); use the
   live call only to refresh. Prefer proper cert handling over `--insecure`.
4. **Commit the adversarial test file** so the validator's behavior is protected.

## Verdict
**pass-with-notes.** The validator meets its *core* DoD (runnable, 0 mismatches, re-runnable,
documented, robust — 14/14) and is safe to keep on `main`. But it **under-delivers on the
agreed subset** (abilities) and **scope** (`dota_knowledge*.py`), so the original goal —
"reduce error in the information shared" — is only *partially* addressed. Recommend a
follow-up task: **"extend the validator to ability facts + the knowledge Python files."**
