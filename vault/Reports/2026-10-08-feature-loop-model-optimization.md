---
type: report
project: Admin Brain
task: Feature Loop model optimization
date: '2026-10-08'
cycle: 2026-10-08-feature-loop-model-optimization
---

# Verification report — Admin Brain

**Task:** Feature Loop model optimization
**Branch:** `auto/feature-loop-model-optimization`
**Verifier:** T4, an independent adversarial sub-agent that did not write the code. It made no source, test or skill edits. All probes ran against temp vaults (`ADMIN_BRAIN_VAULT`) under `%TEMP%\t4orch*`, and the real `vault/Cycles` hash was unchanged afterwards.

## What was tested
Change under test: `git diff main..HEAD` has 3 commits (`25ae0be`, `2fd69d8`, `80d7633`) and changes 7 files. They add `skills/orchestrate/{orchestrate.js,SKILL.md}` and `test/orchestrate.test.js`, plus wiring in `skills/implement/SKILL.md`, `skills/README.md` and `package.json`.

1. **Full suite:** `npm test` gives **84/84 pass, 0 fail**.
2. **Pure functions with adversarial input** (`%TEMP%\t4orch\pure.mjs`):
   - **Rejected:** NaN, Infinity, 2^60 and string scores. Also rejected: `__proto__` and `constructor` keys in scores, in attrs and in `ADMIN_BRAIN_TIER_MODELS` (`'{"__proto__":{"light":"x"}}'` gives `unknown tier "__proto__"`), along with numeric, `null`, `5` and array overrides.
   - **Accepted:** `-0`, which is treated as 0.
   - **Coercion:** ids and titles are coerced with `String()`. Unicode, RTL-override characters and 100k-character titles render on one line. A `## ` sequence inside a title stays inside a table cell and cannot become a heading.
3. **Verify independence:**
   - Lifting works. A verify task listed before the implement task is still lifted. A verify task with `status: skipped` is accepted.
   - Overrides can defeat the model floor (see F2).
4. **`upsertSection`** (`upsert.mjs`, `fence2.mjs`):
   - Handled: headings with trailing spaces, CRLF bodies, the section being last in the file, `###` subheadings, a missing `## Implementation`, and a case-mismatched heading.
   - Idempotent over 4 runs with both LF and CRLF.
   - Problems: code-fence awareness (F1), duplicate sections, and indented "headings" in code blocks.
