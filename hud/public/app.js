const HEALTH = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' };
const $ = (id) => document.getElementById(id);

// Latest /api/overview payload — stashed so the audio briefing (🔊 AGENDA) can read today's
// focus/attention without re-fetching. Updated on every loadOverview().
let lastOverview = null;

async function loadOverview() {
  const o = await fetch('/api/overview').then((r) => r.json());
  lastOverview = o;
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
    const webapp = p.webappUrl
      ? ` <button class="webapp-btn" data-project="${pj}" title="Launch &amp; open ${escAttr(p.webappUrl)}">⧉ webapp</button>` : '';
    return `<div class="proj-row">
      <span class="name">${esc(p.name)}${p.milestones ? ` <span class="dim">(${p.milestones.done}/${p.milestones.total} · ${p.progress}%)</span>` : ''}${webapp}</span>
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

// A new goal you're typing lives only in the <input>'s value — and loadGoals() rebuilds the whole
// board via innerHTML, which destroys that input. To stop an in-progress goal from vanishing:
//   (A) the 20s background poll skips the re-render while a goal field is focused;
//   (B) any re-render snapshots the current draft values (+ caret) and restores them afterward;
//   (D) drafts are mirrored to localStorage, so they even survive a full reload.
const GOAL_DRAFT_KEY = (project) => `admin-brain:goal-draft:${project}`;
function readGoalDraft(project) {
  try { return localStorage.getItem(GOAL_DRAFT_KEY(project)) || ''; } catch { return ''; }
}
function writeGoalDraft(project, text) {
  try {
    if (text) localStorage.setItem(GOAL_DRAFT_KEY(project), text);
    else localStorage.removeItem(GOAL_DRAFT_KEY(project));
  } catch { /* private mode / storage disabled — drafts just won't persist across reloads */ }
}
// The goal-input the user is currently editing, or null.
function focusedGoalInput() {
  const a = document.activeElement;
  return a && a.classList && a.classList.contains('goal-input') ? a : null;
}

async function loadGoals(opts = {}) {
  const board = await fetch('/api/goals').then((r) => r.json());

  // (A) Never yank the field out from under an active typist on the background poll. Drafts are
  // safe in localStorage regardless; this just avoids disturbing the caret while they type.
  const editing = focusedGoalInput();
  if (opts.background && editing) return;

  // (B) Snapshot in-progress drafts (in-memory, so it works even if localStorage is blocked) and
  // the caret of the focused field, to restore across the innerHTML rebuild below.
  const drafts = {};
  for (const inp of $('goals-board').querySelectorAll('.goal-input')) {
    if (inp.value) drafts[inp.dataset.project] = inp.value;
  }
  const caret = editing ? { project: editing.dataset.project, start: editing.selectionStart, end: editing.selectionEnd } : null;

  const total = board.reduce((n, p) => n + p.goals.length, 0);
  const open = board.reduce((n, p) => n + p.goals.filter((g) => !g.done).length, 0);
  $('goals-sub').textContent = `· ${open} open / ${total} across ${board.length} projects`;
  $('goals-board').innerHTML = board.map((p) => {
    const items = p.goals.length ? p.goals.map((g) => {
      const meta = g.meta ? ` <span class="gmeta dim">${esc(g.meta)}</span>` : '';
      const grip = `<span class="grip" title="Drag to reorder">⠿</span>`;
      // Remove this goal from the roadmap (guarded server-side, confirmed on click; git-recoverable).
      const del = `<button class="goal-del" title="Delete this goal from the roadmap (git-recoverable)" data-project="${escAttr(p.name)}" data-goal="${escAttr(g.text)}">✕</button>`;
      if (g.done) return `<li class="goal done" draggable="true" data-goal="${escAttr(g.text)}">${grip}<span class="gcheck">✓</span><span class="gtext">${esc(g.text)}</span>${meta}${del}</li>`;
      const ctrl = p.hasOpenCycle
        ? `<span class="pill inflight">in flight</span>`
        : `<button class="btn goal-run" data-project="${escAttr(p.name)}" data-goal="${escAttr(g.text)}">▸ Run</button>`;
      return `<li class="goal" draggable="true" data-goal="${escAttr(g.text)}">${grip}<span class="gcheck dim">○</span><span class="gtext">${esc(g.text)}</span>${meta}${ctrl}${del}</li>`;
    }).join('') : '<li class="dim">no roadmap goals yet</li>';
    const add = `<div class="goal-add">
      <input class="goal-input" data-project="${escAttr(p.name)}" placeholder="+ write a new goal…" maxlength="200" />
      <button class="btn goal-add-btn" data-project="${escAttr(p.name)}">+ Add</button>
    </div>`;
    return `<div class="goal-group" data-project="${escAttr(p.name)}"><div class="goal-proj">${esc(p.name)} <span class="dim">${esc(p.status)}${p.hasOpenCycle ? ' · cycle in flight' : ''}</span></div><ul class="goal-list">${items}</ul>${add}</div>`;
  }).join('');

  // (B + D) Restore each project's unsent draft — the in-memory snapshot first, else the persisted
  // localStorage copy — then re-focus the field the user was in and put the caret back.
  for (const inp of $('goals-board').querySelectorAll('.goal-input')) {
    const d = drafts[inp.dataset.project] || readGoalDraft(inp.dataset.project);
    if (d) inp.value = d;
  }
  if (caret) {
    const inp = [...$('goals-board').querySelectorAll('.goal-input')].find((x) => x.dataset.project === caret.project);
    if (inp) {
      inp.focus();
      const start = caret.start == null ? inp.value.length : Math.min(caret.start, inp.value.length);
      const end = caret.end == null ? start : Math.min(caret.end, inp.value.length);
      try { inp.setSelectionRange(start, end); } catch { /* setSelectionRange unsupported on some inputs */ }
    }
  }
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
    if (r.ok) { writeGoalDraft(project, ''); if (input) input.value = ''; await Promise.all([loadOverview(), loadGoals()]); }
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

// Launch + open a project's webapp. Open the tab inside the click gesture (so it isn't
// popup-blocked), then point it at the URL once the server is confirmed up.
$('projects-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button.webapp-btn');
  if (!b) return;
  const win = window.open('', '_blank'); // reserve a tab within the user gesture
  b.disabled = true;
  const orig = b.textContent;
  b.textContent = '⧉ opening…';
  const log = $('deck-log');
  log.textContent = `▶ ensuring ${b.dataset.project} webapp is up…`;
  try {
    const r = await fetch('/api/project/webapp', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: b.dataset.project }),
    }).then((r) => r.json());
    log.textContent = `${r.ok ? '✓' : '✗'} ${r.output || ''}`;
    if (r.ok && r.url) { if (win) win.location = r.url; }
    else if (win) win.close();
  } catch (err) {
    log.textContent = `✗ ${err}`;
    if (win) win.close();
  } finally {
    b.disabled = false;
    b.textContent = orig;
  }
});

// New project: keep the form small, accessible, and server-authoritative. The vault API owns
// validation; the HUD only presents its response and then refreshes from the persisted vault.
function setProjectFormOpen(open) {
  const form = $('project-create-form');
  $('new-project').setAttribute('aria-expanded', String(open));
  form.hidden = !open;
  if (open) $('project-name').focus();
}
$('new-project').addEventListener('click', () => setProjectFormOpen($('project-create-form').hidden));
$('cancel-project').addEventListener('click', () => {
  $('project-create-form').reset();
  $('project-create-status').textContent = '';
  setProjectFormOpen(false);
});
$('project-create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const status = $('project-create-status');
  const input = {
    name: $('project-name').value,
    next: $('project-next').value,
    status: $('project-status').value,
    health: $('project-health').value,
    priority: $('project-priority').value,
  };
  submit.disabled = true;
  status.textContent = 'creating project…';
  try {
    const response = await fetch('/api/project/create', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!result.ok) {
      status.textContent = `✗ ${result.error || 'could not create project'}`;
      return;
    }
    form.reset();
    setProjectFormOpen(false);
    status.textContent = `✓ created ${result.project}`;
    await Promise.all([loadOverview(), loadGoals(), loadCycles()]);
  } catch (err) {
    status.textContent = `✗ ${err}`;
  } finally {
    submit.disabled = false;
  }
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

// Goals board: run a goal through the loop, add a new goal, or delete a goal from the roadmap.
$('goals-board').addEventListener('click', async (e) => {
  const run = e.target.closest('button.goal-run');
  if (run) { run.disabled = true; await loopPost('/api/loop/select-goal', { project: run.dataset.project, goal: run.dataset.goal }, `run goal`); return; }
  const del = e.target.closest('button.goal-del');
  if (del) {
    if (!confirm(`Delete the goal “${del.dataset.goal}” from ${del.dataset.project}? Recoverable via git.`)) return;
    del.disabled = true;
    await loopPost('/api/project/delete-goal', { project: del.dataset.project, goal: del.dataset.goal }, 'delete goal');
    return;
  }
  const add = e.target.closest('button.goal-add-btn');
  if (add) { await addGoal(add.dataset.project, add.closest('.goal-group').querySelector('.goal-input')); }
});
$('goals-board').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('goal-input')) { e.preventDefault(); addGoal(e.target.dataset.project, e.target); }
});
// (D) Persist the in-progress goal to localStorage on every keystroke, so it survives a re-render
// or even a full page reload. Delegated on #goals-board, so it keeps working after each rebuild.
$('goals-board').addEventListener('input', (e) => {
  const inp = e.target.closest && e.target.closest('.goal-input');
  if (inp) writeGoalDraft(inp.dataset.project, inp.value);
});

// Drag to reorder goals within a project; persisted to the roadmap on drop.
let dragEl = null;
$('goals-board').addEventListener('dragstart', (e) => {
  const li = e.target.closest('li.goal');
  if (!li) return;
  dragEl = li;
  li.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', li.dataset.goal || ''); } catch {}
});
$('goals-board').addEventListener('dragover', (e) => {
  if (!dragEl) return;
  const group = e.target.closest('.goal-group');
  if (!group || group !== dragEl.closest('.goal-group')) return; // same project only
  e.preventDefault();
  const over = e.target.closest('li.goal');
  if (!over || over === dragEl) return;
  const rect = over.getBoundingClientRect();
  const after = (e.clientY - rect.top) > rect.height / 2;
  over.parentNode.insertBefore(dragEl, after ? over.nextSibling : over);
});
$('goals-board').addEventListener('drop', (e) => { if (dragEl) e.preventDefault(); });
$('goals-board').addEventListener('dragend', async () => {
  if (!dragEl) return;
  const li = dragEl; dragEl = null;
  li.classList.remove('dragging');
  const group = li.closest('.goal-group');
  if (!group) return;
  const project = group.dataset.project;
  const order = [...group.querySelectorAll('li.goal')].map((x) => x.dataset.goal);
  const log = $('loop-log');
  log.textContent = `▶ reordering ${project} goals…`;
  try {
    const r = await fetch('/api/project/reorder-goals', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project, order }),
    }).then((r) => r.json());
    log.textContent = `${r.ok ? '✓' : '✗'} ${r.output || ''}`;
  } catch (err) {
    log.textContent = `✗ ${err}`;
  }
  await loadGoals(); // re-render from the persisted order (snaps back if the write was rejected)
});

// ---- Voice command bar (push-to-talk, browser-native Web Speech API) ----
// Maps a spoken phrase to one of the HUD's existing buttons. Deterministic keyword grammar —
// no LLM/NLU. The recognition engine is the browser's own; nothing leaves via our server.
const VOICE_COMMANDS = [
  { rx: /\b(brief|standup|stand up|daily)\b/, sel: '.run[data-skill="brief"]', label: 'brief' },
  { rx: /\bmetrics\b/, sel: '.run[data-skill="metrics"]', label: 'metrics' },
  { rx: /\binbox\b/, sel: '.run[data-skill="inbox"]', label: 'inbox' },
  { rx: /\b(agenda|read (my )?goals|say (my )?goals|speak (my )?goals|read the agenda)\b/, sel: '#tts-btn', label: 'audio agenda' },
  { rx: /\b(select|next task|choose next)\b/, sel: '#loop-select', label: 'select next task' },
  { rx: /\b(sync|refresh|reload|update)\b/, sel: '#refresh', label: 'sync' },
];

// Pure + global (window.matchVoiceCommand) so it's unit-testable without a microphone.
function matchVoiceCommand(transcript) {
  const t = String(transcript || '').toLowerCase().trim();
  if (!t) return null;
  if (/\b(help|commands|what can (i|you))\b/.test(t)) return { help: true, label: 'help' };
  for (const c of VOICE_COMMANDS) if (c.rx.test(t)) return { sel: c.sel, label: c.label };
  return null;
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
function setVoiceStatus(msg) { const el = $('voice-status'); if (el) el.textContent = msg || ''; }

// Fire the matched command by clicking the real button (reuses its handler), or explain the miss.
function handleVoiceTranscript(transcript) {
  const m = matchVoiceCommand(transcript);
  if (!m) { setVoiceStatus(`🎙 heard “${transcript}” — no command. Try: brief, metrics, inbox, agenda, select, sync.`); return; }
  if (m.help) { setVoiceStatus('Commands: brief · metrics · inbox · agenda (audio) · select (next task) · sync.'); return; }
  const target = document.querySelector(m.sel);
  if (target) { setVoiceStatus(`🎙 heard “${transcript}” → ${m.label}`); target.click(); }
  else setVoiceStatus(`🎙 “${m.label}” isn't available right now.`);
}

