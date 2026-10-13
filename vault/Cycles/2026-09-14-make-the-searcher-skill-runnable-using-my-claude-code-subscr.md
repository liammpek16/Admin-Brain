---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
verdict: pass-with-notes
pr: 'https://github.com/liammpek16/job-hunt/pull/7'
approved: '2026-09-14'
task: >-
  make the searcher skill runnable using my claude code subscription rather than
  api credits.
started: '2026-09-14'
readme_source: 'https://github.com/liammpek16/job-hunt'
branch: auto/make-the-searcher-skill-runnable-using-my-claude-code-subscr
target_path: 'C:/Users/liamm/job-hunt'
report: 2026-09-14-make-the-searcher-skill-runnable-using-my-claude-code-subscr
---

## Task (from SELECT)
make the searcher skill runnable using my claude code subscription rather than api credits.

## Project goal — source: https://github.com/liammpek16/job-hunt
```
# Job Hunt / Recruiter Helper

A personal agent that runs my job search end to end — from sharpening my resume to finding
roles, tailoring applications, pre-screening them the way a recruiter's ATS would, and tracking
the pipeline through to a first interview.

## Ultimate goal

The full workflow the agent should support:

1. **Resume review.** Take in my resume and review it against the **Google XYZ format**
   ("Accomplished **X** as measured by **Y** by doing **Z**"). Suggest improvements and,
   **after my approval**, implement them.
2. **Job search.** Given my desired **job title, location, and salary range**, search
   LinkedIn and/or Indeed for roles matching that profile. Surface **at least 100 jobs**.
   Show me the list; I pick the ones I want to apply to.
3. **Resume tailoring.** For each job I select, tailor my resume to that job description —
   again following the Google XYZ format.
4. **ATS check.** Act as an **ATS scanner** and check every tailored resume for weaknesses
   that would get it auto-rejected (keywords, formatting, parseability), and report them.
5. **Track & land.** Track jobs applied to and interviews completed on a dashboard, and drive
   the whole thing toward the real outcome: **a first interview**.

## Scope / roadmap

Each build target is a discrete skill (or, for the last two, a tracked outcome). Ordered as in
`Admin-Brain/vault/Plans/job-hunt-recruiter-helper-roadmap.md`:

| # | Target | Priority | Notes |
|---|--------|----------|-------|
| 1 | **Resume reviewer skill** — score/critique a resume against Google XYZ; propose rewrites | high | The shared XYZ rubric other skills reuse. Build first. |
| 2 | **Job searcher skill** — surface ≥100 roles for a given title/location/salary | high | The hard one — see Risks (anti-bot / ToS / data source). |
| 3 | **Resume customizer skill** — tailor the resume to a specific job description (XYZ) | med | Reuses the reviewer's rubric. |
| 4 | **ATS scanner skill** — flag ATS-rejection risks in a tailored resume | med | Reuses the reviewer's rubric. |
| 5 | **Pipeline test** — run the full pipeline end to end on my real resume | high | Needs a real resume as input. |
| 6 | **Dashboard** — track jobs applied to / interviews completed | — | Reporting layer over the pipeline. |
| 7 | **Get first interview** — the real-world outcome the whole project is for | — | The success metric, not a code task. |

## Conventions / definitions

- **Google XYZ bullet:** "Accomplished [X], as measured by [Y], by doing [Z]." Every resume
  bullet should be expressible in this shape, with a **quantified [Y]**. This rubric is the
  shared contract across skills 1, 3, and 4.
- **Inputs:** my resume (start with Markdown / plain text; PDF/DOCX parsing deferred), and a
  target profile (title, location, salary) and/or a specific job description.
- **Human gates:** resume edits (goal 1) and job selection (goal 2) require my approval — the
  agent proposes, I approve before anything is applied.

## Risks

- **Job-board access** (LinkedIn/Indeed) may hit anti-bot / ToS limits — reliably surfacing
  ≥100 roles is the hardest part and may need an official API or an alternate data source.
- **Over-editing** — "improvements" and "tailoring" need a real resume + approval gates so the
  agent proposes rather than silently rewrites.

## Status

Scoped; build not yet started. The **resume reviewer skill (goal 1)** is first, and its XYZ
scorer is the reusable core that goals 3–4 inherit.
```

## Council refinement
_5-persona council: gaps between the task and the project goal._

**Grounding.** The searcher (`skills/searcher/searcher.js`) is a pluggable-source CLI. Every
existing source (`lib/sources/adzuna.js`, `lib/sources/linkedin.js`) needs **paid/keyed API
credentials** (`ADZUNA_APP_ID/KEY`, `LINKEDIN_JOBS_API_KEY`) — that is the "api credits" the
user wants to stop paying for. The project note's own blocker: *"needs a key to live-run."*

