import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessFeasibility,
  classifyTask,
  routeModel,
  parseTierOverrides,
  buildPlan,
  upsertSection,
  renderFeasibility,
  renderPlan,
  FEAS_DIMENSIONS,
  TASK_KINDS,
  TIERS,
  TIER_MODELS,
  GO_THRESHOLD,
} from '../skills/orchestrate/orchestrate.js';

// ---- assessFeasibility tests ----
test('assessFeasibility: all 2s → go with total 10', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 2, risk: 2, testability: 2,
  });
  assert.equal(result.verdict, 'go');
  assert.equal(result.total, 10);
  assert.equal(result.reasons[0], 'total 10/10, no blockers');
});

test('assessFeasibility: testability=0 is blocker even if total would be high', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 2, risk: 2, testability: 0,
  });
  assert.equal(result.verdict, 'no-go');
});

test('assessFeasibility: cost=0 is blocker even if total would be high', () => {
  const result = assessFeasibility({
    clarity: 2, size: 1, cost: 0, risk: 2, testability: 2,
  });
  assert.equal(result.verdict, 'no-go');
});

test('assessFeasibility: total exactly 7 with no zeros → go', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 1, risk: 1, testability: 1,
  });
  assert.equal(result.verdict, 'go');
  assert.equal(result.total, 7);
});

test('assessFeasibility: total 6 with no zeros → go-with-split', () => {
  const result = assessFeasibility({
    clarity: 1, size: 2, cost: 1, risk: 1, testability: 1,
  });
  assert.equal(result.verdict, 'go-with-split');
  assert.equal(result.total, 6);
});

test('assessFeasibility: total 6 with weak dimensions → go-with-split', () => {
  const result = assessFeasibility({
    clarity: 1, size: 2, cost: 1, risk: 1, testability: 1,
  });
  assert.equal(result.verdict, 'go-with-split');
  assert.equal(result.total, 6);
  assert.ok(result.reasons[0].includes('< 7'));
});

test('assessFeasibility: size=0 (others 2) → go-with-split', () => {
  const result = assessFeasibility({
    clarity: 2, size: 0, cost: 2, risk: 2, testability: 2,
  });
  assert.equal(result.verdict, 'go-with-split');
  assert.equal(result.total, 8);
  assert.ok(result.reasons[0].includes('size=0'));
});

test('assessFeasibility: clarity=0 → no-go with clarity reason', () => {
  const result = assessFeasibility({
    clarity: 0, size: 2, cost: 2, risk: 2, testability: 2,
  });
  assert.equal(result.verdict, 'no-go');
  assert.ok(result.reasons[0].includes('clarity=0'));
  assert.ok(result.reasons[0].includes('spec is unclear'));
});

test('assessFeasibility: cost=0 → no-go with cost reason', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 0, risk: 2, testability: 2,
  });
  assert.equal(result.verdict, 'no-go');
  assert.ok(result.reasons[0].includes('cost=0'));
  assert.ok(result.reasons[0].includes('paid/external service'));
});

test('assessFeasibility: risk=0 → no-go with risk reason', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 2, risk: 0, testability: 2,
  });
  assert.equal(result.verdict, 'no-go');
  assert.ok(result.reasons[0].includes('risk=0'));
});

test('assessFeasibility: testability=0 → no-go with testability reason', () => {
  const result = assessFeasibility({
    clarity: 2, size: 2, cost: 2, risk: 2, testability: 0,
  });
  assert.equal(result.verdict, 'no-go');
  assert.ok(result.reasons[0].includes('testability=0'));
});

test('assessFeasibility: rejects non-object', () => {
  assert.throws(() => assessFeasibility(null), /must be an object/);
  assert.throws(() => assessFeasibility('not an object'), /must be an object/);
  assert.throws(() => assessFeasibility(42), /must be an object/);
});

test('assessFeasibility: rejects array', () => {
  assert.throws(() => assessFeasibility([2, 2, 2, 2, 2]), /must be an object/);
});

test('assessFeasibility: rejects missing dimension', () => {
  assert.throws(
    () => assessFeasibility({ clarity: 2, size: 2, cost: 2, risk: 2 }),
    /testability must be an integer 0–2/,
  );
});

test('assessFeasibility: rejects value > 2', () => {
  assert.throws(
    () => assessFeasibility({ clarity: 2, size: 2, cost: 2, risk: 2, testability: 3 }),
    /must be an integer 0–2/,
  );
});

