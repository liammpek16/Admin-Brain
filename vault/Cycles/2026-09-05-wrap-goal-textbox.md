---
type: cycle
project: Admin Brain
stage: verify
status: done
verdict: pass
scope: goals-board UX (single goal)
task: >-
  Make editing and writing goals have wrapped text in the text box
started: '2026-09-05'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/wrap-goal-textbox
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-05-wrap-goal-textbox
---

## Task (from SELECT)
Long goal text runs off the right edge of the one-line goal boxes. Make both the add-a-goal field
and the inline ✎ rename field wrap their text so the whole goal is visible while typing/editing.

## REFINE
Root cause: both fields are `<input>` elements, which are inherently single-line and never wrap.
Fix: convert both to `<textarea>` that soft-wraps (`white-space: pre-wrap; overflow-wrap: anywhere`)
and auto-grows to fit its content. Constraints kept: goals stay SINGLE-LINE data (the vault rejects
`\r\n`), so Enter still SUBMITS (preventDefault → no inserted newline) and wrapping is purely visual
(soft-wrap, no `\n` in the value). All the existing goal-field machinery must keep working: draft
persistence (`.goal-input` class retained), caret restore, the 20s-poll skip-while-editing guard,
and the inline-edit commit/cancel. Front-end only; $0/no-LLM/no deps.

## IMPLEMENT (branch auto/wrap-goal-textbox)
- `hud/public/app.js` — add field rendered as `<textarea class="goal-input" rows="1">`; inline edit
  builds a `<textarea class="goal-edit-input" rows="1">`; new `autoGrowGoalField(el)` (height→auto
  then scrollHeight) called on `input` for both classes, on the created edit box, and per add-field
  after each render (fits a restored draft or resets to one row).
- `hud/public/style.css` — `.goal-input` / `.goal-edit-input` gain `resize:none; overflow:hidden;
  white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.35`; `.goal-add` set to
  `align-items:flex-start` so the +Add button / kind-select don't stretch beside a multi-line box.

No vault/server change — the class names and single-line submit contract are unchanged, so
add/edit/draft/reorder all behave exactly as before, just wrapped.

## VERIFY — verdict PASS
- `node --test` → 20/20 (no logic changed; suite still green).
- Live browser (localhost:4173): add field is a textarea, `white-space:pre-wrap`, `resize:none`;
  typing a long goal grows the box (multi-line) with NO horizontal scroll; ✎ opens a textarea that
  wraps a 173-char goal and auto-fits; no console errors.

Findings (minor): a multi-line PASTE could still carry newlines into the value — the vault's existing
single-line guard rejects it with an error (unchanged behavior), so no new risk. Nothing to follow up.
