const HEALTH = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' };
const $ = (id) => document.getElementById(id);

async function loadOverview() {
  const o = await fetch('/api/overview').then((r) => r.json());
  $('meta').textContent = `${o.date} · updated ${o.generated}`;

  $('glance-nums').innerHTML = [
    ['total', o.counts.total], ['active', o.counts.active],
    ['planned', o.counts.planned], ['blocked', o.counts.blocked],
  ].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');

  $('glance-health').innerHTML =
    `🟢 ${o.health.green}  🟡 ${o.health.yellow}  🔴 ${o.health.red}  ⚪ ${o.health.gray}`;
  $('summary').textContent = o.summary;

  $('attention-list').innerHTML = o.attention.length
    ? o.attention.map((a) => `<li>⚠ ${esc(a)}</li>`).join('')
    : '<li class="dim">✓ nothing urgent</li>';

  $('focus-list').innerHTML = o.focus.length
    ? o.focus.map((f) => `<li>${esc(f)}</li>`).join('')
    : '<li class="dim">nothing queued</li>';

  $('sess-count').textContent = `· ${o.sessionsThisWeek} this week`;
  $('sessions-list').innerHTML = o.recentSessions.length
    ? o.recentSessions.map((s) => {
        const ago = s.daysAgo === 0 ? 'today' : `${s.daysAgo}d ago`;
        return `<li>${s.date} — ${esc(s.project)}${s.player ? ` · ${esc(s.player)}` : ''} <span class="dim">(${ago})</span></li>`;
      }).join('')
    : '<li class="dim">no sessions logged yet</li>';

  const opt = (val, list, label) => list.map((v) => `<option value="${v}"${v === val ? ' selected' : ''}>${label ? label(v) : v}</option>`).join('');
  $('projects-list').innerHTML = o.projects.map((p) => {
    const act = p.activitySource === 'git' ? 'commit' : 'note';
    const ago = p.daysSince === 0 ? 'today' : `${p.daysSince}d`;
    const pj = escAttr(p.name);
    return `<div class="proj-row">
      <span class="name">${esc(p.name)}${p.milestones ? ` <span class="dim">(${p.milestones.done}/${p.milestones.total} · ${p.progress}%)</span>` : ''}</span>
      <select class="edit" data-project="${pj}" data-field="health">${opt(p.health, ['green', 'yellow', 'red', 'gray'], (v) => `${HEALTH[v]} ${v}`)}</select>
      <select class="edit" data-project="${pj}" data-field="priority">${opt(p.priority, ['high', 'med', 'low'])}</select>
      <span class="next">${esc(p.next || '—')}</span>
      <span class="dim">${act} ${ago}</span>
    </div>`;
  }).join('');

  // Keep the feature-loop target dropdown in sync with the project list.
  const tgt = $('loop-target');
  if (tgt) {
    const prev = tgt.value;
    tgt.innerHTML = `<option value="">auto: top ranked</option>` +
      o.projects.map((p) => `<option value="${escAttr(p.name)}">${esc(p.name)}</option>`).join('');
    tgt.value = prev; // preserve selection across refreshes
  }
}

// ---- Feature loop ----
const STAGES = ['select', 'refine', 'implement', 'verify', 'review'];
const STAGE_LABEL = { select: 'SELECT', refine: 'REFINE', implement: 'IMPLEMENT', verify: 'VERIFY', review: 'REVIEW' };

function stageIndex(stage, done) {
  if (done) return STAGES.length - 1;
  const i = STAGES.indexOf(stage);
  return i < 0 ? 0 : i;
}

function pipeline(c) {
  const cur = stageIndex(c.stage, c.done);
  return `<div class="pipe">` + STAGES.map((s, i) => {
    const cls = c.done ? 'done' : i < cur ? 'done' : i === cur ? 'cur' : 'pend';
    return `<span class="pstep ${cls}">${STAGE_LABEL[s]}</span>`;
  }).join('<span class="parrow">›</span>') + `</div>`;
}

function actionControl(c) {
  const k = c.next.kind;
  if (k === 'approve') return `<button class="btn loop-act" data-act="approve" data-base="${escAttr(c.base)}">✓ ${esc(c.next.label)}</button>`;
  if (k.indexOf('run:') === 0) {
    const stage = k.slice(4);
    return `<button class="btn loop-act" data-act="run" data-stage="${stage}" data-project="${escAttr(c.project)}">▸ ${esc(c.next.label)}</button>`;
  }
  if (k === 'claude') return `<span class="pill claude">⤳ ${esc(c.next.label)}</span>`;
  return `<span class="pill done-pill">✓ ${esc(c.next.label)}</span>`;
}