test('assessFeasibility: rejects fractional value', () => {
  assert.throws(
    () => assessFeasibility({ clarity: 2, size: 2, cost: 2, risk: 2, testability: 1.5 }),
    /must be an integer 0–2/,
  );
});

test('assessFeasibility: rejects string value', () => {
  assert.throws(
    () => assessFeasibility({ clarity: 2, size: 2, cost: 2, risk: 2, testability: '2' }),
    /must be an integer 0–2/,
  );
});

test('assessFeasibility: rejects unknown extra key', () => {
  assert.throws(
    () => assessFeasibility({ clarity: 2, size: 2, cost: 2, risk: 2, testability: 2, extra: 1 }),
    /unknown feasibility dimension/,
  );
});

// ---- classifyTask tests ----
test('classifyTask: mechanical 1-file low/low task → light', () => {
  const result = classifyTask({
    kind: 'mechanical', files: 1, novel_design: false, ambiguity: 'low', risk: 'low',
  });
  assert.equal(result.tier, 'light');
  assert.equal(result.score, 0);
});

test('classifyTask: feature with 3 files, med ambiguity → standard', () => {
  const result = classifyTask({
    kind: 'feature', files: 3, novel_design: false, ambiguity: 'med', risk: 'low',
  });
  assert.equal(result.tier, 'standard');
  assert.ok(result.score >= 2);
});

test('classifyTask: design task with low everything → heavy (floor)', () => {
  const result = classifyTask({
    kind: 'design', files: 0, novel_design: false, ambiguity: 'low', risk: 'low',
  });
  assert.equal(result.tier, 'heavy');
});

test('classifyTask: mechanical with 6 files, novel_design true, high risk → heavy', () => {
  const result = classifyTask({
    kind: 'mechanical', files: 6, novel_design: true, ambiguity: 'low', risk: 'high',
  });
  assert.equal(result.tier, 'heavy');
  assert.ok(result.score > 4);
});

test('classifyTask: verify with low everything → standard (floor)', () => {
  const result = classifyTask({
    kind: 'verify', files: 0, novel_design: false, ambiguity: 'low', risk: 'low',
  });
  assert.equal(result.tier, 'standard');
});

test('classifyTask: asserts score and breakdown for one case', () => {
  const result = classifyTask({
    kind: 'feature', files: 2, novel_design: false, ambiguity: 'med', risk: 'low',
  });
  assert.equal(result.score, 3); // feature=1, files 2-4=1, novel=0, amb=1, risk=0, sum=3
  assert.deepEqual(result.breakdown, {
    kind: 1,
    files: 1,
    novel_design: 0,
    ambiguity: 1,
    risk: 0,
  });
});

test('classifyTask: rejects bad kind', () => {
  assert.throws(
    () => classifyTask({
      kind: 'unknown', files: 1, novel_design: false, ambiguity: 'low', risk: 'low',
    }),
    /kind must be one of/,
  );
});

test('classifyTask: rejects negative files', () => {
  assert.throws(
    () => classifyTask({
      kind: 'mechanical', files: -1, novel_design: false, ambiguity: 'low', risk: 'low',
    }),
    /files must be an integer ≥ 0/,
  );
});

test('classifyTask: rejects fractional files', () => {
  assert.throws(
    () => classifyTask({
      kind: 'mechanical', files: 1.5, novel_design: false, ambiguity: 'low', risk: 'low',
    }),
    /files must be an integer ≥ 0/,
  );
});

test('classifyTask: rejects string novel_design', () => {
  assert.throws(
    () => classifyTask({
      kind: 'mechanical', files: 1, novel_design: 'yes', ambiguity: 'low', risk: 'low',
    }),
    /novel_design must be true\/false/,
  );
});

test('classifyTask: rejects unknown ambiguity', () => {
  assert.throws(
    () => classifyTask({
      kind: 'mechanical', files: 1, novel_design: false, ambiguity: 'extreme', risk: 'low',
    }),
    /ambiguity must be low\|med\|high/,
  );
});

test('classifyTask: rejects toString (prototype key) as ambiguity', () => {
  assert.throws(
    () => classifyTask({
      kind: 'mechanical', files: 1, novel_design: false, ambiguity: 'toString', risk: 'low',
    }),
    /ambiguity must be low\|med\|high/,
  );
});

// ---- routeModel tests ----
test('routeModel: light → haiku', () => {
  assert.equal(routeModel('light'), 'haiku');
});

