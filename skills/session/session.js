// session skill — log a coaching session as a note in vault/Sessions/<date>-<slug>.md
// (type: session). Deterministic, $0. Multiple sessions the same day get a numeric suffix.

import fs from 'node:fs';
import path from 'node:path';
import { today } from '../vault/vault.js';
import { vaultPath, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Parse `--key value`, with repeatable --covered / --feedback / --action. */
export function parseArgs(argv) {
  const out = { covered: [], feedback: [], action: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[++i];
      if (key === 'covered') out.covered.push(val);
      else if (key === 'feedback') out.feedback.push(val);
      else if (key === 'action') out.action.push(val);
      else out[key] = val;
    }
  }
  return out;
}

// CLI
if (isMain(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  const project = a.project || 'Dota Coach';
  const date = a.date || today();
  const base = `${date}-${slugify(project + (a.player ? `-${a.player}` : ''))}`;
  let name = base;
  let i = 2;
  while (fs.existsSync(path.join(vaultPath(), 'Sessions', `${name}.md`))) name = `${base}-${i++}`;

  const body = [
    '## What we covered',
    ...(a.covered.length ? a.covered.map((x) => `- ${x}`) : ['- ']),
    '',
    '## Feedback given',
    ...(a.feedback.length ? a.feedback.map((x) => `- ${x}`) : ['- ']),
    '',
    '## Action items',
    ...(a.action.length ? a.action.map((x) => `- [ ] ${x}`) : ['- [ ] ']),
  ].join('\n');

  const file = upsertNote(
    'Sessions',
    name,
    { type: 'session', project, date, player: a.player || '', rating: Number(a.rating) || 0 },
    body
  );
  console.log(`Logged session -> ${file}`);
}
