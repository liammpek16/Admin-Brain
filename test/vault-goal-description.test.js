import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// setProjectGoalDescription writes a goal's `_Description:` sub-line. Drive it through a temp vault
// (same pattern as vault-edit-goal) and assert both projectGoals and the persisted plan-note text.
const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-desc-'));
process.env.ADMIN_BRAIN_VAULT = tempVault;

const { projectGoals, setProjectGoalDescription, reorderProjectGoals } = await import('../skills/vault/vault.js');

const PROJECTS = path.join(tempVault, 'Projects');
const PLANS = path.join(tempVault, 'Plans');

function seed(stepsBody) {
  fs.rmSync(tempVault, { recursive: true, force: true });
  fs.mkdirSync(PROJECTS, { recursive: true });
  fs.mkdirSync(PLANS, { recursive: true });
  fs.writeFileSync(path.join(PROJECTS, 'demo.md'), `---\ntype: project\nname: Demo\n---\n`);
  fs.writeFileSync(path.join(PLANS, 'demo-roadmap.md'),
    `---\ntype: plan\nkind: roadmap\nproject: Demo\n---\n\n## Steps\n${stepsBody}\n\n## Risks\n- [ ] not a goal-block line\n`);
}
const goal = (t) => projectGoals('Demo').find((g) => g.text === t);
const planText = () => fs.readFileSync(path.join(PLANS, 'demo-roadmap.md'), 'utf8');
test.after(() => fs.rmSync(tempVault, { recursive: true, force: true }));

test('parses Description and legacy Goal sub-lines; a description is never a goal', () => {
  seed([
    '- [x] Shipped #improvement',
    '  - _Goal: legacy intent_',
    '  - _Delivered (PR #1): done._',
    '- [ ] Plain',
    '- [ ] Described — near · high',
    '  - _Description: what it means_',
  ].join('\n'));
  assert.equal(goal('Shipped').description, 'legacy intent');
  assert.equal(goal('Plain').description, '');
  assert.equal(goal('Described').description, 'what it means');
  assert.equal(goal('Described').meta, 'near · high');
  assert.ok(projectGoals('Demo').every((g) => !/Description|Goal:/.test(g.text)));
});

test('sets, replaces, and clears a description without touching other lines', () => {
  seed([
    '- [x] Done one — near · high #improvement',
    '  - _Delivered (PR #9): the thing._',
    '- [ ] Other',
  ].join('\n'));
  const before = planText();
  assert.equal(setProjectGoalDescription('Demo', 'Done one', '  first  ').ok, true);
  assert.match(planText(), /#improvement\n  - _Description: first_\n  - _Delivered \(PR #9\): the thing\._/);
  assert.equal(goal('Done one').done, true);
  assert.equal(goal('Done one').kind, 'improvement');

  assert.equal(setProjectGoalDescription('Demo', 'Done one', 'second').ok, true);
  assert.equal(goal('Done one').description, 'second');
  assert.equal((planText().match(/_Description:/g) || []).length, 1);

  assert.equal(setProjectGoalDescription('Demo', 'Done one', '').ok, true);
  assert.equal(planText(), before); // clearing restores the original bytes
});

test('replacing a legacy _Goal:_ line normalises it to _Description:_', () => {
  seed(['- [ ] Old', '  - _Goal: legacy_'].join('\n'));
  assert.equal(setProjectGoalDescription('Demo', 'Old', 'fresh').ok, true);
  assert.doesNotMatch(planText(), /_Goal:/);
  assert.equal(goal('Old').description, 'fresh');
});

test('reorder carries the description with its goal', () => {
  seed(['- [ ] A', '  - _Description: about A_', '- [ ] B'].join('\n'));
  assert.equal(reorderProjectGoals('Demo', ['B', 'A']).ok, true);
  assert.match(planText(), /- \[ \] B\n- \[ \] A\n  - _Description: about A_/);
});

test('rejects multi-line text, unknown goals, and unknown projects without writing', () => {
  seed('- [ ] Only');
  const before = planText();
  assert.equal(setProjectGoalDescription('Demo', 'Only', 'a\nb').ok, false);
  assert.equal(setProjectGoalDescription('Demo', 'Missing', 'x').ok, false);
  assert.equal(setProjectGoalDescription('Nope', 'Only', 'x').ok, false);
  assert.equal(setProjectGoalDescription('Demo', '', 'x').ok, false);
  assert.equal(planText(), before);
});