test('routeModel: standard → sonnet', () => {
  assert.equal(routeModel('standard'), 'sonnet');
});

test('routeModel: heavy → opus', () => {
  assert.equal(routeModel('heavy'), 'opus');
});

test('routeModel: override {heavy: "opus-x"} applies', () => {
  const result = routeModel('heavy', { heavy: 'opus-x' });
  assert.equal(result, 'opus-x');
});

test('routeModel: unknown tier throws', () => {
  assert.throws(() => routeModel('unknown'), /unknown tier/);
});

// ---- parseTierOverrides tests ----
test('parseTierOverrides: empty string → {}', () => {
  assert.deepEqual(parseTierOverrides(''), {});
});

test('parseTierOverrides: undefined → {}', () => {
  assert.deepEqual(parseTierOverrides(undefined), {});
});

test('parseTierOverrides: null → {}', () => {
  assert.deepEqual(parseTierOverrides(null), {});
});

test('parseTierOverrides: valid JSON applies', () => {
  const result = parseTierOverrides('{"heavy": "opus-x"}');
  assert.deepEqual(result, { heavy: 'opus-x' });
});

test('parseTierOverrides: invalid JSON throws', () => {
  assert.throws(() => parseTierOverrides('{bad json}'), /not valid JSON/);
});

test('parseTierOverrides: array throws', () => {
  assert.throws(() => parseTierOverrides('["light"]'), /must be a JSON object/);
});

test('parseTierOverrides: unknown tier throws', () => {
  assert.throws(() => parseTierOverrides('{"unknown": "model"}'), /unknown tier/);
});

test('parseTierOverrides: empty-string value throws', () => {
  assert.throws(() => parseTierOverrides('{"heavy": ""}'), /must be a model alias/);
});

// ---- buildPlan tests ----
test('buildPlan: verify task lifted to max implement tier', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'implement', kind: 'feature', files: 6,
        novel_design: true, ambiguity: 'high', risk: 'high', status: 'pending',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  const result = buildPlan(plan);
  const implTask = result.tasks.find((t) => t.id === 'impl');
  const verifyTask = result.tasks.find((t) => t.id === 'verify');
  assert.equal(implTask.tier, 'heavy');
  assert.equal(verifyTask.tier, 'heavy');
  // verify starts at 'standard' (floor), gets lifted to 'heavy'
  assert.equal(verifyTask.liftedFrom, 'standard');
});

test('buildPlan: verify never below standard', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'implement', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  const result = buildPlan(plan);
  const verifyTask = result.tasks.find((t) => t.id === 'verify');
  // verify starts at 'standard' (floor), stays at 'standard' because impl is only 'light'
  assert.equal(verifyTask.tier, 'standard');
  assert.equal(verifyTask.liftedFrom, undefined);
});

test('buildPlan: plan with no verify task throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'implement', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /needs a separate verify task/);
});

test('buildPlan: plan with only verify tasks throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /needs at least one implement/);
});

test('buildPlan: duplicate ids throw', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'same', title: 'first', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
      {
        id: 'same', title: 'second', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /duplicate task id/);
});

test('buildPlan: id containing "|" throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'bad|id', title: 'task', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /without "\|"/);
});

test('buildPlan: multiline title throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'task\nwith newline', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /single-line string/);
});

test('buildPlan: bad status throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'task', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'bad',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  assert.throws(() => buildPlan(plan), /status must be one of/);
});

test('buildPlan: empty tasks throws', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [],
  };
  assert.throws(() => buildPlan(plan), /non-empty array/);
});

test('buildPlan: overrides change the model', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'implement', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  const result = buildPlan(plan, { light: 'custom-light', standard: 'custom-standard' });
  const implTask = result.tasks.find((t) => t.id === 'impl');
  const verifyTask = result.tasks.find((t) => t.id === 'verify');
  assert.equal(implTask.model, 'custom-light');
  assert.equal(verifyTask.model, 'custom-standard');
});

test('buildPlan: note with "|" is sanitised', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'task', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending', note: 'has|pipe',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  const result = buildPlan(plan);
  const implTask = result.tasks.find((t) => t.id === 'impl');
  assert.equal(implTask.note, 'has pipe');
});

