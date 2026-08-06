# Admin Brain — Implementation Plan

> A personal **second brain + command center**: an interface to talk to about my
> projects and see, at a glance, how all of them are doing. Obsidian vault as the
> brain, a set of skills as the hands, a dark terminal HUD as the face.

Status: **planning** (v1 restart — clean slate). Repo: `liammpek16/Admin-Brain` (private).
Last updated: 2026-08-06. Revised after an LLM Council review (see §10 for the record).

---

## 1. What we learned from v0 (why we restarted)

The first full build was discarded. The concrete lessons now drive this plan:

- **The Obsidian brain was hand-rolled instead of adopted.** v0 authored a bespoke
  Obsidian access layer from scratch. Preferred direction: **adopt a reputable,
  maintained third-party Obsidian integration** and wrap only a thin adapter of our
  own. (Final sourcing decision is being finalized with the user — see §6 and §9.)
- **Scope was too broad for a v1.** Five skills + a five-panel HUD + audio + subagents
  were built before a single core loop had earned its place. We ship a vertical slice first.
- **The system's value is capped by data freshness.** Every metric derived from
  hand-maintained frontmatter; nothing fought staleness. This plan minimizes
  hand-entered data and derives the rest.
- **The HUD's system vitals / audio were the lowest-value, highest-effort parts.**
  They're deferred; the real product is an honest, current overview / brief.

## 2. The core insight (what the system actually is)

The real job is **reducing the uncertainty of not knowing where my projects stand** —
a *truth-and-trust* problem, not a software problem.

Ground truth about a project already lives in real sources: **git activity, issue
trackers, the calendar, and my head.** So the design principle is:

> **Minimize what a human must type to the three things a machine can't infer —
> `health`, `priority`, `next` — and derive everything else** (recency, activity,
> progress signals) from sources that already exist. The vault is a **derived cache /
> output, not a hand-kept ledger.**

This is the antidote to the staleness that kills second brains.

## 3. Guiding principles

- **Adopt over invent.** Prefer maintained, reputable third-party tools; own only a thin
  adapter that insulates our skills from upstream changes. Vet third-party code before installing.
- **Vault = derived cache, not manual ledger.** Machine-derive everything derivable.
- **One source of truth, one access layer.** No duplicated parsers, no drift.
- **Ship a vertical slice first.** Prove the core loop is worth using daily before adding surface.
- **Contract before components.** Define note schemas + the HUD data shape up front.
- **Verify, don't trust.** Every deliverable proves it runs with real output before it lands.
- **Talkable from day one.** The conversational overview is the product, not a add-on.
- **North Star ≠ v1 scope.** Build the slice so it's *ready* to grow into the autonomous
  brain (§8), without building that yet.

## 4. Architecture

```
Admin-Brain/
├── plan.md
├── docs/DATA-CONTRACT.md          # shared schema (Phase 1)
├── vault/                         # THE BRAIN — derived cache, source of truth for the UI
│   └── Projects/ Inbox/ Daily/ Metrics/ Trends/ Plans/
├── adapters/obsidian/             # thin OWNED wrapper over the chosen 3rd-party integration
├── skills/                        # THE HANDS
│   ├── vault/                     #   the ONE accessor (built on the adapter)
│   └── metrics/ inbox/ trends/ plan/
└── hud/                           # THE FACE
    └── (v1: read-only overview page; vitals/audio = LATER)
```

**Data flow:** real sources (git, etc.) + minimal human input → skills derive & write
vault notes → the overview/brief and (later) HUD render them → I talk to the system to
ask "how's everything doing?" and trigger skills.

## 5. Data model (defined in Phase 1)

Markdown + YAML frontmatter (full schema in `docs/DATA-CONTRACT.md`). **Human-entered
fields are deliberately few; the rest are derived:**

- **project** — *human:* `health`, `priority`, `next`. *Derived:* `updated`, activity/recency,
  progress signals (from git and note edits), `status` where inferable.
- **metric-snapshot** — daily numeric snapshot (the time series `trends` reads).
- **inbox** — quick captures awaiting triage.
- **daily** — daily note + generated morning brief.
- **trend** — direction + change over a window (needs history; see cold-start note in §7).
- **plan** — goal, checkboxed steps, risks, horizon.

## 6. Tooling & capability assessment (grounded)

