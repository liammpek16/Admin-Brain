---
type: report
project: Admin Brain
task: Fix HUD latency — cache + parallelize git-recency lookups
date: '2026-08-12'
cycle: 2026-08-12-fix-latency-issue-with-writing-new-project-goals-in-the-admi
verdict: pass
---

# Verification report — Admin Brain (goal-writing latency)

**Task:** fix latency issue with writing new project goals in the admin brain
**Branch:** `auto/fix-latency-issue-with-writing-new-project-goals-in-the-admi` · **PR:** Admin-Brain #4

## Root cause (measured)
`addGoal` → `Promise.all([loadOverview, loadGoals])` → each calls `getProjects()`, which awaited
`lastGitActivity(repo)` **sequentially** — a `gh api` network call per GitHub-repo project.
`getProjects()` timed **~800–975 ms every call, uncached**; a single add-goal ≈ 2 s / ~4 round-trips,
and the same tax on every 20 s poll.

## What was tested
| # | Check | Result |
|---|-------|--------|
| P1 | `getProjects()` cold (parallel) vs old serial | ✅ 449 ms (was ~800–975) |
| P2 | `getProjects()` warm (cache hit) | ✅ 2 ms |
| P3 | add-goal concurrent pair (overview+goals) | ✅ 3 ms warm (was ~1.6–2 s) |
| P4 | Live HUD: `/api/overview` warm / add-goal round-trip | ✅ 6 ms / **171 ms** (was 1788 ms) |
| P5 | `getProjects()` output identical cold vs warm (fields, activitySource, daysSince) | ✅ |
| V1 | Cached value **equals** a fresh lookup (not stale/garbage); warm < cold | ✅ |
| V2 | **De-dupe** — two immediate `lastGitActivity(repo)` return the *same promise* | ✅ |
| V3 | **TTL expiry** — after the TTL, a call re-fetches (slower than a warm hit) | ✅ 0 ms → 82 ms |
| V4 | `clearRecencyCache()` forces a refetch; empty/null repo → `null` (uncached) | ✅ |
| V5 | No-repo projects (Betting, Stock) still fall back to note mtime (`activitySource: note`) | ✅ |

## Findings
No defects. One intentional trade-off, by design and documented:

1. **Recency can be up to the TTL (60 s) stale.** A commit made in the last minute may not show until
   the cache entry expires. Acceptable — recency only moves on a commit, the HUD isn't a git client,
   and `clearRecencyCache()` (or a lower `ADMIN_BRAIN_RECENCY_TTL_MS`) is available if immediacy is
   ever wanted. Net: the HUD stops phoning GitHub on every refresh, for a bounded, harmless staleness.

## Verdict
**pass.** Fixes the source of the lag — the repeated, serial, uncached git-recency network calls —
by parallelizing (`Promise.all` in `getProjects`) and TTL/promise-caching (`lastGitActivity`), which
also de-dupes the concurrent overview+goals fetches. Add-goal drops **1788 ms → 171 ms**, warm reads
**~800 ms → ~6 ms**, output unchanged, cache correctness + expiry + fallback all verified. Speeds up
the whole HUD (poll, brief, metrics), not just add-goal. Safe on the branch behind draft PR #4.