test('buildPlan: note with newlines is sanitised', () => {
  const plan = {
    feasibility: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    tasks: [
      {
        id: 'impl', title: 'task', kind: 'mechanical', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending', note: 'has\nnewline\r\nhere',
      },
      {
        id: 'verify', title: 'verify', kind: 'verify', files: 1,
        novel_design: false, ambiguity: 'low', risk: 'low', status: 'pending',
      },
    ],
  };
  const result = buildPlan(plan);
  const implTask = result.tasks.find((t) => t.id === 'impl');
  assert.equal(implTask.note, 'has newline here');
});

// ---- upsertSection tests ----
test('upsertSection: inserts before "## Implementation" when absent', () => {
  const body = 'Some content\n\n## Implementation\nImpl details';
  const result = upsertSection(body, 'Feasibility', 'Feasibility details');
  assert.ok(result.includes('## Feasibility'));
  assert.ok(result.includes('Feasibility details'));
  const feasIdx = result.indexOf('## Feasibility');
  const implIdx = result.indexOf('## Implementation');
  assert.ok(feasIdx < implIdx);
});

test('upsertSection: appends at end when no Implementation heading', () => {
  const body = 'Some content\n\nOther stuff';
  const result = upsertSection(body, 'Feasibility', 'Feasibility details');
  assert.ok(result.includes('## Feasibility'));
  assert.ok(result.endsWith('## Feasibility\nFeasibility details\n'));
});

test('upsertSection: replacing existing section is idempotent', () => {
  const body = '## Feasibility\nOld details\n\n## Implementation\nImpl details';
  const result1 = upsertSection(body, 'Feasibility', 'New details');
  const result2 = upsertSection(result1, 'Feasibility', 'New details');
  assert.equal(result1, result2);
  assert.equal((result1.match(/## Feasibility/g) || []).length, 1);
});

test('upsertSection: content of following section is preserved', () => {
  const body = '## Feasibility\nOld feasibility\n\n## Implementation\nImpl details';
  const result = upsertSection(body, 'Feasibility', 'New feasibility');
  assert.ok(result.includes('## Implementation'));
  assert.ok(result.includes('Impl details'));
  assert.ok(!result.includes('Old feasibility'));
});

// ---- renderFeasibility tests ----
test('renderFeasibility: output contains verdict', () => {
  const f = {
    verdict: 'go',
    total: 10,
    scores: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    reasons: ['total 10/10, no blockers'],
  };
  const result = renderFeasibility(f);
  assert.ok(result.includes('go'));
  assert.ok(result.includes('10/10'));
});

test('renderFeasibility: output contains all scores', () => {
  const f = {
    verdict: 'go',
    total: 10,
    scores: { clarity: 2, size: 2, cost: 2, risk: 2, testability: 2 },
    reasons: ['total 10/10, no blockers'],
  };
  const result = renderFeasibility(f);
  assert.ok(result.includes('clarity 2'));
  assert.ok(result.includes('size 2'));
  assert.ok(result.includes('cost 2'));
  assert.ok(result.includes('risk 2'));
  assert.ok(result.includes('testability 2'));
});

// ---- renderPlan tests ----
test('renderPlan: output contains tier with backticks for model', () => {
  const tasks = [
    {
      id: 'impl',
      title: 'implement',
      kind: 'mechanical',
      files: 1,
      novel_design: false,
      ambiguity: 'low',
      risk: 'low',
      tier: 'light',
      score: 0,
      model: 'haiku',
      status: 'pending',
      note: 'test note',
    },
  ];
  const result = renderPlan(tasks);
  assert.ok(result.includes('`haiku`'));
  assert.ok(result.includes('light'));
});

test('renderPlan: output contains "lifted from" for lifted verify task', () => {
  const tasks = [
    {
      id: 'verify',
      title: 'verify',
      kind: 'verify',
      files: 1,
      novel_design: false,
      ambiguity: 'low',
      risk: 'low',
      tier: 'heavy',
      liftedFrom: 'light',
      score: 0,
      model: 'opus',
      status: 'pending',
      note: '',
    },
  ];
  const result = renderPlan(tasks);
  assert.ok(result.includes('heavy (lifted from light)'));
});

test('renderPlan: output sanitises pipes in title', () => {
  const tasks = [
    {
      id: 'task',
      title: 'task | with | pipes',
      kind: 'mechanical',
      files: 1,
      novel_design: false,
      ambiguity: 'low',
      risk: 'low',
      tier: 'light',
      score: 0,
      model: 'haiku',
      status: 'pending',
      note: '',
    },
  ];
  const result = renderPlan(tasks);
  assert.ok(result.includes('task / with / pipes'));
});
