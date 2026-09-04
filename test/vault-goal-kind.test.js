import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-kind-'));
process.env.ADMIN_BRAIN_VAULT = tempVault;

const { projectGoals, addProjectGoal, setProjectGoalKind, deleteProjectGoal, reorderProjectGoals, GOAL_KINDS } =
  await import('../skills/vault/vault.js');

const PROJECTS = path.join(tempVault, 'Projects');
const PLANS = path.join(tempVault, 'Plans');

function seed(stepsBody) {
  fs.rmSync(tempVault, { recursive: true, force: true });
  fs.mkdirSync(PROJECTS, { recursive: true });
  fs.mkdirSync(PLANS, { recursive: true });
  fs.writeFileSync(path.join(PROJECTS, 'demo.md'), `---\ntype: project\nname: Demo\n---\n`);
  fs.writeFileSync(path.join(PLANS, 'demo-roadmap.md'),
    `---\ntype: plan\nkind: roadmap\nproject: Demo\n---\n\n## Steps\n${stepsBody}\n`);
}
const kindOf = (t) => projectGoals('Demo').find((g) => g.text === t)?.kind;
const planText = () => fs.readFileSync(path.join(PLANS, 'demo-roadmap.md'), 'utf8');
test.after(() => fs.rmSync(tempVault, { recursive: true, force: true }));

test('untagged goals default to checkpoint; #improvement is parsed and stripped from text', () => {
  seed([
    '- [ ] Plain goal',
    '- [ ] Tagged improvement #improvement',
    '- [x] Done improvement #IMPROVEMENT',            // case-insensitive
    '- [ ] With meta then tag — near · high #improvement',
    '- [ ] Explicit checkpoint #checkpoint',
  ].join('\n'));
  const g = projectGoals('Demo');
  assert.equal(kindOf('Plain goal'), 'checkpoint');
  assert.equal(kindOf('Tagged improvement'), 'improvement');
  assert.equal(kindOf('Done improvement'), 'improvement');
  assert.equal(kindOf('Explicit checkpoint'), 'checkpoint');
  // meta split still works with a trailing tag, and the tag is NOT in the visible text
  const meta = g.find((x) => x.text === 'With meta then tag');
  assert.equal(meta.kind, 'improvement');
  assert.equal(meta.meta, 'near · high');
  assert.ok(!g.some((x) => /#(improvement|checkpoint)/i.test(x.text)), 'tag leaked into text');
});

test('addProjectGoal writes the #improvement tag only for improvements', () => {
  seed('- [ ] Seed');
  assert.equal(addProjectGoal('Demo', 'A checkpoint', 'checkpoint').ok, true);
  assert.equal(addProjectGoal('Demo', 'An improvement', 'improvement').ok, true);
  assert.equal(addProjectGoal('Demo', 'Bad kind', 'nonsense').ok, false);
  const body = planText();
  assert.match(body, /- \[ \] A checkpoint$/m);            // no tag
  assert.match(body, /- \[ \] An improvement #improvement$/m);
  assert.equal(kindOf('A checkpoint'), 'checkpoint');
  assert.equal(kindOf('An improvement'), 'improvement');
});

test('setProjectGoalKind flips a goal between groups and persists; run/delete text-match still holds', () => {
  seed(['- [ ] Movable — near · high', '- [ ] Other'].join('\n'));
  assert.equal(kindOf('Movable'), 'checkpoint');
  assert.equal(setProjectGoalKind('Demo', 'Movable', 'improvement').ok, true);
  assert.equal(kindOf('Movable'), 'improvement');
  assert.match(planText(), /- \[ \] Movable — near · high #improvement$/m); // meta preserved, tag appended
  // flip back removes the tag (checkpoint is tagless)
  assert.equal(setProjectGoalKind('Demo', 'Movable', 'checkpoint').ok, true);
  assert.match(planText(), /- \[ \] Movable — near · high$/m);
  // guards
  assert.equal(setProjectGoalKind('Demo', 'Nope', 'improvement').ok, false);
  assert.equal(setProjectGoalKind('Demo', 'Movable', 'bad').ok, false);
  // text-matching survivors: reorder + delete key on the tag-stripped text
  setProjectGoalKind('Demo', 'Movable', 'improvement');
  assert.equal(reorderProjectGoals('Demo', ['Other', 'Movable']).ok, true);
  assert.equal(deleteProjectGoal('Demo', 'Movable').ok, true);
  assert.equal(projectGoals('Demo').some((g) => g.text === 'Movable'), false);
});

test('GOAL_KINDS is exactly the two supported groups', () => {
  assert.deepEqual([...GOAL_KINDS].sort(), ['checkpoint', 'improvement']);
});
