// vault skill — the ONE domain accessor. Built on adapters/obsidian.
// Returns normalized project objects with DERIVED recency (per docs/DATA-CONTRACT.md).

import { listMarkdown, readNote, lastGitActivity, isMain } from '../../adapters/obsidian/index.js';

const DAY = 86_400_000;

/** All project notes, normalized with derived lastActivity / daysSince. */
export async function getProjects() {
  const notes = listMarkdown('Projects')
    .map(readNote)
    .filter((n) => n.data.type === 'project');

  const projects = [];
  for (const n of notes) {
    const d = n.data;
    const repo = typeof d.repo === 'string' ? d.repo.trim() : '';
    const gitDate = await lastGitActivity(repo);
    const lastActivity = gitDate || n.mtime;
    projects.push({
      name: d.name || n.name,
      status: (d.status || 'unknown').toLowerCase(),
      health: (d.health || 'gray').toLowerCase(),
      priority: (d.priority || 'med').toLowerCase(),
      next: d.next || '',
      updated: d.updated || null,
      repo,
      activitySource: gitDate ? 'git' : 'note',
      lastActivity: lastActivity.toISOString().slice(0, 10),
      daysSince: Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / DAY)),
    });
  }
  return projects;
}

// CLI: `node skills/vault/vault.js` → prints the normalized projects as JSON.
if (isMain(import.meta.url)) {
  getProjects().then((p) => console.log(JSON.stringify(p, null, 2)));
}
