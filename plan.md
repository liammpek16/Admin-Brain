# Admin Brain — Implementation Plan

> A personal **second brain + command center**: an interface to talk to about my
> projects and see, at a glance, how all of them are doing. Obsidian vault as the
> brain, a dark terminal HUD as the face, a set of skills as the hands.

Status: **planning** (v1 restart — clean slate). Repo: `liammpek16/Admin-Brain` (private).
Last updated: 2026-08-06.

---

## 1. Goals (from the original brief)

1. **Talk to my projects** — a conversational way to ask how things are going and get an overview across every project.
2. **Obsidian vault = the brain** — a single source of truth the whole system reads and writes.
3. **Dark terminal HUD for my OS** with five surfaces:
   - System vitals
   - Command deck
   - Schedule
   - Audio I/O
   - Live data from the vault
4. **A `skills/` folder with 5 skills**: `metrics` (pulls numbers), `inbox` (morning briefs), `trends`, `plan`, `vault`.
5. **Delivery model**: a master agent coordinating **3 subagents** — (1) Obsidian skill, (2) HUD, (3) the skills folder — with the master planning each brief and verifying every result before it lands.

## 2. Principles for this build (what to get right this time)

- **One source of truth.** Everything reads/writes the vault through a *single* access layer. No duplicated parsers, no drift.
- **A shared contract first.** Note schemas + the HUD's data shape are defined *before* any component is built, so the pieces integrate instead of colliding.
- **Zero surprise dependencies.** Prefer Node standard library; every external tool or API key is an explicit, opt-in decision — never smuggled in.
- **Verify, don't trust.** Each subagent must prove its work runs (real commands, real output) before the master accepts it.
- **Talkable from day one.** The conversational overview is a first-class feature, not an afterthought bolted onto the HUD.
- **Decisions surfaced, not assumed.** Open forks (see §7) are decided with me, not guessed.

## 3. Architecture

```
Admin-Brain/
├── plan.md              # this file — the map
├── docs/
│   └── DATA-CONTRACT.md # the shared schema (built in Phase 1)
├── vault/               # THE BRAIN — Obsidian vault, source of truth
│   ├── Projects/  Inbox/  Daily/  Metrics/  Trends/  Plans/
├── skills/              # THE HANDS — 5 skills
│   ├── vault/           #   low-level accessor (the ONE parser)
│   ├── metrics/  inbox/  trends/  plan/
└── hud/                 # THE FACE — dark terminal web app
    ├── server.js  public/
```

**Data flow:** skills mutate vault notes → the HUD renders them live → the
conversational layer reads the vault to answer "how's everything doing?" and can
trigger skills. The `vault` skill is the low-level accessor every other component
depends on; the Obsidian skill wraps it for general vault navigation.

## 4. Tooling & capability assessment ("do we have what we need?")

Checked against what's actually available in this environment.

| Need | Status | Approach / notes |
|---|---|---|
| **Obsidian access** | ⚠️ No MCP connector exists (registry searched — 0 results) | **Direct filesystem read/write** to `vault/` via a dependency-free Node layer is the robust core. Optional upgrade: the Obsidian *Local REST API* community plugin for live two-way sync with the running app (needs Obsidian open + plugin + a token — see §7). |
| **System vitals** | ✅ Have it | Node `os` module + PowerShell `Get-PSDrive` for disk (confirmed working on this Win11 build 26200, where `wmic` is gone). |
| **HUD web app** | ✅ Have it | Node stdlib `http` server + vanilla frontend (zero deps, no build). Alternative: Vite/React for a richer UI (§7). |
| **Audio I/O** | ✅ Baseline / ⚠️ upgrade needs keys | Browser **Web Speech API** (STT + TTS) works in Chrome/Edge, zero-dep. Higher quality (Whisper STT / ElevenLabs·OpenAI TTS) needs API keys (§7). |
| **Conversational "talk to my projects"** | ⚠️ Decision needed | Two models: **(A)** the conversation happens *in Claude Code* — you talk to me, skills act on the vault (no key, available today); **(B)** an in-HUD chat backed by the Anthropic API (needs `ANTHROPIC_API_KEY`). See §7. |
| **Subagent orchestration** | ✅ Have it | Master + subagents via the Agent tool; task tracking for visibility. |
| **GitHub** | ✅ Have it | `gh` installed and authenticated as `liammpek16`; repo already private. |
| **Scheduling (auto morning brief)** | ✅ Available | Can register a recurring task so the `inbox` brief generates each morning (§7 opt-in). |

