---
type: report
project: Admin Brain
task: add descriptions to feature goals
date: '2026-10-11'
cycle: 2026-10-11-add-descriptions-to-feature-goals
---

# Verification report — Admin Brain

**Task:** add descriptions to feature goals
**Branch:** `auto/add-descriptions-to-feature-goals`

## What was tested
- `node --test`: 100/100 pass.
- Temp-vault script against vault.js: legacy `_Goal:_` parses; a description is never counted as a goal (goal count unchanged; the milestone % regex needs a checkbox so it is unaffected); set/replace/clear round-trip (clear restores a byte-identical file); other blocks untouched; a description after Delivered lines is replaced in place; reorder / setProjectGoalKind / editProjectGoal carry it; deleteProjectGoal removes it with the block; CRLF files; 5000-char text; leading/trailing/embedded underscores; em-dash/unicode; HTML; `- [ ] fake`; `## Heading`; tabs; whitespace-only; null.
- Rejections: multi-line, unknown goal, empty goal, unknown project all return ok:false with the file unchanged.
- HTTP (HUD on :4199, copied vault): 200 on save and clear, 400 on unknown goal, bad JSON, multi-line; also tried number, object and null payloads.
- REFINE: assembleRefineBrief returns the description for the matching goal, '' when none, null for an unknown project. The CLI body line was reviewed by reading (not run, to avoid writing a Cycle note).
- Front-end read-through: esc/escAttr cover the description in both text and the data-description attribute; click handler order is safe (goal-desc-btn is checked before goal-edit, so the shared class is fine); poll guard works (isEditingGoal matches .goal-edit-input, which the textarea carries); the settled flag prevents a double save on Enter then blur.

## Findings (weaknesses / what broke)
1. LOW - skills/vault/vault.js:188 DESC_RX uses `.`, which does not match U+2028/U+2029. Such a description is written but reads back as '' (invisible), and a later set adds a second Description line. The HUD collapses whitespace client-side, but the route/API does not.
2. LOW - hud/server.js:341 `String(description ?? '')` turns an object payload into `[object Object]` and saves it (number 5 saves "5"). Should 400 on non-string.
3. LOW - skills/vault/vault.js:~450 clearing removes only the first Description line; a hand-edited duplicate second line survives and becomes the visible description.
4. INFO - Overwriting a legacy `_Goal:` line rewrites it as `_Description:` (documented, intended).
5. INFO - No length cap on descriptions.
6. INFO - Pre-existing, not from this change: projectGoals counts checkboxes in other sections (e.g. Risks) as goals.

## Improvements
1. Reject non-string description in the route (400); reject or strip U+2028/U+2029 (or use `[^\r\n]` matching) in the vault layer.
2. On clear, remove all Description/legacy Goal lines in the block.
3. Add tests for: unicode line separator, non-string payload, description after Delivered lines, delete carries the description.
4. Optional length cap (e.g. 500 chars).

## Verdict
pass-with-notes — every definition-of-done item verified; only low-severity input-hardening gaps found.

## Fixes applied after verify (master agent)
- **F1 fixed** — `DESC_RX` now uses `[\s\S]`, and `setProjectGoalDescription` rejects U+2028/U+2029 as line breaks, so a description can't be written and then read back empty.
- **F2 fixed** — `POST /api/project/goal-description` returns 400 for a non-string `description` (object/number) instead of saving `[object Object]`.
- **F3 fixed** — set/clear keeps at most one description line: it replaces the first in place and drops hand-edited duplicates.
- New regression test covers F1 + F3; `node --test` 101/101.