5. **CLI end to end** (`cli.mjs`, `misc.mjs`, temp vault):
   - Stage gate: `refine/approved` and `implement/active` are written. Seven other stage/status pairs are refused with exit 2 and the file left byte-identical: refine/awaiting-approval, select/*, implement/approved, verify/verifying, review/awaiting-review, done/merged, refine/active.
   - Malformed plans exit 3 with "nothing written" and nothing on disk: bad JSON, a missing file, a directory, bad scores, no verify task, a UTF-8 BOM, a bad env override, and `--plan --dry-run`. A missing `--plan` value exits 1 with usage.
   - `--dry-run` writes nothing.
   - Re-running is idempotent: 4 runs give identical bytes.
   - Frontmatter keeps every key and value, and the only key added is `orchestrated: true`. YAML is re-serialised in the adapter's usual style.
   - `--cycle` pointing at another project's cycle is refused.
   - `--cycle` path traversal is blocked (`../secret`, `..\secret`, an absolute path, `sub/../x`), because the name must equal a `readdir` entry.
   - Two open cycles for one project: the newest filename wins (see F4).
   - The `SKILL.md` example plan parses and routes as documented: impl-auth scores 7 (heavy/opus), and verify-auth is lifted from standard to heavy/opus.
6. **SKILL.md vs code:** these all match: `GO_THRESHOLD` 7, the blockers, the size-0 split, `KIND_BASE` (0/1/3/1), the file bands (0–1, 2–4, 5+), novel +2, the levels, the tier cut-offs (≤1, ≤4), the floors, the `TIER_MODELS` table, and the CLI flags. The mismatches are listed under F4 and F8.

## Findings (weaknesses / what broke)
Ranked by severity. None breaks the stated DoD outright.

**F1 — MEDIUM. `upsertSection` ignores code fences, and cycle notes embed READMEs in fences.**
- **Why it matters:** Cycle notes paste the project README inside a fence under "## Project goal". This cycle's own note does, at lines 18–136.
- **What goes wrong:**
  - If the README has a `## Implementation` heading (a common one), the first Feasibility/plan insert lands inside the README fence. The plan then renders as code.
  - If the README has a `## Feasibility` or `## Orchestration plan` heading, that README text is replaced and its closing fence is eaten. The rest of the note then renders as code, and the real section is never updated.
  - A ```` ``` ```` fence inside the plan section that contains a `## ` line truncates the replacement and leaves a dangling fence.
- **Repro:** `node %TEMP%\t4orch\fence2.mjs`. The body is `## Project goal\n```\n# Readme\n## Implementation\nreadme text\n```\n…\n## Implementation\n- branch: b`. The output has `## Feasibility` and `## Orchestration plan` inside the README fence.
- **Related, lower severity:**
  - An indented `    ## Feasibility` (an indented code block) matches because of `.trim()`.
  - Duplicate `## Feasibility` sections: only the first is replaced.

**F2 — MEDIUM (design gap). `ADMIN_BRAIN_TIER_MODELS` can route verify below sonnet, or below the implementer's model.**
- **What goes wrong:** The independence rule is applied to tiers, but the model is resolved through overrides afterwards.
  - `{"heavy":"haiku"}` with a design task sends both implement and verify to haiku.
  - `{"light":"opus","standard":"haiku"}` sends the implementer to opus and the verifier to haiku.
- **Why it matters:** The spec says "tier ≥ the highest implement tier (**minimum `sonnet`**)", and the DoD says "verify is never below `sonnet`". Overrides break both silently. Overrides are operator-set, so this is not an attack surface, but the guarantee holds only for tiers.
- **Repro:** `buildPlan({feasibility:{clarity:2,size:2,cost:2,risk:2,testability:2},tasks:[{id:'d',title:'d',kind:'design',files:1,novel_design:false,ambiguity:'low',risk:'low'},{id:'v',title:'v',kind:'verify',files:1,novel_design:false,ambiguity:'low',risk:'low'}]},{heavy:'haiku'})` gives verify `heavy` → `haiku`.

**F3 — LOW–MEDIUM. Override values are not sanitised, which corrupts the table and grows the note on every run.**
- **What goes wrong:** `id`, `title` and `note` are sanitised for `|` and newlines, but the model alias is not.
  - A newline in an override injects a real `## ` heading into the cycle note.
  - Because `upsertSection` ends the section at that heading, every re-run adds another copy, so idempotency breaks.
  - `|` splits a column, and a backtick breaks the code span.
- **Repro:** `ADMIN_BRAIN_TIER_MODELS='{"light":"haiku\n## Injected heading","standard":"son|net"}'`, then run the CLI 3 times. The note ends up with 3 `## Injected heading` blocks (`cli.mjs` step 8).

**F4 — LOW–MEDIUM. Open-cycle discovery picks the newest filename without filtering for writability.**
- **What goes wrong:** "Open" means only `status ∉ {done, abandoned}`. A newer cycle for the same project that is `refine/awaiting-approval` or `done/merged` hides an older `implement/active` one, and the run fails with exit 2. `status: merged` existed in the real vault until the uncommitted edits.
- **Silent choice:** When two cycles are both writable, the newest is written with no warning.
- **Doc mismatch:** SKILL.md says "finds latest open cycle".
- **Repro:** fixtures `2026-10-01-old` (implement/active) and `2026-10-05-new` (done/merged), then `--project P` gives `Cycle 2026-10-05-new.md is done/merged …`. The workaround is `--cycle`.

**F5 — LOW. The CLI path has no automated tests.**
- **What is missing:** `test/orchestrate.test.js` imports only the pure functions. `findCycle`, the stage refusal, the no-partial-write path, real env-var reading and CLI idempotency are all untested.
- **Status:** All of them were verified by hand here, but nothing stops a regression.

**F6 — LOW. A plan file with a UTF-8 BOM is rejected with a confusing error.**
- **Why it matters:** On this machine, Windows PowerShell 5.1 `Out-File` and `Set-Content -Encoding utf8` both write a BOM.
- **Repro:** write `﻿{…}`. The CLI prints `Plan rejected (nothing written): Unexpected token '﻿'…`. It fails safe.

**F7 — LOW. A sibling cycle note with malformed YAML crashes discovery with an uncaught js-yaml stack trace** (exit 1). Nothing is written. Repro: `Cycles/2026-10-09-broken.md` containing `project: [unclosed` (`cli.mjs` step 11).

**F8 — LOW. Smaller items.**
- **Lax validation:**
  - `ambiguity`/`risk` go through `String()`, so `["low"]` and `{toString(){return 'high'}}` are accepted.
  - Object ids and notes become `"[object Object]"`.
  - Verify ordering ("Verify last") is not enforced.
  - A plan whose only verify task is `skipped` passes the independence check.
- **Behaviour that needs a note:**
  - A `no-go` plan is still written with exit 0. This is consistent with "advisory", but SKILL step 3 says to write only on go or human approval, and nothing warns.
  - Writing into a CRLF note produces mixed CRLF/LF line endings (cosmetic, since `core.autocrlf=true` normalises it).
  - An unquoted `started: 2026-10-01` is re-serialised as `2026-10-01T00:00:00.000Z`. This is pre-existing adapter behaviour shared with every `upsertNote` skill.
- **Documentation:**
  - The SKILL override example uses bash `export`, but this is a PowerShell machine.
  - The cycle note's checkpoint log has timestamps out of order (18:27, then 14:31).

## Improvements
1. **(F1)** Make `upsertSection` fence-aware. Skip lines between ```` ``` ````/`~~~` fences when searching for the heading, the next `## ` and `## Implementation`. Match only unindented `## ` lines. Add regression tests that use a fenced README containing `## Implementation` and `## Feasibility`.
2. **(F2)** Enforce the floor on models as well as tiers. After routing, if the verify model's rank (unknown aliases rank last) is below `max(implement model, sonnet)`, either reject or force `TIER_MODELS` for verify and print a warning. At minimum, document in SKILL.md that overrides bypass the verify-strength guarantee.
3. **(F3)** Validate override values in `parseTierOverrides` against `/^[\w.\-:\[\]]+$/`, or strip `\r\n|` and backticks the same way `note` is stripped.
4. **(F5)** Add CLI tests that spawn the script with `ADMIN_BRAIN_VAULT` set to a temp dir. Cover the stage refusal (file unchanged), a malformed plan (exit 3, file unchanged), idempotency over 3 runs, `--cycle` belonging to another project, and an env override.
5. **(F4)** In `findCycle`, choose the newest writable open cycle. Treat `merged` (or any `stage: done`) as closed. Warn when more than one candidate exists.
6. **(F6/F7)** Strip a leading BOM before `JSON.parse`. Wrap `readNote` in `findCycle` in try/catch so a broken sibling note is skipped with a warning.
7. **(F8)** Validate types strictly (`typeof v === 'string'`) for levels, ids and titles. Print a warning line when the verdict is not `go`.

## Definition of done
| DoD item | Status | Evidence |
|---|---|---|
| SKILL.md documents the rubric, attributes, tier rules, dispatch, verify independence, and that feasibility is advisory | **Met** | All sections are present, and the numbers match the code (§6). Small doc gaps are in F4 and F8. |
| `orchestrate.js` exports `assessFeasibility`, `classifyTask`, `routeModel`; pure; no network or new deps | **Met** | All are exported. The pure functions do no I/O. Imports are `node:fs`, `node:path` and the existing adapter. `package.json` deps are unchanged (only the `orchestrate` script was added). |
| Unit tests cover verdict boundaries, each tier, verify ≥ sonnet and ≥ max implement tier, env override, malformed input rejected (no partial write) | **Partially met** | Boundaries, tiers, lifting and malformed-input rejection are tested (64 tests). The env override is tested only through `parseTierOverrides`/`buildPlan`, not the env var. "No partial write" is not tested; it holds by construction (validation happens before `findCycle`) and was verified by hand. "Never below sonnet" holds for tiers but not for models under overrides (F2). |
| CLI writes `## Feasibility` + `## Orchestration plan` idempotently; refuses a wrong-stage cycle | **Met**, with caveats F1 and F3 | 4 runs give identical bytes. 7 wrong stage/status pairs are refused with exit 2 and the file unchanged. Edge cases outside the DoD break: fenced README (F1) and an override containing a newline (F3). |
| implement SKILL.md + skills/README.md reference the skill; full suite green | **Met** | Both diffs reference `orchestrate`. `npm test` gives 84/84. |
| Dogfood: this cycle's IMPLEMENT ran through orchestrate, with plan/log recorded | **Met** | The cycle note has `orchestrated: true`, a `## Feasibility` section (go, 10/10) and a `## Orchestration plan` table T1–T4, where T4 verify is lifted from standard to heavy (`opus`). The checkpoint log is present, though its timestamps are out of order. |

## Verdict
**pass-with-notes.**

The harness is correct for everything the DoD specifies, and it is robust to hostile scores, attrs and prototype keys. Path traversal through `--cycle` is not possible, and a rejected plan never writes. Before merge, I would want three things:
- **F1:** a fence-aware `upsertSection`. This is a real risk, because cycle notes routinely embed READMEs.
- **F2:** a decision on whether overrides may weaken the verifier. A model-level guard is cheap.
- **F5:** CLI tests, so the gate and no-write guarantees do not regress silently.

## Post-verify fixes (master agent, same branch)
Applied after this report and before the PR. Each fix has a regression test in `test/orchestrate-verify-fixes.test.js`:
- **F1:** `upsertSection` is now fence-aware (it skips headings inside ```` ``` ````/`~~~`) and normalises CRLF.
- **F2:** a model-level guard. A verify task routed to a known alias below sonnet, or below the strongest implementer, is rejected. Unknown IDs are not ranked. SKILL.md documents this.
- **F3:** override values must match `/^[A-Za-z0-9._:[\]-]+$/`, so no newlines, pipes or backticks reach the table.
- **F4:** `findCycle` prefers the newest *writable* cycle, warns when more than one is writable, and skips sibling notes with broken YAML.
- **F5:** CLI tests spawn the script against a temp `ADMIN_BRAIN_VAULT`. They cover idempotency, frontmatter preservation, wrong-stage refusal, malformed plans with nothing written, `--dry-run`, `--cycle` set to another project or a traversal path, and the env override end to end.
- **F6/F8:** a BOM-prefixed plan is accepted; levels must be real strings; a non-`go` verdict prints a warning.
- **Docs:** the override example now uses PowerShell syntax.
- **Not changed:** the checkpoint timestamps are out of order because implement.js logs UTC while the master logged local time. This is cosmetic.

Suite after fixes: **95/95**. These fixes have not been re-verified by an independent pass. The reviewer should treat them as master-agent work.
