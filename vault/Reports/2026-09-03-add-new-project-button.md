---
type: report
project: Admin Brain
task: add new project button
date: '2026-09-03'
cycle: 2026-09-03-add-new-project-button
---

# Verification report — Admin Brain

**Task:** add new project button
**Branch:** `auto/add-new-project-button`

## What was tested
An independent adversarial pass against the DoD — run on the **real** `skills/vault/vault.js`
accessor (temp vault via `ADMIN_BRAIN_VAULT`) plus a **live browser** pass against the real HUD
(`hud/server.js` on a spare port). The point was to break creation: unsafe/edge-case names,
invalid enums, duplicate collisions, and the actual keyboard UI flow.

| # | Check | Result |
|---|-------|--------|
| U1 | `node --test` — valid create + safe defaults | ✅ pass |
| U2 | `node --test` — empty / multiline / duplicate rejected, no overwrite | ✅ pass |
| A1 | Path-traversal name `../../etc/passwd` → safe slug, no traversal file written | ✅ slug `etc-passwd`, no `..` |
| A2 | Symbols-only name (`!!!`) that slugifies to empty → rejected | ✅ rejected |
| A3 | Defaults when only a name is given → `planned` / `gray` / `med`, no `next` key | ✅ correct |
| A4 | Invalid `status` / `health` / `priority` → rejected, **no file written** | ✅ 3/3 rejected |
| A5 | Optional metadata (`repo`, `local_path`, `webapp_url`, `next`) → persisted in frontmatter | ✅ persisted |
| A6 | Newline in an optional field (`next`) → rejected, no file | ✅ rejected |
| A7 | Duplicate by differing case/whitespace (same slug) → rejected, **original note byte-intact** | ✅ intact, 1 file |
| A8 | Name length boundary — 120 ok, 121 rejected | ✅ both correct |
| B1 | Live UI: click `＋ NEW PROJECT` → form opens, `aria-expanded=true`, focus → name field | ✅ |
| B2 | Live UI: submit → 201, `✓ created`, form closes, row appears in PROJECTS **and** PROJECT GOALS | ✅ appears in both |
| B3 | Live UI: duplicate submit → inline `✗ a project with that name already exists`, form stays open, no dup row | ✅ |
| B4 | Live UI: empty name → blocked by HTML5 `required` (submit never fires) | ✅ |
| B5 | Console on load + through the flow → no JS exceptions / no broken resources | ✅ (see finding 1) |

Totals: **2/2** unit + **13/13** adversarial (accessor) + **5/5** live browser = all green.

## Findings (weaknesses / what broke)
Nothing broke; every DoD criterion holds. Honest, non-blocking notes:

1. **The validation-reject path returns HTTP 400**, which the browser logs as a red network line
   in the console even though the app handles it and renders the message inline. This is the
   **same convention** the existing `/api/project/add-goal` and `/api/project/delete-goal` routes
   already use, so it is consistent, not a regression. If a spotless console is ever wanted, the
   route could return 200 with `{ ok:false }` — deliberately not changed here to match the codebase.
2. **Status options in the form are a subset** (`planned`/`active`/`paused`) of what the accessor
   accepts (`blocked`/`done`/`archived` also valid). Intentional — a new project shouldn't start
   `done`/`archived` — but worth noting the accessor is the broader gate.
3. **No optional-metadata fields (repo/local_path/webapp) in the form yet** — the accessor supports
   them and they're covered by A5, but the UI only surfaces name/next/status/health/priority to keep
   the first cut small (as the Executor persona scoped). Logged as a natural follow-up.

## Improvements
- (Follow-up) optionally surface `repo` / `local_path` in the form so a new project gets git recency
  and IMPLEMENT wiring at creation time (accessor already accepts them).
- (Optional) return 200-with-`{ok:false}` on validation reject if a zero-console-error bar is desired.

## Verdict
**pass.** A user can create a project from the HUD by keyboard and see it immediately in both the
Projects and Project Goals panels; the note is written through the vault adapter with `type: project`
and valid defaults; every empty/multiline/unsafe/duplicate case is refused without disturbing an
existing note; no new dependencies or parallel state; automated + adversarial + live-browser checks
all green. Safe on the branch behind the draft PR.
