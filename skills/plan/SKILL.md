---
name: plan
description: Turns a stated goal for a project into a plan note at vault/Plans/<slug>.md. Use when the user says "make a plan", "plan out X", or "break this goal into steps". Scaffolds a contract-valid plan with a goal, checkboxed steps, risks, horizon (day/week/month/quarter), and status. The helper accepts the goal, project, steps, and risks as arguments; the agent supplies the real substance.
---

# plan

Turns intent into a structured, checkable plan note (`docs/DATA-CONTRACT.md`
section 6). The agent decides the actual steps and risks; the helper guarantees
the file is well-formed and lands in the right place with the right frontmatter.

## When to use

- The HUD "plan" command, or the user asks to plan a goal for a project.
- Breaking a project's `next` action or a larger objective into steps.

## Procedure

1. Identify the **project** (should match an existing project name) and the
   **goal** (one-line outcome).
2. Choose a **horizon**: `day` | `week` | `month` | `quarter`.
3. Draft the **steps** (each becomes a `- [ ]` checkbox) and any **risks**.
4. Run the helper with those as arguments (below). It reuses the vault skill's
   helper for slug + serialization and writes `vault/Plans/<slug>.md`.
5. The slug defaults to a kebab-case of the goal; pass `--slug` to override. The
   helper refuses to overwrite an existing plan unless `--force` is given.
6. As work proceeds, tick the checkboxes and set `status: active` → `done`.

If steps or risks are omitted, the helper fills clearly-placeholder content so the
file is still valid — but prefer supplying real steps.

## Helper — `plan.js`

```bash
# From skills/plan/
node plan.js --project "<name>" --goal "<outcome>" \
  --horizon week \
  --step "first step" --step "second step" \
  --risk "a risk"

# Flags: --status draft|active|done  --slug <name>  --force  --dry
```

## Usage example

```bash
$ node plan.js --project "Admin Brain" --goal "Ship HUD v1" --horizon week \
    --step "Wire skills to vault reader" \
    --step "Build command-deck HUD" \
    --step "Verify end-to-end brief flow" \
    --risk "Frontmatter parser drifts from data contract" \
    --risk "Scope creep on HUD visuals"
Created plan "ship-hud-v1"
  -> C:\Users\liamm\Admin-Brain\vault\Plans\ship-hud-v1.md
---
type: plan
created: 2026-08-05
project: Admin Brain
horizon: week
status: draft
---

## Goal
Ship HUD v1

## Steps
- [ ] Wire skills to vault reader
- [ ] Build command-deck HUD
- [ ] Verify end-to-end brief flow

## Risks
- Frontmatter parser drifts from data contract
- Scope creep on HUD visuals
```
