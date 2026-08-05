---
name: vault
description: Low-level accessor for the Admin Brain Obsidian vault. Use when a task needs to read, search, create, or update vault notes (projects, metric snapshots, inbox items, daily briefs, trends, plans) or parse and rewrite their YAML frontmatter. Provides a dependency-free Node helper that the metrics, inbox, trends, and plan skills build on so there is exactly one frontmatter parser and one set of folder conventions.
---

# vault

The foundational skill for everything else in Admin Brain. It knows the folder
layout, the note schemas in `docs/DATA-CONTRACT.md`, and how to safely read and
write Markdown notes with YAML frontmatter. The other four skills (metrics,
inbox, trends, plan) `require` its helper rather than re-implementing parsing.

## When to use

- You need to list, read, or search notes of a given type or folder.
- You need to create or update a note without corrupting its frontmatter.
- You need the parsed set of all projects (for a dashboard, metric, or brief).
- Another skill needs a reusable, dependency-free vault accessor.

## Folder & schema conventions

Vault root comes from env `ADMIN_BRAIN_VAULT` (default
`C:\Users\liamm\Admin-Brain\vault`). Note type → folder:

| type            | folder      |
|-----------------|-------------|
| project         | Projects/   |
| metric-snapshot | Metrics/    |
| inbox           | Inbox/      |
| daily           | Daily/      |
| trend           | Trends/     |
| plan            | Plans/      |

Every note's frontmatter must match `docs/DATA-CONTRACT.md` exactly — same field
names and lowercase enum values. When you touch a project note, bump `updated`.

## The helper — `vault.js`

Node standard-library only. No npm installs. Import it by relative path:

```js
const vault = require('../vault/vault.js');
```

API:

- `vault.VAULT` — resolved vault root.
- `vault.FOLDERS` — type → subfolder map.
- `vault.parseFrontmatter(text)` → `{ data, body }`. Handles scalars, inline
  lists (`[a, b]`), quoted strings, and one level of nested maps (the
  `metrics:` / `custom:` blocks in snapshots).
- `vault.stringifyFrontmatter(data, body)` → full note text (contract-shaped).
- `vault.listNotes({ type, folder })` → `[{ path, file, data, body }]`.
- `vault.readNote(relOrAbsPath)` → `{ path, file, data, body }` or `null`.
- `vault.upsertNote(relPath, data, body)` → `{ path, created }` (idempotent
  overwrite — creates parent folders as needed).
- `vault.getProjects()` → parsed project objects (with `_file`, `_path`, `_body`).
- `vault.slugify(text)` → kebab-case slug for filenames.

## Procedure (writing a note safely)

1. `readNote` the target if it may already exist; preserve fields you are not
   changing (e.g. a snapshot's `custom` block, a project's body sections).
2. Mutate only the fields the task requires. Keep enums lowercase.
3. For project notes, set `updated` to today.
4. `upsertNote(relPath, data, body)` — same path on re-run updates in place.

## Usage example

```bash
# From skills/vault/
node vault.js projects                 # JSON of all projects
node vault.js list Inbox               # JSON of notes in the Inbox folder
node vault.js read Metrics/2026-08-05.md
```

Programmatic:

```js
const vault = require('./vault.js');
const projects = vault.getProjects();
const active = projects.filter(p => p.status === 'active');
console.log(active.map(p => `${p.name} @ ${p.progress}%`));
```
