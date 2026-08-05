#!/usr/bin/env node
/*
 * vault.js — low-level accessor for the Admin Brain Obsidian vault.
 *
 * Dependency-free (Node standard library only). Reusable by the metrics,
 * inbox, trends, and plan skills. Honors docs/DATA-CONTRACT.md exactly.
 *
 * Vault root: env ADMIN_BRAIN_VAULT, default C:\Users\liamm\Admin-Brain\vault
 *
 * Exports:
 *   VAULT                       resolved vault root path
 *   FOLDERS                     map of note type -> subfolder
 *   parseFrontmatter(text)      -> { data, body }
 *   stringifyFrontmatter(d, b)  -> full note text
 *   listNotes({type, folder})   -> [{ path, file, data, body }]
 *   readNote(path)              -> { path, file, data, body } | null
 *   upsertNote(path, data, body)-> { path, created }   (idempotent overwrite)
 *   getProjects()               -> [ project data objects ]  (parsed set)
 *   slugify(text)               -> kebab-case slug
 *
 * CLI (for quick inspection / other skills' shell steps):
 *   node vault.js projects            -> JSON array of projects
 *   node vault.js list <folder>       -> JSON list of notes in a folder
 *   node vault.js read <relpath>      -> JSON { data, body } of one note
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VAULT = process.env.ADMIN_BRAIN_VAULT
  || 'C:\\Users\\liamm\\Admin-Brain\\vault';

const FOLDERS = {
  project: 'Projects',
  'metric-snapshot': 'Metrics',
  inbox: 'Inbox',
  daily: 'Daily',
  trend: 'Trends',
  plan: 'Plans',
};

// ---------------------------------------------------------------------------
// YAML frontmatter parser (minimal, contract-scoped).
// Supports: scalars (string/int/bool/date), inline lists [a, b, "c"],
// quoted strings, and ONE level of nested maps (used by metric `metrics:` /
// `custom:` blocks). Comments (# ...) on their own line or trailing are stripped.
// ---------------------------------------------------------------------------

function stripComment(line) {
  // Remove a trailing "# comment" that is not inside quotes.
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD) {
      // require whitespace before # to treat as comment (avoid urls/anchors)
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function coerce(raw) {
  let v = raw.trim();
  if (v === '') return '';
  // quoted string
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  // inline list
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner === '') return [];
    return splitTopLevel(inner).map((item) => coerce(item));
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  // integer / float
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  return v; // bare string (dates stay as ISO strings, matching the contract)
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

function parseFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { data: {}, body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: norm };
  const fmRaw = norm.slice(4, end + 1); // between the fences
  // body starts after the closing fence line
  let after = norm.slice(end + 4);
  if (after.startsWith('\n')) after = after.slice(1);

  const data = {};
  const lines = fmRaw.split('\n');
  let curMapKey = null; // key of the nested map we're currently filling
  for (let rawLine of lines) {
    const line = stripComment(rawLine).replace(/\s+$/, '');
    if (line.trim() === '') continue;
    const indent = line.length - line.replace(/^\s+/, '').length;
    const m = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2];

    if (indent > 0 && curMapKey) {
      // nested key under the current map
      if (typeof data[curMapKey] !== 'object' || data[curMapKey] === null
          || Array.isArray(data[curMapKey])) {
        data[curMapKey] = {};
      }
      data[curMapKey][key] = coerce(val);
      continue;
    }

    // top-level key
    if (val === '') {
      // could be a nested map header (metrics:, custom:) — start one
      data[key] = {};
      curMapKey = key;
    } else {
      data[key] = coerce(val);
      curMapKey = null;
    }
  }
  return { data, body: after };
}

// ---------------------------------------------------------------------------
// Serializer (produces contract-shaped frontmatter).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Filesystem operations.
// ---------------------------------------------------------------------------

function resolveInVault(p) {
  if (path.isAbsolute(p)) return p;
  return path.join(VAULT, p);
}

function readNote(p) {
  const full = resolveInVault(p);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, 'utf8');
  const { data, body } = parseFrontmatter(text);
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
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.toLowerCase().endsWith('.md')) continue;
    const note = readNote(path.join(dir, entry));
    if (!note) continue;
    if (type && note.data.type !== type) continue;
    out.push(note);
  }
  return out;
}

function upsertNote(p, data, body) {
  const full = resolveInVault(p);
  const created = !fs.existsSync(full);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, stringifyFrontmatter(data, body), 'utf8');
  return { path: full, created };
}

function getProjects() {
  return listNotes({ type: 'project' }).map((n) => ({
    ...n.data,
    _file: n.file,
    _path: n.path,
    _body: n.body,
  }));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
}

module.exports = {
  VAULT, FOLDERS,
  parseFrontmatter, stringifyFrontmatter,
  listNotes, readNote, upsertNote, getProjects, slugify,
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'projects') {
    console.log(JSON.stringify(getProjects().map((p) => {
      const { _body, ...rest } = p; return rest;
    }), null, 2));
  } else if (cmd === 'list') {
    console.log(JSON.stringify(
      listNotes({ folder: arg }).map((n) => ({ file: n.file, data: n.data })),
      null, 2));
  } else if (cmd === 'read') {
    const n = readNote(arg);
    console.log(JSON.stringify(n ? { data: n.data, body: n.body } : null, null, 2));
  } else {
    console.log('vault.js — usage: node vault.js [projects | list <folder> | read <relpath>]');
    console.log('VAULT =', VAULT);
  }
}
