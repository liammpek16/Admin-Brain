# Skills

Deterministic, $0 skills over the Obsidian vault. No LLM, no network — pure Node over
your notes. All read/write through the `vault` accessor + `adapters/obsidian`, so there
is one frontmatter parser and one set of derivation rules (`docs/DATA-CONTRACT.md`).

| Skill | Does | Writes | Command |
|---|---|---|---|
| **vault** | The accessor: normalized projects + shared derivations (`healthCounts`, `needsAttention`, recency). Everything builds on it. | — | `npm run projects` |
| **metrics** | Daily numeric snapshot of the portfolio. Idempotent. | `Metrics/<date>.md` | `npm run metrics` |
| **inbox** | Morning brief: summary + top-3 focus + needs-attention. | `Daily/<date>.md` | `npm run inbox` |
| **trends** | Direction + % change of a metric over a window (cold-start until history builds). | `Trends/<date>-<metric>.md` | `node skills/trends/trends.js [metric]` |
| **plan** | Scaffold a plan (goal/steps/risks) for a project. | `Plans/<slug>.md` | `node skills/plan/plan.js --goal "..."` |

The top-level **`brief`** command (`npm run brief`) is the read-only overview; the `inbox`
skill is the persisted daily version of the same logic.

## Layering
```
adapters/obsidian  (filesystem I/O + gray-matter parse + simple-git recency)
        ↓
skills/vault       (getProjects + shared derivations)
        ↓
metrics · inbox · trends · plan   +   brief.js
```

All honor `ADMIN_BRAIN_VAULT` (defaults to `<repo>/vault`).