let voiceRec = null;
let voiceListening = false;
function startVoice() {
  const SR = getSpeechRecognition();
  if (!SR) { setVoiceStatus('Voice not supported in this browser.'); return; }
  const btn = $('voice-btn');
  if (voiceListening) { try { voiceRec && voiceRec.stop(); } catch {} return; } // second click = stop
  const rec = new SR();
  voiceRec = rec;
  rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onstart = () => { voiceListening = true; btn.classList.add('listening'); setVoiceStatus('🎙 listening…'); };
  rec.onend = () => { voiceListening = false; btn.classList.remove('listening'); };
  rec.onerror = (e) => setVoiceStatus(
    e.error === 'not-allowed' || e.error === 'service-not-allowed' ? '🎤 mic permission denied.'
      : e.error === 'no-speech' ? "didn't hear anything — try again." : `voice error: ${e.error}`);
  rec.onresult = (e) => {
    const transcript = (e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript) || '';
    handleVoiceTranscript(transcript);
  };
  try { rec.start(); } catch (err) { setVoiceStatus(`voice error: ${err}`); }
}

// Feature-detect + wire the mic button (disabled with a note when unsupported).
(() => {
  const btn = $('voice-btn');
  if (!btn) return;
  if (!getSpeechRecognition()) {
    btn.disabled = true;
    btn.title = 'Voice not supported in this browser';
    setVoiceStatus('voice not supported here');
    return;
  }
  btn.addEventListener('click', startVoice);
})();

