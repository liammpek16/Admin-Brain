---
type: report
project: Admin Brain
task: Guarded delete-note control in the HUD
date: '2026-08-12'
cycle: 2026-08-12-delete-notes
verdict: pass
---

# Verification report — Admin Brain (delete notes)

**Task:** delete notes → a guarded HUD control to remove accumulating vault records
**Branch:** `auto/delete-notes` · **PR:** Admin-Brain #6

## What was tested
A destructive feature, so the pass leans hard on the guards. All tests used **throwaway** notes;
real notes were checked intact throughout.

| # | Check | Result |
|---|-------|--------|
| G1 | Reject disallowed folders — `Projects`, `Plans` | ✅ 400 "folder not deletable" |
| G2 | Reject path traversal / absolute / slashes (`../…`, `C:\…`, `sub/x`) | ✅ "bad note name" |
| G3 | Reject `..` (bare) and empty name | ✅ |
| G4 | Reject **Windows backslash** traversal (`..\Projects\…`) | ✅ |
| G5 | **Case-sensitive** allowlist — `cycles`, `CYCLES`, `reports` all rejected | ✅ |
| G6 | Reject a nonexistent file | ✅ |
| G7 | **Reject an in-flight (non-done) cycle** | ✅ "cycle is in-flight (active)…" |
| P1 | Delete a throwaway **done** cycle + report + Daily cache — via the function | ✅ gone |
| P2 | Same via the **endpoint** `POST /api/note/delete` | ✅ gone |
| P3 | **UI ✕** on a completed cycle → confirm → deletes report + cycle → row disappears | ✅ "report ✓ · cycle ✓" |
| P4 | `.md`-less name appends `.md` and deletes | ✅ |
| S1 | After the whole run: 13 real cycles + `Projects/`/`Plans/` notes **all intact** | ✅ |
| S2 | Front-end only touches server/vault via the guarded endpoint; $0/no-LLM | ✅ |

## Findings
No defects; the guards hold on every path tried (allowlist, path-safety incl. Windows separators,
case sensitivity, in-flight protection). Minor notes, not blockers:

1. **Reports/Daily/Metrics have no status guard** (any file in those folders is deletable). Reachable
   only via the raw endpoint — the **UI exposes delete only on completed cycles** — and everything is
   git-recoverable, so this is acceptable for a personal localhost tool. Worth knowing if the endpoint
   is ever driven directly.
2. **Orphan report possible via the raw endpoint** (deleting a cycle note alone leaves its report).
   The UI deletes both together, so it doesn't arise in normal use.

## Verdict
**pass.** A safe, guarded delete: a folder allowlist (Cycles/Reports/Daily/Metrics — never core
data), path-safety against traversal/absolute/Windows separators, a case-sensitive check, an
in-flight-cycle protection, and a UI confirm — with git as the recovery net. Positive paths work via
function, endpoint, and the ✕ UI; core notes proven undeletable. Safe on the branch behind draft PR #6.

---

## Re-verification after course correction (delete a GOAL, in the goals panel)
The feature was redirected at review to **delete a roadmap goal from the PROJECT GOALS panel** (the
note-file delete was removed). Re-tested against the reshaped code, throwaways only.

| # | Check | Result |
|---|-------|--------|
| V1 | `deleteProjectGoal` rejects unknown project / unknown goal / empty text (no write) | ✅ |
| V2 | Deletes a **done** goal and takes its indented `_Delivered_` sub-line with it | ✅ |
| V3 | Sibling goals + the `## Goal` preamble untouched after a delete | ✅ |
| V4 | `reorderProjectGoals` still works after the `parseSteps`/`writeSteps` refactor | ✅ |
| V5 | Reorder still rejects a non-permutation | ✅ |
| E1 | `POST /api/project/delete-goal` — goals listed via `/api/goals` | ✅ |
| E2 | Unknown project → **400**, nothing deleted | ✅ |
| E3 | Unknown goal → **400**, nothing deleted | ✅ |
| E4 | Delete a real goal → **200**, `/api/goals` no longer lists it; siblings intact | ✅ |
| S1 | Live HUD serves the new app.js/style.css (goal ✕ in; note ✕ out) | ✅ |
| S2 | Only vault change on disk is the pre-existing roadmap edit | ✅ |

**Re-verdict: pass.** Removing a goal is a bounded, git-recoverable roadmap edit; guards refuse
unknown targets and the refactor kept reorder intact. The note-file delete endpoint/allowlist were
removed, closing the "loose destructive endpoint with no UI" concern raised in the original council.
