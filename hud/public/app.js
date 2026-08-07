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

  $('projects-list').innerHTML = o.projects.map((p) => {
    const act = p.activitySource === 'git' ? 'commit' : 'note';
    const ago = p.daysSince === 0 ? 'today' : `${p.daysSince}d`;
    return `<div class="proj-row">
      <span class="name">${HEALTH[p.health] || '⚪'} ${esc(p.name)}${p.milestones ? ` <span class="dim">(${p.milestones.done}/${p.milestones.total} · ${p.progress}%)</span>` : ''}</span>
      <span><span class="pill">${esc(p.priority)}</span></span>
      <span class="next">${esc(p.next || '—')}</span>
      <span class="dim">${act} ${ago}</span>
    </div>`;
  }).join('');
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

$('refresh').addEventListener('click', () => { loadOverview(); loadTrend(); });
$('metric').addEventListener('change', loadTrend);
document.querySelectorAll('.run').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill, b)));

loadOverview();
loadTrend();
setInterval(loadOverview, 20000); // cheap local poll
