# Admin Brain HUD

A tiny local, dark terminal-styled dashboard that fills the gaps the Obsidian Bases view
can't: **synthesis** (needs-attention, focus-today), **trends over time**, an always-on
glance surface, and an **action command deck** that runs the skills. Deterministic, $0,
no LLM, no network.

## Run
```bash
npm run hud
```
Then open **http://127.0.0.1:4173/**. Override the port with `ADMIN_BRAIN_HUD_PORT`,
the vault with `ADMIN_BRAIN_VAULT`.

## Panels
- **Portfolio** — counts + health rollup + one-line summary.
- **Needs attention** — the ranked deterministic flags.
- **Focus today** — top 3 (inbox captures + active next actions + high-priority not-started).
- **Projects** — health · priority · next · git recency ("commit Nd" vs "note Nd").
- **Trends** — pick a metric; sparkline from `Metrics/` snapshots (graceful cold-start).
- **Command deck** — run `brief` / `metrics` / `inbox` and see output inline; the view
  refreshes to reflect any notes written.

## Design / safety
- Zero dependencies — Node's built-in `http`, importing the existing skills.
- Bound to **127.0.0.1** only. The deck can run a **fixed allowlist** of skills
  (`metrics`, `inbox`, `brief`) — never arbitrary commands.
- Reads the vault live; works whether or not Obsidian is open.

## Parked (re-addable)
System vitals, audio I/O, in-HUD LLM chat, live calendar — deliberately out of scope
(see `plan.md` §7).