| Need | Status | Approach |
|---|---|---|
| **Obsidian — Claude's use** | Adopt 3rd-party | Download a reputable community **skill** (e.g. kepano/obsidian-skills) for conventions. |
| **Obsidian — code accessor** | Decision pending | The HUD/skills need a *callable* API. Options: a maintained **Obsidian MCP server** wrapping the **Local REST API** plugin (live two-way, needs Obsidian running), **or** filesystem access (always-on, robust, no app needed). Wrap the choice in `adapters/obsidian/`. No Obsidian MCP connector exists in the registry (verified). |
| **System vitals** | ✅ (deferred) | Node `os` + PowerShell `Get-PSDrive` (works on this Win11 build; `wmic` is gone). Not in v1. |
| **HUD web app** | ✅ | v1 = read-only overview page. Stack: vanilla by default (revisit if richer UI wanted). |
| **Audio I/O** | Deferred | Browser Web Speech (free, Chrome/Edge) later; premium STT/TTS needs API keys. |
| **Conversational overview** | ✅ default | Through **Claude Code** (no key) for v1; in-HUD Anthropic-API chat is a later option. |
| **Derive from git** | ✅ | `git log`/status per project repo → recency & activity signals. The first real derivation source. |
| **GitHub / scheduling / subagents** | ✅ | `gh` authed; recurring-task scheduling available; master+subagents available when scope warrants. |

**Bottom line:** nothing blocks the slice. The one decision to finalize is the Obsidian
**code accessor** (§9), now leaning to *adopt third-party* per the v0 lesson.

## 7. Build phases

**Phase 1 — Vertical slice (the whole point).**
Lock the project-note schema; hand-write my **real** 3–5 current projects; stand up the
`vault` accessor over the chosen adapter; build the **`brief` / overview** command that
reads the projects and tells the truth about where they stand. Derive `updated`/activity
from git for any project that's a repo.
*Exit check:* "how are my projects doing?" returns an accurate, current overview I'd actually read.

**Phase 2 — Earn the rest.** Only after using the slice daily for ~a week: add `metrics`,
`inbox` (morning brief), and `plan`. Add `trends` last — it's worthless until snapshots
accumulate (cold-start), so it starts collecting on day 1 but reports nothing useful for a while.

**Phase 3 — The face (read-only).** A minimal read-only HUD overview page over the same data.
*Vitals + audio stay parked* until the data and daily-use habit are real.

**Phase 4 — Grow toward the North Star.** Deeper integrations (calendar/GitHub issues),
optional auto-scheduled morning brief, optional in-HUD chat, optional audio — each opt-in.

Master owns the contract, every exit check, integration, and all git/push. Subagents are
used only where a phase is genuinely parallelizable — not by default.

## 8. North Star (vision, not v1 scope)

The endgame isn't a dashboard; it's an **agent-operable substrate** — a machine-readable
brain an autonomous "chief-of-staff" agent maintains on a schedule: drafting status
updates, flagging stalls, writing the brief before I wake, and generalizing beyond
projects to goals/finances/health. Build v1 so it's *ready* for this; don't build it yet.

## 9. Open decisions

**Collapsed to zero-setup defaults so nothing blocks Phase 1** (each revisitable):

1. **Obsidian code accessor** — *pending, user-facing.* Leaning: adopt a maintained 3rd-party
   integration (MCP server over Local REST API) vs. filesystem-only. Trade-off: live-app
   two-way (requires Obsidian running) vs. always-on robustness. **To finalize with user.**
2. Conversational interface — **default: via Claude Code** (no API key).
3. Audio — **default: deferred**, browser Web Speech later.
4. HUD stack — **default: vanilla, read-only** in v1.
5. Auto morning brief — **default: off** until the brief is used manually first.
6. **Which real projects to track day one** — *need from user* (this is the content that
   makes the overview meaningful).

## 10. LLM Council review — conclusions folded in

An LLM Council (Contrarian, First-Principles, Expansionist, Outsider, Executor) evaluated
this plan. Its conclusions, now reflected above:

- **Agrees:** feasibility isn't the risk — *building the wrong thing well* is; value is
  capped by data freshness; HUD vitals/audio are lowest-value; scope was too broad. → §1–§3, §7.
- **Clashes:** vault as *derived cache* vs. *manual ledger* (resolved → cache, §2); minimal
  slice vs. platform ambition (resolved → slice now, North Star later, §7–§8).
- **Blind spots caught:** v0's failure was never diagnosed (now §1); capture friction is
  unsolved (tracked); the portfolio/trends premise assumes meaningful N + time (cold-start
  noted, §7); no explicit cost/value check (slice-first is the hedge).
- **Final recommendation:** reframe the vault as a mostly-derived cache; shrink human input
  to `health`/`priority`/`next`; cut the HUD to read-only for v1; collapse the open forks to
  defaults; keep the vision as North Star, not scope.
- **The one thing to do first:** write my real 3–5 projects into notes and build the single
  `brief` command that reads them and tells the truth. If that loop earns a daily spot, the
  rest has a reason to exist.

## 11. Definition of done (v1)

- I can ask "how are my projects doing?" and get an accurate, current overview — and I
  actually read it as part of my routine.
- Human input per project is limited to `health`, `priority`, `next`; the rest is derived.
- Reproducible from a clean clone with documented setup, committed to the private repo.

---

### Immediate next step
Finalize decision §9.1 (Obsidian accessor) and list my real projects (§9.6). Then I start
Phase 1 — the vertical slice.
