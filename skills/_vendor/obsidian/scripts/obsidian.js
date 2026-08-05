#!/usr/bin/env node
/*
 * obsidian.js — self-contained accessor for an Obsidian vault.
 *
 * Part of the "obsidian" Claude skill. Dependency-free (Node standard library
 * only — no npm install). Cross-platform (tested on Windows). Reads and writes
 * Markdown notes with YAML frontmatter, honoring docs/DATA-CONTRACT.md when used
 * against the Admin Brain vault.
 *
 * Vault root resolution (first match wins):
 *   1. --vault <path>            CLI flag
 *   2. ADMIN_BRAIN_VAULT env     recommended override
 *   3. OBSIDIAN_VAULT env        generic override
 *   4. default constant below    C:\Users\liamm\Admin-Brain\vault
 *
 * Library exports (require('./obsidian.js')):
 *   VAULT                        resolved vault root path
 *   FOLDERS                      map of note type -> subfolder
 *   parseFrontmatter(text)       -> { data, body }
 *   stringifyFrontmatter(d, b)   -> full note text
 *   listNotes({type, folder})    -> [{ path, file, data, body }]
 *   readNote(relOrAbsPath)       -> { path, file, data, body } | null
 *   upsertNote(path, data, body) -> { path, created }  (idempotent overwrite)
 *   mergeNote(path, patch, body) -> { path, created }  (patch frontmatter only)
 *   searchNotes(query, {folder}) -> [{ file, path, matches:[{line,text}] }]
 *   wikilinks(bodyOrNote)        -> ['[[Target]]' targets, deduped]
 *   resolveWikilink(target)      -> absolute path | null
 *   getProjects()                -> [ project data objects ]
 *   slugify(text)                -> kebab-case slug
 *
 * CLI:
 *   node obsidian.js list [folder]         JSON list of notes (all, or one folder)
 *   node obsidian.js read <relpath>        JSON { data, body } of one note
 *   node obsidian.js projects              JSON array of project frontmatter
 *   node obsidian.js search <query>        JSON search hits across the vault
 *   node obsidian.js links <relpath>       JSON wikilink targets in a note
 *   node obsidian.js upsert <relpath>      read note text from STDIN, write it
 *   node obsidian.js where                 print resolved VAULT path
 *   (append `--vault <path>` to any command to override the vault root)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- vault resolution -------------------------------------------------------
const DEFAULT_VAULT = 'C:\\Users\\liamm\\Admin-Brain\\vault';

function resolveVaultRoot(argv) {
  const i = argv.indexOf('--vault');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.ADMIN_BRAIN_VAULT
    || process.env.OBSIDIAN_VAULT
    || DEFAULT_VAULT;
}

const VAULT = resolveVaultRoot(process.argv);

const FOLDERS = {
  project: 'Projects',
  'metric-snapshot': 'Metrics',
  inbox: 'Inbox',
  daily: 'Daily',
  trend: 'Trends',
  plan: 'Plans',
};

// --- YAML frontmatter parser (minimal, contract-scoped) ---------------------
// Supports scalars (string/int/float/bool/null/date), inline lists
// [a, b, "c"], quoted strings, and one level of nested maps (metric
// `metrics:` / `custom:` blocks). Trailing "# comment" is stripped.

function stripComment(line) {
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD) {
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function splitTopLevel(s) {
  const out = [];
  let depth = 0, inS = false, inD = false, cur = '';
  for (const c of s) {
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    if (!inS && !inD) {
      if (c === '[') depth++;
      else if (c === ']') depth--;
      else if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    }
    cur += c;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}

function coerce(raw) {
  let v = raw.trim();
  if (v === '') return '';
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return splitTopLevel(inner).map((item) => coerce(item));
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

function parseFrontmatter(text) {
  const norm = String(text).replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { data: {}, body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: norm };
  const fmRaw = norm.slice(4, end + 1);
  let after = norm.slice(end + 4);
  if (after.startsWith('\n')) after = after.slice(1);

  const data = {};
  let curMapKey = null;
  for (const rawLine of fmRaw.split('\n')) {
    const line = stripComment(rawLine).replace(/\s+$/, '');
    if (line.trim() === '') continue;
    const indent = line.length - line.replace(/^\s+/, '').length;
    const m = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2];

    if (indent > 0 && curMapKey) {
      if (typeof data[curMapKey] !== 'object' || data[curMapKey] === null
          || Array.isArray(data[curMapKey])) {
        data[curMapKey] = {};
      }
      data[curMapKey][key] = coerce(val);
      continue;
    }
    if (val === '') { data[key] = {}; curMapKey = key; }
    else { data[key] = coerce(val); curMapKey = null; }
  }
  return { data, body: after };
}

// --- serializer -------------------------------------------------------------
function needsQuote(s) {
  return /[:#\[\]{},&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s) || s === '';
}

function scalarToYaml(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return '[' + v.map((x) => {
      if (typeof x === 'number' || typeof x === 'boolean') return String(x);
      return needsQuote(String(x)) ? JSON.stringify(String(x)) : String(x);
    }).join(', ') + ']';
  }
  const s = String(v);
  return needsQuote(s) ? JSON.stringify(s) : s;
}

function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const [sk, sv] of Object.entries(v)) {
        lines.push(`  ${sk}: ${scalarToYaml(sv)}`);
      }
    } else {
      lines.push(`${k}: ${scalarToYaml(v)}`);
    }
  }
  lines.push('---');
  const b = (body || '').replace(/\r\n/g, '\n');
  return lines.join('\n') + '\n' + (b.startsWith('\n') ? b : '\n' + b);
}

// --- filesystem ops ---------------------------------------------------------
function resolveInVault(p) {
  return path.isAbsolute(p) ? p : path.join(VAULT, p);
}

function readNote(p) {
  const full = resolveInVault(p);
  if (!fs.existsSync(full)) return null;
  const { data, body } = parseFrontmatter(fs.readFileSync(full, 'utf8'));
  return { path: full, file: path.basename(full), data, body };
}

function listNotes(opts = {}) {
  const { type, folder } = opts;
  let dir;
  if (folder) dir = resolveInVault(folder);
  else if (type && FOLDERS[type]) dir = path.join(VAULT, FOLDERS[type]);
  else dir = VAULT;
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, entry.name);
      if (entry.isDirectory()) { if (!folder && !type) walk(fp); continue; }
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      const note = readNote(fp);
      if (!note) continue;
      if (type && note.data.type !== type) continue;
      out.push(note);
    }
  };
  walk(dir);
  return out;
}

function upsertNote(p, data, body) {
  const full = resolveInVault(p);
  const created = !fs.existsSync(full);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, stringifyFrontmatter(data, body), 'utf8');
  return { path: full, created };
}

// Patch only the given frontmatter keys; keep the rest of the note intact.
function mergeNote(p, patch, body) {
  const existing = readNote(p);
  const data = Object.assign({}, existing ? existing.data : {}, patch || {});
  const newBody = body !== undefined ? body : (existing ? existing.body : '');
  return upsertNote(p, data, newBody);
}

// --- search -----------------------------------------------------------------
function searchNotes(query, opts = {}) {
  const q = String(query).toLowerCase();
  const notes = listNotes(opts.folder ? { folder: opts.folder } : {});
  const results = [];
  for (const n of notes) {
    const hay = fs.readFileSync(n.path, 'utf8').replace(/\r\n/g, '\n');
    const matches = [];
    hay.split('\n').forEach((text, idx) => {
      if (text.toLowerCase().includes(q)) {
        matches.push({ line: idx + 1, text: text.trim() });
      }
    });
    if (matches.length) results.push({ file: n.file, path: n.path, matches });
  }
  return results;
}

// --- wikilinks --------------------------------------------------------------
function wikilinks(input) {
  const body = typeof input === 'string' ? input : (input && input.body) || '';
  const targets = new Set();
  const re = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) targets.add(m[1].trim());
  return [...targets];
}

function resolveWikilink(target) {
  const name = String(target).replace(/\.md$/i, '');
  for (const n of listNotes({})) {
    if (n.file.replace(/\.md$/i, '') === name) return n.path;
  }
  return null;
}

// --- convenience ------------------------------------------------------------
function getProjects() {
  return listNotes({ type: 'project' }).map((n) => ({
    ...n.data, _file: n.file, _path: n.path, _body: n.body,
  }));
}

function slugify(text) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
}

module.exports = {
  VAULT, FOLDERS,
  parseFrontmatter, stringifyFrontmatter,
  listNotes, readNote, upsertNote, mergeNote,
  searchNotes, wikilinks, resolveWikilink,
  getProjects, slugify,
};

// --- CLI --------------------------------------------------------------------
function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

if (require.main === module) {
  // Strip the --vault <path> pair so positional args stay clean.
  const args = [];
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '--vault') { i++; continue; }
    args.push(raw[i]);
  }
  const [cmd, arg] = args;
  const J = (o) => console.log(JSON.stringify(o, null, 2));

  if (cmd === 'list') {
    J(listNotes(arg ? { folder: arg } : {}).map((n) => ({ file: n.file, data: n.data })));
  } else if (cmd === 'read') {
    const n = readNote(arg);
    J(n ? { path: n.path, data: n.data, body: n.body } : null);
  } else if (cmd === 'projects') {
    J(getProjects().map(({ _body, ...rest }) => rest));
  } else if (cmd === 'search') {
    J(searchNotes(args.slice(1).join(' ')));
  } else if (cmd === 'links') {
    const n = readNote(arg);
    J(n ? wikilinks(n) : null);
  } else if (cmd === 'upsert') {
    const text = readStdin();
    const { data, body } = parseFrontmatter(text);
    J(upsertNote(arg, data, body));
  } else if (cmd === 'where') {
    console.log(VAULT);
  } else {
    console.log('obsidian.js — Obsidian vault accessor (dependency-free)');
    console.log('usage: node obsidian.js [list <folder> | read <relpath> | projects |');
    console.log('        search <query> | links <relpath> | upsert <relpath> (<STDIN) | where]');
    console.log('        [--vault <path>]');
    console.log('VAULT =', VAULT);
  }
}
