---
name: obsidian
description: >-
  Read, write, search, and navigate an Obsidian vault (Markdown notes with YAML
  frontmatter). Use this whenever the task involves an Obsidian vault or a
  "second brain" — listing notes, reading or updating a note's frontmatter and
  body, creating notes in the correct folder, following [[wikilinks]], or
  searching note contents. Includes a dependency-free Node helper (scripts/obsidian.js)
  that lists notes, reads a note's frontmatter+body, safely upserts notes, searches,
  and resolves wikilinks. Defaults to the Admin Brain vault; override with the
  ADMIN_BRAIN_VAULT (or OBSIDIAN_VAULT) environment variable.
---

# Obsidian vault skill

Read and write an Obsidian vault safely and consistently. Notes are Markdown
files with a `---` YAML frontmatter block followed by a Markdown body.

## Vault location

Resolved in this order (first match wins):

1. `--vault <path>` flag on the helper CLI
2. `ADMIN_BRAIN_VAULT` environment variable
3. `OBSIDIAN_VAULT` environment variable
4. Built-in default: `C:\Users\liamm\Admin-Brain\vault`

The default targets the **Admin Brain** vault. Folders inside it: `Projects`,
`Inbox`, `Daily`, `Metrics`, `Trends`, `Plans`. Note schemas (frontmatter shapes
per `type`) are defined in `C:\Users\liamm\Admin-Brain\docs\DATA-CONTRACT.md` —
read that contract before writing notes into this vault. Key rules from it:
dates are ISO `YYYY-MM-DD`, datetimes ISO `YYYY-MM-DDTHH:mm`, enums lowercase,
and every write to a project note must bump its `updated` field.

## Helper script

`scripts/obsidian.js` — Node standard library only, no `npm install`, runs on
Windows/macOS/Linux. Use it for both quick CLI inspection and as a library.

### CLI

```
node scripts/obsidian.js where                 # print resolved vault path
node scripts/obsidian.js list                  # every note in the vault (JSON)
node scripts/obsidian.js list Projects         # notes in one folder
node scripts/obsidian.js read "Projects/Admin Brain.md"   # one note {data, body}
node scripts/obsidian.js projects              # all project frontmatter
node scripts/obsidian.js search "HUD"          # content search across the vault
node scripts/obsidian.js links "vault/Home.md" # [[wikilink]] targets in a note
node scripts/obsidian.js upsert "Inbox/foo.md" < note.md   # write a full note from STDIN
```

Append `--vault <path>` to any command to target a different vault. Relative
note paths are resolved against the vault root; absolute paths are used as-is.

### As a library

```js
const O = require('C:/Users/liamm/.claude/skills/obsidian/scripts/obsidian.js');

O.VAULT;                                   // resolved vault root
O.listNotes({ type: 'project' });          // [{ path, file, data, body }]
O.readNote('Projects/Admin Brain.md');     // { path, file, data, body } | null
O.upsertNote(relPath, data, body);         // full overwrite, creates folders
O.mergeNote(relPath, patch, body);         // patch frontmatter keys, keep rest
O.searchNotes('query', { folder });        // [{ file, path, matches:[{line,text}] }]
O.wikilinks(noteOrBody);                    // ['Target', ...] deduped
O.resolveWikilink('Admin Brain');          // absolute path | null
O.parseFrontmatter(text);                   // { data, body }
O.stringifyFrontmatter(data, body);         // full note text
```

## How to do common things

### Read a note
`readNote(path)` returns `{ data, body }` where `data` is the parsed frontmatter
object and `body` is the Markdown after the frontmatter. Returns `null` if the
file does not exist.

### Update a note's frontmatter without losing the body
Use `mergeNote(path, patch)`. It reads the existing note, shallow-merges `patch`
into the frontmatter, and rewrites the file. Example — mark a project blocked and
bump `updated`:

```js
const today = new Date().toISOString().slice(0, 10);
O.mergeNote('Projects/Admin Brain.md',
  { status: 'blocked', health: 'red', updated: today });
```

To also change the body, pass it as the third argument.

### Create a note in the right folder
Pick the folder from the note `type` (see the data contract). Filenames: projects
use the human name (`Projects/Admin Brain.md`); dated notes use the date
(`Metrics/2026-08-05.md`, `Daily/2026-08-05.md`); inbox/plans use a slug
(`Inbox/<slug>.md`). Use `slugify(text)` for slugs.

```js
O.upsertNote(`Inbox/${O.slugify('refresh dota parser')}.md`, {
  type: 'inbox',
  created: new Date().toISOString().slice(0, 16),
  status: 'open',
  project: 'Dota Analysis',
  urgency: 'high',
}, 'Raw captured text goes here.');
```

`upsertNote` is idempotent: calling it again overwrites the file with the new
content. It creates missing parent folders automatically.

### Search the vault
`searchNotes(query)` scans every `.md` file (frontmatter + body) case-insensitively
and returns per-file line matches. Optionally restrict with `{ folder: 'Projects' }`.

### Follow wikilinks
`wikilinks(note)` extracts `[[Target]]` / `[[Target|alias]]` / `[[Target#heading]]`
targets from a note's body. `resolveWikilink('Target')` maps a target back to the
note file path so you can read it.

## Frontmatter parser notes

The parser is a small, hand-written YAML subset scoped to this vault's contract:
scalars (string / int / float / bool / null / ISO dates), inline lists
(`[a, b, "c"]`), quoted strings, and one level of nested maps (used by metric
snapshots' `metrics:` and `custom:` blocks). It strips trailing `# comments`.
It does not handle block-style (multi-line) lists or deep nesting — the contract
does not use them. The serializer quotes any value containing YAML-significant
characters so round-trips stay valid.

## Safety

- Writes go only to the resolved vault path. Never hard-delete notes; overwrite
  or move instead.
- Preserve unknown frontmatter fields — use `mergeNote` rather than rebuilding
  `data` from scratch when updating an existing note.
- When writing Admin Brain project notes, always bump `updated` to today.
