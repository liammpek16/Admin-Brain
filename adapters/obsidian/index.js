// Thin OWNED adapter over the Obsidian vault.
// Filesystem access (works even when Obsidian is closed) + optional git recency.
// Everything downstream depends on THIS interface, not on gray-matter/simple-git directly,
// so we can swap the backing library or add the Local REST API later without touching skills.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile, execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { simpleGit } from 'simple-git';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_VAULT = path.resolve(__dirname, '..', '..', 'vault');

/** Absolute path to the vault (override with ADMIN_BRAIN_VAULT). */
export function vaultPath() {
  return process.env.ADMIN_BRAIN_VAULT || DEFAULT_VAULT;
}

/** List absolute paths of .md files in a vault subfolder (non-recursive). */
export function listMarkdown(folder = '') {
  const dir = path.join(vaultPath(), folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .map((f) => path.join(dir, f));
}

/** Read + parse a note: { path, name, data (frontmatter), body, mtime }. */
export function readNote(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const { data, content } = matter(raw);
  return {
    path: absPath,
    name: path.basename(absPath, path.extname(absPath)),
    data: data || {},
    body: (content || '').trim(),
    mtime: fs.statSync(absPath).mtime,
  };
}

// Resolve the GitHub CLI. Uses your existing gh auth for private repos — we never
// read or store the token ourselves. Override with ADMIN_BRAIN_GH.
function resolveGh() {
  const candidates = [
    process.env.ADMIN_BRAIN_GH,
    'C:\\Program Files\\GitHub CLI\\gh.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'gh.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'GitHub CLI', 'gh.exe'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return 'gh'; // last resort: rely on PATH
}

// Parse "github.com/owner/repo", a git URL, or bare "owner/repo".
function parseGithub(ref) {
  const m =
    ref.match(/github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i) ||
    ref.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

// Last commit date for a GitHub repo via `gh api` (free with your gh auth; no tokens handled).
function githubLastCommit(owner, repo) {
  return new Promise((resolve) => {
    const args = ['api', `repos/${owner}/${repo}/commits?per_page=1`, '--jq', '.[0].commit.committer.date'];
    execFile(resolveGh(), args, { timeout: 8000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      const d = (stdout || '').trim();
      const date = d ? new Date(d) : null;
      resolve(date && !Number.isNaN(date.getTime()) ? date : null);
    });
  });
}

async function _computeLastGitActivity(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') return null;
  const ref = repoPath.trim();
  if (!ref) return null;

  const gh = parseGithub(ref);
  if (gh && (/github\.com/i.test(ref) || !fs.existsSync(ref))) {
    return githubLastCommit(gh.owner, gh.repo);
  }
  try {
    if (!fs.existsSync(ref)) return null;
    const git = simpleGit(ref);
    if (!(await git.checkIsRepo())) return null;
    const log = await git.log({ maxCount: 1 });
    return log.latest ? new Date(log.latest.date) : null;
  } catch {
    return null;
  }
}

// Git recency (a `gh api` network call for GitHub repos, or local `simple-git`) only moves on a new
// commit, so it's cached per-repo and served STALE-WHILE-REVALIDATE: a read returns the last known
// value immediately and never awaits the network. Only the first-ever call per repo (server boot)
// computes synchronously; after that, a stale entry is refreshed in the BACKGROUND so the value is
// fresh next time. This keeps recency (a slow, external hint) off the critical path of a local write
// like adding a goal — writing a goal no longer waits ~0.4s for `gh api`.
const _recencyCache = new Map(); // key -> { at: ms, value: Date|null, refreshing: bool, promise }
const RECENCY_TTL_MS = Number(process.env.ADMIN_BRAIN_RECENCY_TTL_MS) || 60_000;

// Background refresh for one repo — updates the cached value in place; never awaited by callers, so
// it adds no read latency. STICKY: a null result (e.g. a transient network miss) does NOT overwrite
// a previously-known date, so recency never regresses to note-mtime on a blip.
function _refreshRecency(key, entry) {
  if (entry.refreshing) return; // at most one in-flight refresh per repo
  entry.refreshing = true;
  _computeLastGitActivity(key)
    .then((value) => { if (value !== null || entry.value === null) entry.value = value; entry.at = Date.now(); })
    .catch(() => {}) // _computeLastGitActivity never rejects, but stay safe
    .finally(() => { entry.refreshing = false; });
}

/**
 * Last commit date driving a project's recency, or null (→ caller falls back to note mtime).
 * - GitHub URL / "owner/repo" → queried remotely via `gh` (needs network).
 * - Local filesystem path → read from the local clone via simple-git (offline).
 * Stale-while-revalidate per repo: only the first call per repo awaits the network; every later call
 * returns the cached value immediately and refreshes in the background once past RECENCY_TTL_MS.
 * Pass a falsy `repoPath` to skip the cache (returns null).
 */
export function lastGitActivity(repoPath) {
  const key = (typeof repoPath === 'string' ? repoPath.trim() : '');
  if (!key) return Promise.resolve(null);
  const now = Date.now();
  let hit = _recencyCache.get(key);

  // Cold: never seen this repo — compute once (the only time a read awaits the network). Concurrent
  // first-load callers (HUD overview + goals firing together) share this one in-flight compute.
  if (!hit) {
    hit = { at: 0, value: null, refreshing: true, promise: null };
    hit.promise = _computeLastGitActivity(key)
      .then((v) => { hit.value = v; hit.at = Date.now(); return v; })
      .catch(() => null)
      .finally(() => { hit.refreshing = false; hit.promise = null; });
    _recencyCache.set(key, hit);
    return hit.promise;
  }
  if (hit.at === 0 && hit.promise) return hit.promise; // cold compute still in flight → share it

  // Warm: serve the cached value NOW; if it's stale, kick a background refresh for next time.
  if ((now - hit.at) >= RECENCY_TTL_MS) _refreshRecency(key, hit);
  return Promise.resolve(hit.value);
}

/** Drop cached git-recency (all repos, or one) — e.g. after a commit you want reflected now. */
export function clearRecencyCache(repoPath) {
  if (repoPath) _recencyCache.delete(String(repoPath).trim());
  else _recencyCache.clear();
}

/**
 * Fetch a project's README text, or null.
 * - GitHub URL / owner-repo → `gh api …/readme` (uses your gh auth).
 * - Local filesystem path → the README file on disk.
 */
export function readmeFor(repo) {
  if (!repo || typeof repo !== 'string') return null;
  const ref = repo.trim();
  if (!ref) return null;

  const gh = parseGithub(ref);
  if (gh && (/github\.com/i.test(ref) || !fs.existsSync(ref))) {
    try {
      const b64 = execFileSync(resolveGh(), ['api', `repos/${gh.owner}/${gh.repo}/readme`, '--jq', '.content'], {
        timeout: 8000, windowsHide: true,
      }).toString().trim();
      return b64 ? Buffer.from(b64, 'base64').toString('utf8') : null;
    } catch {
      return null;
    }
  }
  try {
    for (const name of ['README.md', 'readme.md', 'Readme.md', 'README.MD']) {
      const p = path.join(ref, name);
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
  } catch {}
  return null;
}

/** Read every note in a folder, optionally filtered to a frontmatter `type`. */
export function readFolder(folder, type = null) {
  return listMarkdown(folder)
    .map(readNote)
    .filter((n) => !type || n.data.type === type);
}

/**
 * Write (create or overwrite) a note with frontmatter + body.
 * Creates the folder if needed. Returns the absolute path written.
 */
export function upsertNote(folder, filename, data = {}, body = '') {
  const dir = path.join(vaultPath(), folder);
  fs.mkdirSync(dir, { recursive: true });
  const name = filename.toLowerCase().endsWith('.md') ? filename : `${filename}.md`;
  const file = path.join(dir, name);
  fs.writeFileSync(file, matter.stringify(body ? `\n${body}\n` : '', data), 'utf8');
  return file;
}

/** True when this module is being run directly (cross-platform). */
export function isMain(url) {
  return process.argv[1] && url === pathToFileURL(process.argv[1]).href;
}
