# Adopted Obsidian skills (kepano)

Per `plan.md` §6, Admin Brain **adopts** kepano's Obsidian skills for authoring
conventions rather than hand-rolling them.

- **Source:** [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
  (Steph Ango / Obsidian's CEO) — a Claude Code plugin marketplace exposing the
  `obsidian` plugin (skills: `obsidian-bases`, `obsidian-markdown`, `json-canvas`,
  `defuddle`, `obsidian-cli`).

## Installed

Installed into `~/.claude/skills/` (globally usable by Claude Code):

- `obsidian-bases` — Bases (`.base`) syntax, filters, formulas. *Used to author
  `vault/_Dashboards/Projects.base`.*
- `obsidian-markdown` — Obsidian-flavored Markdown (wikilinks, callouts, properties).
- `json-canvas` — JSON Canvas format (optional).
- `defuddle` — web page → clean Markdown for captures (optional).

**`obsidian-cli` was intentionally skipped** — it drives a vault through the external
Obsidian CLI *binary*, and our accessor is filesystem-based (`plan.md` §6). Install it
later only if you want live running-app integration.

## Install method

The `/plugin` command is unavailable in this environment, so the skill files were
downloaded directly from the repo into `~/.claude/skills/`. To (re)install via the
normal plugin flow from an interactive `claude` terminal:

```bash
claude plugin marketplace add kepano/obsidian-skills
claude plugin install obsidian@obsidian-skills
```