- **Architect.** The clean fit is a NEW pluggable source `lib/sources/claude.js` implementing the
  same `fetchRoles(params, target, opts)` contract, so nothing else in the searcher changes. It
  must need **no API key**. The only $0 search capacity we have is **Claude Code itself (the
  subscription)** — so the source is a *handoff*, mirroring Admin Brain's established "$0 harness
  hands reasoning to Claude Code" pattern (the FEATURE LOOP gold "⤳ Claude" chips).
- **Pragmatist.** A JS source can't call Claude synchronously. Make it a **two-phase file
  handoff**: (1) `--source claude` with no results file present → the source writes a
  `data/claude-search-<slug>.request.json` spec + returns 0 roles so the CLI prints the exact
  Claude prompt and exits with a distinct "handoff pending" code; (2) Claude Code performs the
  web search and drops `data/claude-search-<slug>.results.json` (array in the shared role shape);
  re-running `--source claude` ingests+normalizes that file into the store. Zero credits, zero deps.
- **Skeptic.** Don't silently return fake/empty results and claim success — the "under target"
  exit code must still fire, and a pending handoff must be visibly distinct from a real 0-role
  result. Results Claude writes must be validated (shape, dedupe) before hitting the store.
- **Security.** No key means nothing to leak; results come from a local file Claude wrote, not a
  URL. Keep the store contract identical (customizer/ATS/dashboard read the same records).
- **User-advocate.** It must *auto-select* claude when no API key is present (so plain
  `node searcher.js --title ...` just works on the subscription), while `--source adzuna` still
  works if the user ever sets a key. Goal 2 (first real search: **NYC / "Sales Engineer"**) is
  the live proof and the natural verification of this goal.

**Gap vs. goal:** goal is "search LinkedIn/Indeed, ≥100 roles, I pick." This task doesn't change
*what* is searched — it changes the *engine* from a metered API to the Claude Code subscription.
The ≥100 bar and the human pick-gate are unchanged and inherited.

## Refined task spec
_A sharpened, branch-sized task._

Add a **`claude` job source** so the searcher runs on the Claude Code subscription with **no API
key/credits**, and make it the **auto-selected default when no API key is present**:

1. `lib/sources/claude.js` exporting `fetchRoles(params, target, opts)` + `credsPresent()` (always
   true — no creds needed) + helpers for the request/results file paths (slug from title+location).
2. Two-phase handoff: no results file → write a `.request.json` spec and throw a `HANDOFF_PENDING`
   coded error carrying the exact Claude prompt; results file present → read, validate, normalize
   (`source:'claude'`), dedupe, return `{roles, pages:1, total}`.
3. Wire `searcher.js`: `resolveSource` auto-selects `claude` when neither Adzuna nor LinkedIn keys
   are present (Adzuna remains the fallback only when its key IS set); handle the `HANDOFF_PENDING`
   code — print the prompt + the ingest command, exit with a new distinct code (`4`).
4. Tests in `test/` for the source (pending-handoff, ingest+normalize, dedupe, under-target) with
   no network/no key. Update `skills/searcher/SKILL.md`.
5. **Goal 2 live run:** Claude Code performs the first real search — **title "Sales Engineer",
   location "New York City"** — writes the results file, ingests via the claude source into the
   store, and surfaces the roles for the user to pick.

## Definition of done
_Clear, testable completion criteria._

- `node skills/searcher/searcher.js --title "Sales Engineer" --location "New York City"` with **no
  API keys set** does NOT exit code 3 (missing creds); it uses the `claude` source automatically.
- The claude source needs no environment credentials and touches no paid API.
- First invocation emits a copy-pasteable Claude search prompt + a request file and exits with the
  handoff code (distinct from under-target `1` and no-creds `3`).
- After Claude writes results, re-running ingests them into `data/jobs.json` in the shared role
  shape (`source:'claude'`), deduped; the customizer/ATS/dashboard read them unchanged.
- New unit tests pass alongside the existing suite (`npm test`).
- **Goal 2:** a real NYC "Sales Engineer" search is run through this source, roles land in the
  store, and the list is surfaced for the user to pick from (no auto-apply — the human gate holds).

## Implementation
- branch: `auto/make-the-searcher-skill-runnable-using-my-claude-code-subscr` in `C:/Users/liamm/job-hunt` (off `main`) — never touches main
- started: 2026-09-14T23:07

### Checkpoint log
- 2026-09-14T23:07 — branch created; supervised implementation started.