// ---- Audio briefing (🔊 AGENDA — Jarvis-styled, browser-native speech synthesis) ----
// The synthesis twin of the voice command bar: reads today's agenda aloud via the browser's
// own SpeechSynthesis. Deterministic, $0, no deps; nothing leaves the machine. A movie-accurate
// Jarvis clone would need an external neural-TTS service (out of scope) — this picks the best
// available British male voice as an honest approximation.
function getSpeechSynthesis() { return window.speechSynthesis || null; }
function setTtsStatus(msg) { const el = $('tts-status'); if (el) el.textContent = msg || ''; }

// Make a focus/attention line speakable: drop markdown, turn dashes/arrows into pauses.
function speechClean(s) {
  return String(s == null ? '' : s)
    .replace(/[`*#_>|]/g, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*→\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pure + global so it's unit-testable without audio: compose a short, Jarvis-styled briefing
// from an /api/overview payload. Handles missing/empty focus + attention gracefully.
function buildBriefingScript(o) {
  if (!o) return 'Good day, sir. I have no data to brief you on just yet.';
  const hr = new Date().getHours();
  const partOfDay = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
  const focus = Array.isArray(o.focus) ? o.focus.map(speechClean).filter(Boolean) : [];
  const attention = Array.isArray(o.attention) ? o.attention.filter(Boolean) : [];
  const active = o.counts && typeof o.counts.active === 'number' ? o.counts.active : null;

  const lines = [`Good ${partOfDay}, sir.`];
  if (active !== null) lines.push(`You have ${active} active ${active === 1 ? 'project' : 'projects'}.`);
  lines.push(attention.length
    ? `${attention.length} ${attention.length === 1 ? 'item needs' : 'items need'} your attention.`
    : 'Nothing is flagged for your attention.');
  if (focus.length) {
    lines.push('Here is your agenda for today.');
    focus.forEach((f, i) => lines.push(`${i + 1}. ${f}.`));
  } else {
    lines.push('There is nothing on the focus board for today.');
  }
  lines.push('That concludes your briefing.');
  return lines.join(' ');
}

// Pure + global: choose the most Jarvis-like installed voice — a British male by preference,
// then any en-GB, then any English, else null (→ the engine's default). Tolerates an empty list.
const JARVIS_VOICE_PREFS = [
  'Google UK English Male',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft George - English (United Kingdom)',
  'Microsoft Ryan - English (United Kingdom)',
  'Daniel (English (United Kingdom))',
  'Daniel',
  'Arthur',
];
function pickJarvisVoice(voices) {
  const list = Array.isArray(voices) ? voices.filter(Boolean) : [];
  if (!list.length) return null;
  for (const pref of JARVIS_VOICE_PREFS) {
    const v = list.find((x) => x.name === pref);
    if (v) return v;
  }
  const enGB = list.filter((x) => /en[-_]?GB/i.test(x.lang || ''));
  const male = enGB.find((x) => /\b(male|daniel|george|ryan|arthur)\b/i.test(x.name || ''));
  if (male) return male;
  if (enGB.length) return enGB[0];
  return list.find((x) => /^en/i.test(x.lang || '')) || null;
}

let ttsSpeaking = false;
function speakAgenda() {
  const synth = getSpeechSynthesis();
  if (!synth) { setTtsStatus('Speech synthesis not supported in this browser.'); return; }
  const btn = $('tts-btn');
  if (ttsSpeaking || synth.speaking) { synth.cancel(); return; } // second click = stop
  const u = new SpeechSynthesisUtterance(buildBriefingScript(lastOverview));
  const voice = pickJarvisVoice(synth.getVoices());
  if (voice) u.voice = voice;
  u.lang = (voice && voice.lang) || 'en-GB';
  u.rate = 0.95; u.pitch = 0.9;
  u.onstart = () => { ttsSpeaking = true; btn && btn.classList.add('speaking'); setTtsStatus(`🔊 briefing…${voice ? ` (${voice.name})` : ''}`); };
  const reset = () => { ttsSpeaking = false; btn && btn.classList.remove('speaking'); };
  u.onend = () => { reset(); setTtsStatus(''); };
  u.onerror = (e) => { reset(); setTtsStatus(e.error === 'interrupted' || e.error === 'canceled' ? '' : `speech error: ${e.error}`); };
  try { synth.speak(u); } catch (err) { setTtsStatus(`speech error: ${err}`); }
}

// Feature-detect + wire the 🔊 button (disabled with a note when unsupported). Warm up the async
// voice list so the first briefing can already pick the Jarvis voice.
(() => {
  const btn = $('tts-btn');
  if (!btn) return;
  const synth = getSpeechSynthesis();
  if (!synth) {
    btn.disabled = true;
    btn.title = 'Audio briefing not supported in this browser';
    setTtsStatus('audio briefing not supported here');
    return;
  }
  try { synth.getVoices(); synth.addEventListener('voiceschanged', () => synth.getVoices()); } catch {}
  btn.addEventListener('click', speakAgenda);
})();

loadOverview();
loadTrend();
loadCycles();
loadGoals();
setInterval(() => { loadOverview(); loadCycles(); loadGoals({ background: true }); }, 20000); // cheap local poll
