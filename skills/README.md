# Admin Brain — Skills

Five skills that operate on the Obsidian vault (`../vault`), reading and writing
the note shapes defined in [`../docs/DATA-CONTRACT.md`](../docs/DATA-CONTRACT.md).
Each skill is a folder with a `SKILL.md` (YAML frontmatter + instructions) and a
dependency-free Node helper (standard library only — no npm installs).

## The skills

| Skill    | Helper       | Reads                                   | Writes                                   |
|----------|--------------|-----------------------------------------|------------------------------------------|
| **vault**   | `vault.js`   | any note                                | any note (the shared accessor)           |
| **metrics** | `metrics.js` | Projects/, Inbox/                       | `Metrics/<date>.md` (metric-snapshot)    |
| **inbox**   | `inbox.js`   | Inbox/, Projects/, latest Metrics/      | `Daily/<date>.md` (daily / morning brief)|
| **trends**  | `trends.js`  | Metrics/*.md (the series)               | `Trends/<date>-<metric>.md` (trend)      |
| **plan**    | `plan.js`    | (arguments)                             | `Plans/<slug>.md` (plan)                 |

### How they relate

```
                 vault  (vault.js)  ── the low-level accessor
                   │  parse/serialize frontmatter, list/read/upsert notes,
                   │  getProjects(), slugify()
      ┌────────────┼───────────────┬───────────────┐
   metrics       inbox           trends           plan
  (metrics.js) (inbox.js)      (trends.js)      (plan.js)
```

- **vault** is the foundation. It owns the single frontmatter parser, the folder
  conventions, and safe read/upsert. The other four `require('../vault/vault.js')`
  instead of re-parsing YAML — there is exactly one parser.
- **metrics** turns the current portfolio into today's numbers.
- **inbox** turns inbox + projects + the latest metrics into a morning brief.
- **trends** turns the series of metric snapshots into direction + change.
- **plan** turns a goal into a structured, checkable plan note.

Typical daily flow: `metrics` → `inbox` (brief cites the fresh snapshot);
`trends` once enough snapshots have accumulated; `plan` on demand.

## HUD command-deck mapping

The dark terminal HUD's command deck maps one-to-one onto the skills' helpers:

| HUD command | Skill   | Command                                             |
|-------------|---------|-----------------------------------------------------|
| `metrics`   | metrics | `node skills/metrics/metrics.js`                    |
| `brief`     | inbox   | `node skills/inbox/inbox.js`                        |
| `trends`    | trends  | `node skills/trends/trends.js [metric] [days]`      |
| `plan`      | plan    | `node skills/plan/plan.js --project ... --goal ...` |

The HUD reads live data from the vault (the JSON shape in the data contract's
"HUD live-data endpoint" section); `vault.js` exposes the same parsed projects /
metrics / inbox those fields mirror.

## Configuration

- Vault root: env **`ADMIN_BRAIN_VAULT`**, default
  `C:\Users\liamm\Admin-Brain\vault`.
- Runtime: Node (tested on v24, Windows 11). No dependencies, no build step.
- Every helper is idempotent for its per-day/per-slug output: re-running updates
  the same file instead of duplicating.

## Conventions & assumptions

- Enum values are lowercase; field names match the data contract exactly.
- **`tasks_done_today`** (metrics) is best-effort: the count of `## Log` bullet
  lines across project notes dated with the snapshot's date (there is no separate
  task store). Documented in `metrics/SKILL.md`.
- Trends treats every numeric key under `metrics`/`custom` as a time series and
  reports `flat` + an insufficient-data note when fewer than two snapshots fall in
  the window.
