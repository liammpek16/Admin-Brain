---
name: vault
description: Read the Admin Brain Obsidian vault as normalized project data. Use when you need the current state of projects (status, health, priority, next action, and derived recency) from the vault to answer "how are my projects doing?" or to feed other skills. Filesystem-based, no LLM, $0.
---

# vault

The low-level, deterministic accessor for the Admin Brain vault. Every other component
reads projects through this — one parser, one source of truth.

## What it does
- Reads `vault/Projects/*.md`, parses frontmatter with `gray-matter`.
- Derives recency: last commit in a project's `repo` (via `simple-git`) when set,
  otherwise the note's file modified-time.
- Returns normalized objects per `docs/DATA-CONTRACT.md`.

## Usage
```bash
node skills/vault/vault.js        # prints all projects as JSON
```
```js
import { getProjects } from './skills/vault/vault.js';
const projects = await getProjects();
```

## Notes
- Vault path defaults to `<repo>/vault`; override with `ADMIN_BRAIN_VAULT`.
- `repo` accepts a **GitHub URL** (queried remotely via `gh` for always-fresh recency —
  free with your gh auth, no tokens handled) **or a LOCAL path** (read offline via
  simple-git). Network/errors fall back to the note's mtime. No LLM, $0.
