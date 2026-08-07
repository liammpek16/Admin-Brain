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

/**
 * Last commit date driving a project's recency, or null (→ caller falls back to note mtime).
 * - GitHub URL / "owner/repo" → queried remotely via `gh` (always fresh; needs network).
 * - Local filesystem path → read from the local clone via simple-git (offline).
 */
export async function lastGitActivity(repoPath) {
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