function cycleCard(c) {
  const meta = [c.branch && `⑂ ${esc(c.branch)}`, c.report && `▤ report`].filter(Boolean).join(' · ');
  return `<div class="cyc-card">
    <div class="cyc-top"><span class="cyc-proj">${esc(c.project)}</span><span class="cyc-task">${esc(c.task || '—')}</span></div>
    ${pipeline(c)}
    <div class="cyc-foot">${actionControl(c)}<span class="cyc-status dim">${meta || `${esc(c.stage)} · ${esc(c.status)}`}</span></div>
  </div>`;
}

async function loadCycles() {
  const data = await fetch('/api/cycles').then((r) => r.json());
  const active = data.active;
  const done = data.cycles.filter((c) => c.done);
  $('loop-sub').textContent = active.length ? `· ${active.length} active` : '· idle';
  $('loop-active').innerHTML = active.length
    ? active.map(cycleCard).join('')
    : '<p class="dim">No active cycle. Pick a target (or leave auto) and SELECT the next task.</p>';
  $('cycles-list').innerHTML = done.length
    ? done.map((c) => `<div class="proj-row loop-row"><span class="name">${esc(c.task || c.project)}</span><span class="dim">${esc(c.project)}</span><span class="dim">✓ ${esc(c.status)}</span><span class="dim">${c.branch ? esc(c.branch) : ''}</span></div>`).join('')
    : '<p class="dim">none yet</p>';
}

async function loadGoals() {
  const board = await fetch('/api/goals').then((r) => r.json());
  const total = board.reduce((n, p) => n + p.goals.length, 0);
  const open = board.reduce((n, p) => n + p.goals.filter((g) => !g.done).length, 0);
  $('goals-sub').textContent = `· ${open} open / ${total} across ${board.length} projects`;
  $('goals-board').innerHTML = board.map((p) => {
    const items = p.goals.length ? p.goals.map((g) => {
      const meta = g.meta ? ` <span class="gmeta dim">${esc(g.meta)}</span>` : '';
      if (g.done) return `<li class="goal done"><span class="gcheck">✓</span><span class="gtext">${esc(g.text)}</span>${meta}</li>`;
      const ctrl = p.hasOpenCycle
        ? `<span class="pill inflight">in flight</span>`
        : `<button class="btn goal-run" data-project="${escAttr(p.name)}" data-goal="${escAttr(g.text)}">▸ Run</button>`;
      return `<li class="goal"><span class="gcheck dim">○</span><span class="gtext">${esc(g.text)}</span>${meta}${ctrl}</li>`;
    }).join('') : '<li class="dim">no roadmap goals yet</li>';
    const add = `<div class="goal-add">
      <input class="goal-input" data-project="${escAttr(p.name)}" placeholder="+ write a new goal…" maxlength="200" />
      <button class="btn goal-add-btn" data-project="${escAttr(p.name)}">+ Add</button>
    </div>`;
    return `<div class="goal-group"><div class="goal-proj">${esc(p.name)} <span class="dim">${esc(p.status)}${p.hasOpenCycle ? ' · cycle in flight' : ''}</span></div><ul class="goal-list">${items}</ul>${add}</div>`;
  }).join('');
}

async function addGoal(project, input) {
  const text = ((input && input.value) || '').trim();
  if (!text) return;
  const log = $('loop-log');
  log.textContent = `▶ adding goal to ${project}…`;
  try {
    const r = await fetch('/api/project/add-goal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project, text }),
    }).then((r) => r.json());
    log.textContent = `${r.ok ? '✓' : '✗'} ${r.output || ''}`;
    if (r.ok) { if (input) input.value = ''; await Promise.all([loadOverview(), loadGoals()]); }
    // on failure, leave the board (and the typed text) as-is
  } catch (e) {
    log.textContent = `✗ ${e}`;
  }
}

async function loopPost(url, payload, running) {
  const log = $('loop-log');
  log.textContent = `▶ ${running}…`;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json());
    log.textContent = `${r.ok ? '✓' : '✗'} ${r.output || '(done)'}`;
  } catch (e) {
    log.textContent = `✗ ${e}`;
  } finally {
    await Promise.all([loadOverview(), loadCycles(), loadGoals()]);
  }
}

