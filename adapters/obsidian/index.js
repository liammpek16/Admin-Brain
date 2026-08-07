// Thin OWNED adapter over the Obsidian vault.
// Filesystem access (works even when Obsidian is closed) + optional git recency.
// Everything downstream depends on THIS interface, not on gray-matter/simple-git directly,
// so we can swap the backing library or add the Local REST API later without touching skills.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

/**
 * Last commit date for a LOCAL git repo, or null.
 * Accepts a filesystem path; remote URLs (http/git@) return null (no clone).
 */
export async function lastGitActivity(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') return null;
  if (/^(https?:|git@|ssh:)/i.test(repoPath)) return null; // remote URL — skip
  try {
    if (!fs.existsSync(repoPath)) return null;
    const git = simpleGit(repoPath);
    if (!(await git.checkIsRepo())) return null;
    const log = await git.log({ maxCount: 1 });
    return log.latest ? new Date(log.latest.date) : null;
  } catch {
    return null;
  }
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
