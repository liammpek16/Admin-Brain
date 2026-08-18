---
type: report
project: Admin Brain
task: Fix latency with writing goals pt.2
date: '2026-08-18'
cycle: 2026-08-18-fix-latency-with-writing-goals-pt-2
---

# Verification report — Admin Brain

**Task:** Fix latency with writing goals pt.2
**Branch:** `auto/fix-latency-with-writing-goals-pt-2`

## What was tested
Independent pass against the DoD, run on the **real** `adapters/obsidian/index.js` + a real GitHub repo,
with `ADMIN_BRAIN_RECENCY_TTL_MS=50` to force TTL expiry on demand. The whole point of pt.2 is that the
network is off the read/write path — so the tests are timings + failure-mode behavior, not mocks.

| # | Check | Result |
|---|-------|--------|
| T1 | `getProjects()` **after TTL expiry** (the bug's hot spot) | ✅ **17.7ms** (was ~430ms) |
| T2 | `lastGitActivity` stale hit vs cold, same repo | ✅ **6.4ms** vs **422ms** — read never awaits network |
| T3 | Warm fresh hit | ✅ 0.0ms |
| T4 | Cold (first-ever) still computes the real Date once | ✅ 422ms, correct commit date |
| S1 | **Stickiness** — `gh` forced to fail on a background refresh | ✅ known Date retained (not wiped to null) |
| S2 | Background refresh runs; value intact on next call | ✅ |
| S3 | Stale value **==** cold value (recency stays correct) | ✅ same date |
| C1 | 4 **concurrent cold** callers share ONE compute (no stampede) | ✅ 436ms total (~1×, not 4×) |
| C2 | All concurrent callers resolve to the same value | ✅ |
| X1 | `clearRecencyCache()` → next call is a fresh cold compute | ✅ 418ms |
| X2 | Falsy/empty repo → `null`, instant, uncached | ✅ |
| V1 | `getProjects()` fields unchanged (`activitySource=git`, sane `daysSince`) | ✅ |

Totals: **15/15** across the two adversarial runs (11 SWR + 4 concurrency/correctness).

## Findings (weaknesses / what broke)
No defects; nothing broke and every DoD criterion holds. Honest notes, non-blocking:

1. **One-time cold cost remains at server boot.** The first `getProjects()` after `npm run hud` still
   pays ~430ms per repo (unavoidable without a persisted cache). It's off the *write* path — it only
   happens once at startup — but the very first HUD paint is that slow. (Improvement: persist recency to
   disk; already logged as an out-of-scope follow-up.)
2. **Recency can be up to ~TTL + one refresh stale.** By design (PR #4 already accepted ≤TTL staleness);
   recency only moves on a commit, so this is invisible in practice. The background refresh closes it.
3. **`projectGoals` still re-reads the whole Plans folder once per project inside `goalsBoard`** (O(N²)).
   Measured ~4ms at this corpus — not touched here (explicitly out of scope), noted for a future pass if
   the Plans folder grows large.

## Improvements
- (Follow-up, logged) persist git recency to disk so even the first-load cold hit disappears across restarts.
- (Future, if Plans grows) read the Plans folder once in `goalsBoard` and derive per-project goals from it.

## Verdict
**pass.** The measured bug — a ~430ms `gh api` cold hit landing on the critical path of a goal write every
time the 60s TTL lapsed — is gone: reads now serve recency from cache instantly and refresh in the
background, so `getProjects()` is single-digit ms even right after expiry (17.7ms vs ~430ms). Correctness
is preserved (same dates; sticky against a transient null; concurrent cold callers share one compute) and
there's no API change to `getProjects`/`goalsBoard`/HUD. Safe on the branch behind draft PR #8.
