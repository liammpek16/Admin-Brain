// refine skill (Plan 2, stage ②) — assemble the REFINE brief: the approved task + the
// project's README (fetched local or via GitHub), written to a cycle note at stage:refine
// with empty sections for the council to fill. The council reasoning (5 personas) is done
// by the agent; this harness gathers the inputs deterministically.

import { getProjects, today } from '../vault/vault.js';
import { readmeFor, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Gather { project, task, repo, readme } for a project. */
export async function assembleRefineBrief(projectName) {
  const p = (await getProjects()).find((x) => x.name === projectName);
  if (!p) return null;
  return { project: p.name, task: p.next, repo: p.repo, readme: readmeFor(p.repo) };
}

// CLI: `node skills/refine/refine.js --project "<name>"`
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--project');
  const projectName = pi >= 0 ? args[pi + 1] : null;
  if (!projectName) {
    console.error('Usage: node skills/refine/refine.js --project "<name>"');
    process.exit(1);
  }
  const brief = await assembleRefineBrief(projectName);
  if (!brief) {
    console.error(`Project not found: ${projectName}`);
    process.exit(2);
  }
  const date = today();
  const goal = brief.readme
    ? brief.readme.trim()
    : '_No README found (no repo, or not started). Goal-gap analysis is not possible — refine should first drive creating a scope/README._';

  const body = [
    '## Task (from SELECT)',
    brief.task || '(no next step set)',
    '',
    `## Project goal — source: ${brief.repo || 'n/a'}`,
    '```',
    goal,
    '```',
    '',
    '## Council refinement',
    '_5-persona council: gaps between the task and the project goal._',
    '',
    '## Refined task spec',
    '_A sharpened, branch-sized task._',
    '',
    '## Definition of done',
    '_Clear, testable completion criteria._',
  ].join('\n');

  const file = upsertNote(
    'Cycles',
    `${date}-${slugify(brief.project)}`,
    { type: 'cycle', project: brief.project, stage: 'refine', status: 'refining', task: brief.task || '', started: date, readme_source: brief.repo || '' },
    body
  );

  console.log(`REFINE brief for "${brief.project}" -> ${file}`);
  console.log(`  task:   ${brief.task}`);
  console.log(`  README: ${brief.readme ? `${brief.readme.length} chars fetched` : 'NONE'}`);
}
