# Admin Brain — Implementation Plan

> A personal **second brain + command center**: an interface to talk to about my
> projects and see, at a glance, how all of them are doing. Obsidian vault as the
> brain, a set of skills as the hands, a read-only overview (and later HUD) as the face.

Status: **building** — Phase 0 (Obsidian-native dashboard) ✅, Phase 1 (vault accessor +
`brief`) ✅, Phase 2 (metrics · inbox · trends · plan) ✅. Next: Phase 3 (read-only HUD, only
for gaps Bases can't fill). Repo: `liammpek16/Admin-Brain` (private). Last updated: 2026-08-07.
Shaped by **two** LLM Council reviews (design, then cost/tooling — see §11).

---

## 1. What we learned from v0 (why we restarted)

- **The Obsidian brain was hand-rolled instead of adopted.** v0 authored a bespoke
  access layer *and* a bespoke frontmatter parser from scratch. New direction: **adopt
  reputable third-party tools; own only a thin adapter.** (Sourcing now decided — §6.)
- **Scope was too broad for a v1.** Ship a vertical slice before adding surface.
- **Value is capped by data freshness.** Minimize hand-entered data; derive the rest.
- **The HUD's vitals/audio were the lowest-value, highest-effort parts** — deferred. And
  the HUD itself may not be needed if Obsidian can render the overview (§6, §7).

## 2. The core insight

The real job is **reducing the uncertainty of not knowing where my projects stand** — a
*truth-and-trust* problem, not a software problem. Ground truth already lives in real
sources (git activity, the calendar, my head). So:

> **Minimize what a human types to the three things a machine can't infer —
> `health`, `priority`, `next` — and derive everything else** (recency, activity, progress
> signals). The vault is a **derived cache / output, not a hand-kept ledger.**

## 3. Cost model — the $0 core (primary constraint)

**Goal: the whole core loop runs on zero API credits.** What actually costs money is
**tokens through a metered endpoint.** Compute, disk, git, and the browser's speech engine
are free on hardware I already own. Therefore:

- **Hard rule: no LLM in any deterministic path.** `metrics`, `trends`, and the brief's
  *data assembly* are plain Node functions over vault state → **$0, always.**
- **The LLM lives behind a boundary** so ~95% of the system runs credit-free and the model
  is an optional garnish that can be switched off.
- **v1 conversation is manual, through Claude Code** — no API key, no cloud agents.
  (Note: Claude Code still draws on my *plan usage* — it isn't literally free, so keep the
  chat a deliberate action, not a background loop.)
- **When an LLM is used, feed it code-computed summaries, not raw notes** — small context
  in, small tokens out. The cheapest token is the one never sent.
- **Schedule locally** (Windows Task Scheduler → `node brief.js`), never a cloud agent.
- **Free-tier data APIs only for light status signal, and only once a project is started.**
- **Local-first is both the cheapest and the most private architecture** — same design wins both.
- **Ollama (local LLM) is an optional, zero-marginal-cost prose upgrade — never a dependency.**

## 4. Architecture

```
Admin-Brain/
├── plan.md
├── docs/DATA-CONTRACT.md          # shared schema (Phase 1)
├── vault/                         # THE BRAIN — derived cache, source of truth
│   └── Projects/ Inbox/ Daily/ Metrics/ Trends/ Plans/
├── adapters/obsidian/             # thin OWNED wrapper over filesystem access (§6)
├── skills/                        # THE HANDS (deterministic; no LLM)
│   ├── vault/                     #   the ONE accessor, built on the adapter
│   └── metrics/ inbox/ trends/ plan/
└── hud/                           # THE FACE — built ONLY for what Obsidian can't show
```

**Data flow:** git + minimal human input → skills derive & write vault notes → Obsidian
(Dataview/Bases) and/or a thin HUD render them → I talk to the system via Claude Code to
ask "how's everything doing?" and trigger skills.

## 5. Tracked projects (day-one content)

| Project | Status | Notes / likely free signal source (deferred until started) |
|---|---|---|
| **Dota Coach** | active (started) | OpenDota API (free) for match data, later. |
| **Betting Analysis** | not started | The Odds API / sports data free tier, later. |
| **Stock Market Analyzer** | not started | Free market data (Alpha Vantage / stooq / Finnhub free), later. |
| **Job Hunt / Recruiter Helper** | not started | n/a — status tracking only for now. |

Only **Dota Coach** has real activity to derive from in Phase 1; the other three are
tracked as status-only until they start.

## 6. Tooling & capability assessment (grounded)

| Need | Decision | Approach |
|---|---|---|
| **Obsidian — code accessor** | ✅ **Resolved: filesystem base** | Read/write vault files directly, wrapped in `adapters/obsidian/` so skills depend on a stable internal interface. Works 24/7 even when Obsidian is closed. The Local REST API plugin / a community MCP server can be added *later* for live-app features. (No Obsidian MCP connector exists in the registry — verified.) |
| **Obsidian — Claude's use** | ✅ Adopt 3rd-party | Download **kepano/obsidian-skills** for conventions (Bases, Canvas, Markdown flavor, wikilinks). Vet before install. |
| **Frontmatter parsing** | ✅ Adopt lib | **`gray-matter`** — stop hand-rolling the parser (the v0 mistake). |
| **Derive activity from git** | ✅ Adopt lib | **`simple-git`** — recency/commit-cadence signals per repo. First real derivation source. |
| **Live UI updates** | ✅ Adopt lib | **`chokidar`** — file-watch the vault instead of polling. |
| **Dashboard (maybe no HUD)** | ⭐ Try first | **Obsidian Dataview + Bases** may render the whole overview natively, free — possibly deleting the HUD component. Evaluate before building any HUD. |
| **Vault versioning** | ✅ Optional adopt | **Obsidian Git** plugin — auto-version the brain. |
| **Action layer** | Optional | **Obsidian Tasks / Templater** — query-able todos + note scaffolding, if wanted. |
| **Conversational overview** | ✅ Default | Through **Claude Code** (no API key) for v1. |
| **Prose generation (optional)** | Deferred | **Ollama** local LLM for zero-cost briefs, later — not a dependency. |
| **Scheduling** | ✅ Local | **Windows Task Scheduler → `node`** for any auto-brief. No cloud agents. |
| **System vitals / audio** | Deferred | Node `os` + `Get-PSDrive`; browser Web Speech (free). Not in v1. |
| **GitHub / subagents** | ✅ Available | `gh` authed; subagents only where a phase is genuinely parallelizable. |

## 7. Build phases

**Phase 0 — Try Obsidian-native first (the cheapest possible win).**
Install **Dataview + Bases**, write the four project notes, and build one `Projects`
table/base. If it delivers the overview I want, the HUD shrinks or disappears.
*Exit check:* a single Obsidian view shows all four projects and their status.

**Phase 1 — Vertical slice (the core loop, $0).**
Lock the project-note schema (`docs/DATA-CONTRACT.md`); seed the four real projects;
stand up the `vault` accessor (`adapters/obsidian` + `gray-matter`); build the **`brief` /
overview** command — a deterministic Node script (template over computed state, **no LLM**)
that tells the truth about where each project stands. Derive Dota Coach's recency from git
via `simple-git`.
*Exit check:* "how are my projects doing?" returns an accurate, current overview I'd read — at $0.

**Phase 2 — Earn the rest.** After using the slice daily (~a week): add `metrics`, `inbox`
(morning brief, template-generated), `plan`. Add `trends` last — it needs accumulated
snapshots (cold-start), so it starts *collecting* day 1 but reports nothing useful for a while.

**Phase 3 — The face (gap-filler HUD).** A tiny local Node `http` server (zero new deps)
that reuses the existing skills and serves a dark terminal-styled page. Fills only what
Bases can't:
- **Synthesis panels:** portfolio glance, needs-attention (ranked), focus-today.
- **Projects** with git recency; **Trends** sparkline from `Metrics/` (graceful cold-start).
- **Action command deck:** buttons run `metrics` / `inbox` / `brief` via local POST
  endpoints that spawn the Node skills, output shown inline — the one thing Bases
  fundamentally can't do ($0, local, no LLM).
- **Parked (re-addable):** system vitals, audio I/O, in-HUD LLM chat, live calendar.
- Endpoints: `GET /api/overview`, `GET /api/trends?metric=…`, `POST /api/run/<skill>`.
*Exit check:* the HUD renders live vault synthesis, and a deck button runs a skill end-to-end.

**Phase 4 — Grow toward the North Star (all opt-in).** Live signal from free-tier APIs as
each project starts; optional local auto-brief (Task Scheduler); optional Ollama prose;
optional in-HUD chat / audio. Each is a deliberate, credit-aware choice.

Master owns the contract, every exit check, integration, and all git/push.

## 8. North Star (vision, not v1 scope)

An **agent-operable substrate** — a machine-readable brain a local, zero-cost agent
maintains on a schedule: drafting status updates, flagging stalls, writing the brief before
I wake, generalizing beyond projects. The $0/local-first core makes constant background
running *free*, so the constraint pushes toward this vision, not away from it. Build v1
*ready* for it; don't build it yet.

## 9. Data model (defined in Phase 1)

Markdown + YAML frontmatter (full schema in `docs/DATA-CONTRACT.md`). **Human fields are
few; the rest are derived:**

- **project** — *human:* `health`, `priority`, `next`. *Derived:* `updated`, activity/recency
  (git), progress signals, `status` where inferable.
- **metric-snapshot** — daily numeric snapshot (the series `trends` reads).
- **inbox** — quick captures awaiting triage.
- **daily** — daily note + generated morning brief.
- **trend** — direction + change over a window (needs history).
- **plan** — goal, checkboxed steps, risks, horizon.

## 10. Open decisions

Resolved and defaulted so nothing blocks Phase 0/1:

1. ✅ **Obsidian code accessor** — filesystem base + thin adapter; kepano's skill for
   conventions; REST/MCP later. *(Decided.)*
2. ✅ Conversational interface — via **Claude Code** (no key).
3. ✅ Audio — **deferred** (browser Web Speech later).
4. ✅ HUD stack — **read-only, and only if Obsidian-native can't cover it**; vanilla by default.
5. ✅ Auto morning brief — **off** until used manually first; then **local** Task Scheduler.
6. ✅ **Projects to track** — Dota Coach, Betting Analysis, Stock Market Analyzer,
   Job Hunt / Recruiter Helper. *(Decided — §5.)*

## 11. LLM Council reviews — conclusions folded in

**Review 1 (design).** Reframed the vault as a *derived cache*, minimized human input to
`health`/`priority`/`next`, cut vitals/audio, mandated a vertical slice, added the North
Star as vision. → §1–§4, §7–§8.

**Review 2 (cost & tooling).** Conclusions now reflected above:
- **Agrees:** keep the LLM out of deterministic paths (core loop = $0, §3); wire no metered
  API for v1; local-first is cheapest *and* most private; adopt maintained libs over
  hand-rolling; schedule locally not via cloud agents.
- **Clashes → resolved:** Ollama = optional later, not a dependency; free-tier APIs fine for
  light status pulls but not heavy analysis, deferred until a project starts; Dataview/Bases
  may replace the HUD.
- **Blind spots caught:** *time* is the dominant cost (don't over-adopt); Dataview/Bases can
  delete the HUD (biggest saving); "Claude Code is free" is false (plan usage); cheapest ==
  most private; good templating can feel smart with no LLM.
- **The one thing to do first:** build a Dataview/Bases `Projects` table over the four notes
  before writing any HUD — get the most expensive component for free.

## 12. Definition of done (v1)

- I can ask "how are my projects doing?" and get an accurate, current overview I actually
  read — produced at **$0** (deterministic core, conversation via Claude Code).
- Human input per project is limited to `health`, `priority`, `next`; the rest is derived.
- Reproducible from a clean clone with documented setup, committed to the private repo.

---

### Immediate next step
**Phase 0:** install Obsidian **Dataview + Bases**, seed the four project notes, and build a
single `Projects` view. If it shows the overview I want, Phase 1's `brief` becomes a thin,
zero-credit script on top of it.
