# Admin Brain

A personal **second brain + command center** for tracking every project I'm running.
Talk to it about my projects, get morning briefs, watch trends, and see an at-a-glance
overview of how everything is doing — all driven by an Obsidian vault as the source of truth.

## Architecture

```
Admin-Brain/
├── vault/          # Obsidian vault — the BRAIN (single source of truth)
│   ├── Projects/   # one note per project (see docs/DATA-CONTRACT.md)
│   ├── Inbox/      # captured thoughts / tasks awaiting triage
│   ├── Daily/      # daily notes + morning briefs
│   ├── Metrics/    # numeric snapshots over time
│   ├── Trends/     # trend analyses
│   └── Plans/      # plans produced by the plan skill
├── hud/            # Dark terminal-style local web HUD (system vitals, command
│                   #   deck, schedule, audio I/O, live vault data)
├── skills/         # 5 Claude skills operating on the vault:
│   ├── metrics/    #   pull the numbers
│   ├── inbox/      #   morning briefs
│   ├── trends/     #   detect trends over time
│   ├── plan/       #   turn intent into plans
│   └── vault/      #   read/write the vault safely
└── docs/
    └── DATA-CONTRACT.md   # the schema every component agrees on
```

## The three build tracks

This project was scaffolded by a master agent coordinating three subagents:

1. **Obsidian skill** — research + install the Obsidian skill that lets Claude read/write the vault.
2. **HUD** — the dark terminal web dashboard.
3. **Skills** — the 5 skills above.

## Data flow

Everything reads and writes the **vault**. Skills mutate notes; the HUD renders them live.
The Obsidian skill is the low-level accessor the other skills build on.

See [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) for the note schemas.