async function loadTrend() {
  const metric = $('metric').value;
  const t = await fetch(`/api/trends?metric=${encodeURIComponent(metric)}`).then((r) => r.json());
  const svg = $('spark');
  const pts = t.series.map((s) => s.value);
  if (pts.length < 2) {
    svg.innerHTML = `<text x="150" y="38" fill="#5c7a70" font-size="11" text-anchor="middle">collecting history… (${pts.length} snapshot${pts.length === 1 ? '' : 's'})</text>`;
    $('trend-note').textContent = 'Run metrics on multiple days to build a trend.';
    return;
  }
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const X = (i) => (i / (pts.length - 1)) * 296 + 2;
  const Y = (v) => 64 - ((v - min) / span) * 58;
  const poly = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const last = pts.length - 1;
  svg.innerHTML = `<polyline points="${poly}"></polyline><circle cx="${X(last).toFixed(1)}" cy="${Y(pts[last]).toFixed(1)}" r="3"></circle>`;
  const d = t.trend;
  $('trend-note').textContent = `${metric}: ${d.direction} ${d.change_pct >= 0 ? '+' : ''}${d.change_pct}% over ${t.series.length} snapshots.`;
}

async function runSkill(skill, btn) {
  const log = $('deck-log');
  log.textContent = `▶ running ${skill}…`;
  btn.disabled = true;
  try {
    const r = await fetch(`/api/run/${skill}`, { method: 'POST' }).then((r) => r.json());
    log.textContent = `$ ${skill}  ${r.ok ? '✓' : '✗ (exit ' + (r.code ?? '?') + ')'}\n\n${r.output || '(no output)'}`;
    await Promise.all([loadOverview(), loadTrend()]); // reflect any new notes
  } catch (e) {
    log.textContent = `✗ ${skill} failed: ${e}`;
  } finally {
    btn.disabled = false;
  }
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Write-back: editing a project's health/priority dropdown updates the vault note.
$('projects-list').addEventListener('change', async (e) => {
  const sel = e.target.closest('select.edit');
  if (!sel) return;
  sel.disabled = true;
  try {
    const r = await fetch('/api/project/update', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: sel.dataset.project, field: sel.dataset.field, value: sel.value }),
    }).then((r) => r.json());
    if (!r.ok) throw new Error('rejected');
  } catch {
    /* fall through — reload restores the true value */
  }
  await loadOverview(); // re-render reflects the saved value (and any ranking impact)
});

$('refresh').addEventListener('click', () => { loadOverview(); loadTrend(); loadCycles(); loadGoals(); });
$('metric').addEventListener('change', loadTrend);
document.querySelectorAll('.run').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill, b)));

// Feature loop: SELECT next task, and delegated stage/approve actions on the cycle cards.
$('loop-select').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true;
  await loopPost('/api/loop/run', { stage: 'select', project: $('loop-target').value || '' }, 'select');
  e.currentTarget.disabled = false;
});
$('loop-active').addEventListener('click', async (e) => {
  const b = e.target.closest('button.loop-act');
  if (!b) return;
  b.disabled = true;
  if (b.dataset.act === 'approve') await loopPost('/api/cycle/approve', { base: b.dataset.base }, 'approve');
  else await loopPost('/api/loop/run', { stage: b.dataset.stage, project: b.dataset.project || '' }, b.dataset.stage);
});

// Goals board: run a goal through the loop, or add a new goal to a project.
$('goals-board').addEventListener('click', async (e) => {
  const run = e.target.closest('button.goal-run');
  if (run) { run.disabled = true; await loopPost('/api/loop/select-goal', { project: run.dataset.project, goal: run.dataset.goal }, `run goal`); return; }
  const add = e.target.closest('button.goal-add-btn');
  if (add) { await addGoal(add.dataset.project, add.closest('.goal-group').querySelector('.goal-input')); }
});
$('goals-board').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('goal-input')) { e.preventDefault(); addGoal(e.target.dataset.project, e.target); }
});

loadOverview();
loadTrend();
loadCycles();
loadGoals();
setInterval(() => { loadOverview(); loadCycles(); loadGoals(); }, 20000); // cheap local poll