**Bottom line:** nothing blocks the core build. The only things that need *your* call
are quality/convenience upgrades (live Obsidian sync, premium audio, in-HUD chat,
auto-scheduling) — all captured in §7.

## 5. Data model (defined in Phase 1)

Note types, each Markdown + YAML frontmatter (full schema in `docs/DATA-CONTRACT.md`):

- **project** — `status, health, progress, priority, next, updated`, log, blockers.
- **metric-snapshot** — daily numeric snapshot (append-only series for trends).
- **inbox** — quick captures awaiting triage.
- **daily** — daily note + generated morning brief.
- **trend** — direction + change over a window for a metric.
- **plan** — goal, checkboxed steps, risks, horizon.

The HUD consumes a single JSON shape whose field names mirror this frontmatter exactly.

## 6. Build phases & subagent decomposition

**Phase 0 — Decide & set up (master, with you)**
Resolve §7 open decisions. Lock the contract's scope.

**Phase 1 — The brain: vault + Obsidian access (Subagent 1 + master)**
Scaffold the vault folders; write `docs/DATA-CONTRACT.md`; build/point the Obsidian
skill at the vault; (if chosen) wire the Local REST API plugin path.
*Exit check:* list/read/search/upsert a note against a seeded vault, proven by real output.

**Phase 2 — The hands: 5 skills (Subagent 3 + master)**
`vault` accessor first (the one parser); then `metrics`, `inbox`, `trends`, `plan`
built on it. All idempotent, vault path via `ADMIN_BRAIN_VAULT`.
*Exit check:* each helper runs and writes contract-valid notes.

**Phase 3 — The face: HUD (Subagent 2 + master)**
Server endpoints (`/api/vault`, `/api/vitals`, `/api/schedule`) + the five panels,
phosphor theme with amber toggle.
*Exit check:* endpoints return contract JSON; frontend renders all panels with no console errors.

**Phase 4 — Wire it together (master)**
Connect the command deck to real skills; build the conversational overview (per §7-B or §7-A);
make audio drive the command deck.
*Exit check:* "how's everything doing?" returns a real portfolio overview; a command runs a skill end-to-end.

**Phase 5 — Polish & operate (master)**
Themes, docs, optional auto-scheduled morning brief, README, final commit + push.

Master owns: the contract, every exit check, integration (Phase 4), and all git/push.

## 7. Open decisions (need your input before Phase 1)

1. **Obsidian integration depth** — Filesystem-only (simple, offline, no setup) **or** also wire the Obsidian *Local REST API* plugin for live two-way sync with the running app (needs plugin install + token)?
2. **Conversational interface** — Talk to your projects *through Claude Code* (no API key) **or** an in-HUD chat backed by the Anthropic API (needs `ANTHROPIC_API_KEY`)?
3. **Audio quality** — Keep browser Web Speech (free, Chrome/Edge) **or** plan for premium STT/TTS later (API keys)?
4. **HUD stack** — Keep zero-dependency vanilla (fast, robust) **or** go Vite/React for a richer UI?
5. **Auto morning brief** — Should the `inbox` brief auto-generate each weekday morning via a scheduled task?
6. **Real project data** — Which projects should the vault actually track on day one? (This is the content that makes the overview meaningful.)

## 8. Definition of done

- I can ask "how are my projects doing?" and get an accurate, current overview.
- The HUD shows live vitals + real vault data and I can drive it by command and by voice.
- Running a skill (`metrics`, `brief`, `trends`, `plan`) updates the vault and the HUD reflects it.
- Everything is reproducible from a clean clone with documented setup, committed to the private repo.

---

### Immediate next step
Answer §7 (even just 1–2 and "you pick the rest"), and I'll start Phase 1.
