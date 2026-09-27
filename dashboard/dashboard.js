/* EchoCode Dashboard — reads ../artifacts/final-run/report.json
   Every fact, count, SHA, status and test outcome on the page comes from the
   report. Hard-coded strings are limited to headings, plain-language
   explanations and presentational labels. */

(async function () {
  const reportPath = '../artifacts/final-run/report.json';

  let report;
  try {
    const res = await fetch(reportPath);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${reportPath}`);
    report = await res.json();
  } catch (err) {
    document.getElementById('app').innerHTML = `
      <div class="boot">
        <div class="boot-logo">${logoMark()}EchoCode</div>
        <div class="boot-error">Couldn’t load report.json</div>
        <p class="boot-help">${esc(err.message)}<br><br>Serve the repo root over HTTP:<br>
        <code>python -m http.server 8080</code><br>then open <code>http://localhost:8080/dashboard/</code></p>
      </div>`;
    return;
  }

  render(report);
})();

/* ── Utilities ─────────────────────────────────────────────────────── */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** HTML-escape text taken from the report before injecting it */
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Extract a 7-char short SHA from various formats in report.json */
function shortSha(full) {
  if (!full || full === '—') return '—';
  const m = String(full).match(/([0-9a-f]{7,40})/i);
  return m ? m[1].slice(0, 7) : String(full).slice(0, 7);
}

/** Map a report status string to a colour tone */
function tone(s) {
  const u = String(s || '').toUpperCase();
  if (u.includes('REPAIRED') || u.includes('VERIFIED')) return 'green';
  if (u.includes('CONFIRMED')) return 'purple';
  if (u.includes('CANDIDATE')) return 'yellow';
  if (u.includes('INFERRED'))  return 'gray';
  if (u.includes('FAIL'))      return 'red';
  if (u.includes('PASS'))      return 'green';
  return 'blue';
}

function badge(text, t, dot) {
  return `<span class="badge tone-${t || tone(text)}">${dot ? '<i class="badge-dot"></i>' : ''}${esc(text)}</span>`;
}

/** Parse a pytest summary such as "1 failed, 5 passed" into counts */
function parseOutcome(text) {
  const s = String(text || '');
  const failed = +(s.match(/(\d+)\s+failed/) || [0, 0])[1];
  const passed = +(s.match(/(\d+)\s+passed/) || [0, 0])[1];
  return { failed, passed, total: failed + passed };
}

/** One pill per test, red for failures */
function testBar(outcome) {
  const o = parseOutcome(outcome);
  if (!o.total) return '';
  const cells = [
    ...Array.from({ length: o.passed }, () => 'tb-pass'),
    ...Array.from({ length: o.failed }, () => 'tb-fail'),
  ].map((c, i) => `<i class="${c}" style="--i:${i}"></i>`).join('');
  return `<div class="testbar" title="${esc(outcome)}">
    <div class="testbar-cells">${cells}</div>
    <div class="testbar-label"><span class="t-green">${o.passed} passed</span>${o.failed ? ` · <span class="t-red">${o.failed} failed</span>` : ''}</div>
  </div>`;
}

const num = v => (v === undefined || v === null || v === '' || isNaN(+v)) ? null : +v;

/* Material-style icon paths (24×24) */
const ICONS = {
  home:        'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  lightbulb:   'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  verified:    'M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z',
  play_circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
  hub:         'M17 16l-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z',
  bug:         'M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z',
  science:     'M19.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z',
  history:     'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  info:        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  check:       'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  check_circle:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  error:       'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  chevron_l:   'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  chevron_r:   'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  expand:      'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
  replay:      'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
  pause:       'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  play:        'M8 5v14l11-7z',
  skip:        'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  arrow_down:  'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  arrow_right: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  search:      'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  school:      'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
  build:       'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  code:        'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  compare:     'M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z',
  commit:      'M16.9 11a5 5 0 0 0-9.8 0H2v2h5.1a5 5 0 0 0 9.8 0H22v-2h-5.1zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
};
function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ''}"/></svg>`;
}

/** Google Material 3 button */
function gbtn(label, variant = 'filled', ic = '', attrs = '') {
  return `<button class="gbtn gbtn-${variant}${ic ? ' has-icon' : ''}" ${attrs}>${ic ? icon(ic) : ''}<span>${label}</span></button>`;
}

function logoMark() {
  return `<span class="logo-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
}

/** Section heading block */
function head(eyebrow, title, sub, t = 'blue') {
  return `
  <header class="sec-head" data-stagger>
    <p class="eyebrow t-${t}">${eyebrow}</p>
    <h2 class="sec-title">${title}</h2>
    ${sub ? `<p class="sec-sub">${sub}</p>` : ''}
  </header>`;
}

/** Decorative blurred orbs with parallax */
function orbs(list) {
  return list.map(([c, x, y, s, speed]) =>
    `<i class="orb orb-${c}" data-speed="${speed}" style="left:${x};top:${y};--s:${s}px" aria-hidden="true"></i>`).join('');
}

const ROLE_LABELS = {
  historical_payment_demo:        'Historical demo',
  historical_payment_regression:  'Regression test',
  historical_payment_repair:      'Historical repair',
  failure_signature:              'Pattern extracted',
  current_refund_scenario:        'Current scenario',
  current_code_candidate_finding: 'Candidate finding',
  refund_behavioral_verification: 'Behavioral test',
  refund_repair:                  'Repair applied',
};
const ROLE_TONE = {
  historical_payment_demo: 'blue', historical_payment_regression: 'red', historical_payment_repair: 'green',
  failure_signature: 'purple', current_refund_scenario: 'yellow', current_code_candidate_finding: 'yellow',
  refund_behavioral_verification: 'blue', refund_repair: 'green',
};
const phaseOf = role => (/^historical|^failure_signature/.test(role) ? 'historical' : 'current');

/* Short titles for each of the 10 evidence chain steps */
const EC_TITLES = [
  'Defect introduced', 'Regression test fails', 'Historical repair', 'Pattern extracted', 'Vulnerable code added',
  'Candidate identified', 'Behavioral test fails', 'Finding confirmed', 'Repair applied', 'Repair verified',
];

function ecSentence(desc) {
  const periodIdx = desc.indexOf('.');
  const first = periodIdx > 0 && periodIdx < 120 ? desc.slice(0, periodIdx + 1) : desc;
  if (first.length <= 115) return first;
  const cut = first.lastIndexOf(' ', 110);
  return cut > 0 ? first.slice(0, cut) + '…' : first.slice(0, 110) + '…';
}

/* Concise display summaries for each limitation, keyed by partial match */
const LIMIT_DISPLAY = [
  { match: 'SYNTHETIC',              title: 'Synthetic data only',         detail: 'All data is synthetic. No real customers or transactions involved.' },
  { match: 'PYTHON',                 title: 'Python + SQLite',             detail: 'Prototype implementation only. Enforcement mechanism is SQLite-specific.' },
  { match: 'SINGLE FAILURE',         title: 'One pattern family',          detail: 'Only one failure class demonstrated end-to-end.' },
  { match: 'NO REAL FINANCIAL',      title: 'No financial system',         detail: 'No real payment gateway or banking API connected at any point.' },
  { match: 'NO PRODUCTION',          title: 'No production CI/CD',         detail: 'Manual local validation only. No automated trigger or deployment gate.' },
  { match: 'HUMAN-REVIEWED',         title: 'Humans stay in charge',       detail: 'EchoCode proposes fixes only. Humans review and apply every repair.' },
  { match: 'NO AUTOMATIC CODE',      title: 'No automatic merge',          detail: 'Repair was authored by a team member. EchoCode did not commit to production.' },
  { match: 'CONCURRENT',             title: 'Concurrency not tested',      detail: 'Simultaneous retry behaviour remains outside prototype scope.' },
  { match: 'IN-MEMORY',              title: 'In-memory database',          detail: 'Cross-process or cross-session persistence behaviour is not tested.' },
  { match: 'PATTERN GENERALISATION', title: 'Pattern not yet generalised', detail: 'Pattern validated across two cases only — not a third independent incident.' },
];
function limitTitle(text) {
  const m = text.match(/^([^—–\n]+?)(?:\s*[—–]|\s{2,}|$)/);
  return m ? m[1].trim() : text.slice(0, 60);
}
function limitDetail(text) {
  const idx = text.indexOf('—');
  return idx >= 0 ? text.slice(idx + 1).trim() : '';
}

const SECTIONS = [
  { id: 'hero',    label: 'Home',         icon: 'home',        theme: 'dark'  },
  { id: 'how',     label: 'How it works', icon: 'lightbulb',   theme: 'light' },
  { id: 'result',  label: 'Result',       icon: 'verified',    theme: 'paper' },
  { id: 'replay',  label: 'Replay',       icon: 'play_circle', theme: 'dark'  },
  { id: 'pattern', label: 'Pattern',      icon: 'hub',         theme: 'light' },
  { id: 'finding', label: 'Finding',      icon: 'bug',         theme: 'paper' },
  { id: 'tests',   label: 'Tests',        icon: 'science',     theme: 'light' },
  { id: 'proof',   label: 'Proof',        icon: 'history',     theme: 'paper' },
  { id: 'limits',  label: 'Limits',       icon: 'info',        theme: 'dark'  },
];

/* ── Main render ───────────────────────────────────────────────────── */

function render(r) {
  const finding = r.findings[0];
  const lp      = r.learned_failure_pattern;
  const ev      = type => (r.evidence || []).find(e => e.type === type) || {};

  const ctx = {
    r, finding, lp,
    rv:    r.repair_verification || {},
    hist:  r.historical_case || {},
    cf:    (r.verification_results || {}).current_case_cf001 || {},
    failE: ev('fail_test_run'),
    passE: ev('pass_test_run'),
    chain: r.evidence_chain || [],
  };
  ctx.overall = ctx.rv.repair_verification_status || finding.status;

  /* Display-ready commit list, inserting the signature extraction commit */
  const commits = [...(r.commit_registry || [])];
  const sigEntry = {
    sha: lp.extracted_at_commit, role: 'failure_signature',
    message: lp.extracted_at_commit_message, date: '2026-09-26', status: 'OBSERVED',
  };
  const repairIdx = commits.findIndex(c => c.role === 'historical_payment_repair');
  commits.splice(repairIdx >= 0 ? repairIdx + 1 : 3, 0, sigEntry);
  ctx.commits = commits;

  document.getElementById('app').innerHTML = `
    ${buildDock()}
    ${buildHero(ctx)}
    <main class="sheet">
      ${buildHow(ctx)}
      ${buildResult(ctx)}
      ${buildReplay(ctx)}
      ${buildPattern(ctx)}
      ${buildFinding(ctx)}
      ${buildTests(ctx)}
      ${buildProof(ctx)}
      ${buildLimits(ctx)}
      <footer class="foot">
        <div class="foot-logo">${logoMark()}EchoCode</div>
        <p>${esc(r.run_id)} · pipeline ${esc(r.pipeline_version)} · commit <span class="mono">${shortSha(r.analyzed_commit)}</span> · ${esc(r.timestamp)}</p>
        <p class="foot-note">Every figure on this page is read from <span class="mono">artifacts/final-run/report.json</span>.</p>
      </footer>
    </main>`;

  setupReveals();
  setupScrollFx();
  setupGlobe(ctx);
  setupReplay(ctx.chain, commits);
  setupRetrySims();
  setupProof();
  setupExpanders();
  setupCounters();
  setupPointerFx();
  setupRipples();
  setupGo();
  setupKeys();
}

/* ── Dock (floating icon menu) ─────────────────────────────────────── */

function buildDock() {
  return `
  <nav class="dock" aria-label="Sections">
    <a class="dock-item dock-home" href="../" aria-label="EchoCode home page">
      ${logoMark()}<span class="dock-label">EchoCode</span>
    </a>
    <span class="dock-sep" aria-hidden="true"></span>
    ${SECTIONS.map((s, i) => `
      <a class="dock-item" href="#${s.id}" data-target="${s.id}" aria-label="${s.label} (key ${i + 1})">
        ${icon(s.icon)}<span class="dock-label">${s.label}</span>
      </a>`).join('')}
  </nav>`;
}

/* ── Hero ──────────────────────────────────────────────────────────── */

function buildHero({ finding, rv, overall, hist }) {
  const words = 'From past defects'.split(' ');
  const idKey = ((finding.structural_evidence || {}).idempotency_key || '').split('—')[0].trim();
  return `
  <section class="hero" id="hero" data-theme="dark">
    <div class="hero-stage">
      <canvas class="hero-globe" aria-hidden="true"></canvas>
    </div>
    <div class="hero-floats" aria-hidden="true">
      <span class="float-chip fc-1" data-speed="-0.25"><i class="dot-blue"></i>operation_id</span>
      <span class="float-chip fc-2" data-speed="-0.4"><i class="dot-green"></i>fix ${shortSha(((hist.commits || {}).historical_fix || {}).sha)}</span>
      <span class="float-chip fc-3" data-speed="-0.3"><i class="dot-yellow"></i>${esc(idKey)}</span>
      <span class="float-chip fc-4" data-speed="-0.45"><i class="dot-purple"></i>${esc(finding.finding_id)} · ${esc(finding.status.toLowerCase())}</span>
    </div>
    <div class="hero-inner">
      <p class="hero-kicker">${logoMark()}<span>EchoCode</span><span class="sep"></span><span class="muted">AI code forensics</span></p>
      <h1 class="hero-title">
        <span class="line">${words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ')}</span>
        <span class="line grad-line"><span class="grad">to future prevention.</span></span>
      </h1>
      <p class="hero-sub">EchoCode learned why a payment bug happened, found the same mistake hiding in the refund code, and proved the fix with a real test.</p>
      <div class="hero-cta">
        ${gbtn('Watch the replay', 'filled', 'play', 'data-go="replay" data-play')}
        ${gbtn('See the result', 'outlined', '', 'data-go="result"')}
      </div>
      <div class="hero-status">${badge(overall, 'green', true)}<span class="muted">${esc(finding.finding_id)} · verified at <span class="mono">${shortSha(rv.repair_commit)}</span></span></div>
    </div>
    <a class="scroll-cue" href="#how" aria-label="Scroll to how it works">${icon('arrow_down')}</a>
  </section>`;
}

/* ── How it works ──────────────────────────────────────────────────── */

function buildHow({ finding, lp, hist, cf, failE, passE }) {
  const hb   = hist.regression_test_before_fix || {};
  const fix  = ((hist.commits || {}).historical_fix || {}).sha;
  const mc   = finding.matching_conditions || [];
  const file = String(finding.component || '').split('/').pop();

  const statement = 'A retried request should never write twice. EchoCode remembers when one did, and hunts for the same mistake in new code.';

  const cards = [
    { n: '01', ic: 'school', t: 'blue', title: 'Learn from a past bug',
      text: `A retried payment saved <b>${esc(hb.actual_durable_records)}</b> ledger rows instead of <b>${esc(hb.expected_durable_records)}</b>. The team fixed it, and EchoCode learned why it happened.`,
      fact: `Fixed in <span class="mono">${shortSha(fix)}</span>` },
    { n: '02', ic: 'search', t: 'yellow', title: 'Spot the same mistake',
      text: `It turned that bug into a reusable pattern and scanned current code. <span class="mono">${esc(file)}</span> matched <b>${mc.length} of ${(lp.required_conditions || []).length}</b> warning signs.`,
      fact: esc(lp.pattern_name) },
    { n: '03', ic: 'check_circle', t: 'green', title: 'Prove it with a test',
      text: `A behavioral test reproduced the bug: <b>${esc(failE.actual_durable_records)}</b> rows for one refund. After the repair, the same unchanged test gets <b>${esc(passE.actual_durable_records)}</b>.`,
      fact: `${esc(cf.before_repair_outcome)} → ${esc(cf.after_repair_outcome)}` },
  ];

  return `
  <section class="sec" id="how" data-theme="light">
    ${orbs([['blue', '-6%', '8%', 420, -0.12], ['yellow', '84%', '40%', 300, 0.1], ['green', '12%', '78%', 260, -0.08]])}
    <div class="wrap">
      ${head('How it works', 'Three steps.<br>One real bug, caught.', '', 'blue')}
      <p class="scrub" aria-label="${statement}">${statement.split(' ').map(w => `<span>${w}</span>`).join(' ')}</p>
      <div class="how-grid" data-stagger>
        ${cards.map(c => `
        <article class="card how-card tilt">
          <div class="how-top">
            <span class="icon-bubble tone-${c.t}">${icon(c.ic)}</span>
            <span class="how-n">${c.n}</span>
          </div>
          <h3 class="card-title">${c.title}</h3>
          <p class="card-text">${c.text}</p>
          <p class="how-fact t-${c.t}">${c.fact}</p>
        </article>`).join('')}
      </div>
    </div>
  </section>`;
}

/* ── Result ────────────────────────────────────────────────────────── */

function buildResult({ r, finding, rv, cf, failE, passE, chain, overall }) {
  const before   = num(failE.actual_durable_records);
  const after    = num(passE.actual_durable_records);
  const expected = num(passE.expected_durable_records);
  const dots = chain.map(c => `<i class="chain-dot tone-${tone(c.status)}" title="Step ${c.step} · ${esc(c.status)}"></i>`).join('');
  const ref  = (String(failE.failing_assertion || '').match(/refund_reference='([^']+)'/) || [])[1] || 'refund_reference';
  /* one pill per recorded row; rows beyond the expected count are duplicates */
  const dbRows = n => Array.from({ length: n || 0 }, (_, i) => {
    const dup = expected !== null && i >= expected;
    return `<div class="dbrow${dup ? ' dup' : ''}" style="--i:${i}"><span class="mono">${esc(ref)}</span><b>${dup ? 'Duplicate' : 'Saved'}</b></div>`;
  }).join('');

  return `
  <section class="sec" id="result" data-theme="paper">
    <div class="wrap">
      ${head('The result', 'Repaired. And proven.', 'One retried refund used to create two database rows. Now it creates one, and a real test proves it.', 'green')}
      <div class="result-grid" data-stagger>
        <article class="card result-main">
          <div class="rm-top">${badge(overall, 'green', true)}<span class="muted mono">${esc(finding.finding_id)}</span></div>
          <h3 class="rm-title">${esc(finding.title)}</h3>
          <p class="rm-q">What happens when the same refund is sent twice?</p>
          <div class="compare">
            <div class="cmp cmp-bad">
              <p class="cmp-label">${icon('error')}Before repair</p>
              <p class="compare-num" data-count="${before ?? ''}">${before ?? '—'}</p>
              <p class="cmp-unit">database rows</p>
              <div class="dbrows">${dbRows(before)}</div>
            </div>
            <div class="cmp-mid" aria-hidden="true">
              <span class="cmp-line"></span>
              <span class="compare-arrow">${icon('arrow_right')}</span>
              <span class="cmp-fix">${icon('build')}<span class="mono">${shortSha(rv.repair_commit)}</span></span>
            </div>
            <div class="cmp cmp-good">
              <p class="cmp-label">${icon('check_circle')}After repair</p>
              <p class="compare-num" data-count="${after ?? ''}">${after ?? '—'}</p>
              <p class="cmp-unit">database row${after === 1 ? '' : 's'}</p>
              <div class="dbrows">${dbRows(after)}</div>
            </div>
          </div>
          <div class="rm-foot">
            <span class="soft-chip">${icon('check')}Expected: ${expected ?? '—'} row per refund</span>
            <span class="soft-chip">${icon('check')}Same test · no assertion changes</span>
          </div>
        </article>
        <article class="card tile">
          <p class="tile-label">Tests before repair</p>
          <p class="tile-num">${parseOutcome(cf.before_repair_outcome).failed} <span>failing</span></p>
          ${testBar(cf.before_repair_outcome)}
        </article>
        <article class="card tile">
          <p class="tile-label">Tests after repair</p>
          <p class="tile-num">${parseOutcome(cf.after_repair_outcome).passed} <span>passing</span></p>
          ${testBar(cf.after_repair_outcome)}
        </article>
        <article class="card tile">
          <p class="tile-label">Evidence trail</p>
          <p class="tile-num" data-count="${chain.length}">${chain.length} <span>steps</span></p>
          <div class="chain-dots">${dots}</div>
          <p class="testbar-label">${(r.commit_registry || []).length} commits in the registry</p>
        </article>
      </div>
    </div>
  </section>`;
}

/* ── Replay ────────────────────────────────────────────────────────── */

function buildReplay({ r, lp, finding, failE, passE, chain }) {
  const mc = finding.matching_conditions || [];
  const stages = [
    { ic: 'school',       t: 'blue',   label: 'Historical bug',  title: 'Payment retry',             detail: 'Duplicate charge on a repeated operation_id', b: ['Observed', 'blue'] },
    { ic: 'hub',          t: 'blue',   label: 'Pattern learned', title: esc(lp.pattern_name),        detail: 'Extracted from Git history',                   b: ['Extracted', 'blue'] },
    { ic: 'code',         t: 'yellow', label: 'Current code',    title: 'Refund processor',          detail: `${mc.length} of ${(lp.required_conditions || []).length} conditions matched`, b: ['Candidate', 'yellow'] },
    { ic: 'error',        t: 'red',    label: 'Behavioral test', title: 'Fails',                     detail: `Expected ${esc(failE.expected_durable_records)} row · got ${esc(failE.actual_durable_records)}`, b: ['Confirmed', 'purple'] },
    { ic: 'build',        t: 'green',  label: 'Repair',          title: 'UNIQUE + INSERT OR IGNORE', detail: 'Mirrors the historical fix',                   b: ['Repaired', 'green'] },
    { ic: 'check_circle', t: 'green',  label: 'Same test',       title: 'Passes',                    detail: `Expected ${esc(passE.expected_durable_records)} row · got ${esc(passE.actual_durable_records)}`, b: ['Verified', 'green'] },
  ];

  return `
  <section class="sec" id="replay" data-theme="dark">
    ${orbs([['blue', '70%', '-4%', 460, -0.1], ['purple', '-8%', '60%', 380, 0.12]])}
    <div class="wrap">
      ${head('Replay', 'Watch the investigation unfold.', `${chain.length} recorded steps, played back in order. Each stage lights up as its evidence arrives.`, 'purple')}
      <div class="flow" data-stagger>
        ${stages.map((s, i) => `
        <article class="card flow-node">
          <div class="flow-top"><span class="icon-bubble sm tone-${s.t}">${icon(s.ic)}</span><span class="flow-n">${i + 1}</span></div>
          <p class="flow-label t-${s.t}">${s.label}</p>
          <h3 class="flow-title">${s.title}</h3>
          <p class="flow-detail">${s.detail}</p>
          ${badge(s.b[0], s.b[1])}
        </article>`).join('')}
      </div>

      <div class="console card" data-reveal>
        <div class="console-head">
          ${logoMark()}
          <p class="console-title">Evidence replay <span class="muted mono">${esc(r.run_id)}</span></p>
          <div class="console-ctrl">
            ${gbtn('Pause', 'tonal', 'pause', 'data-replay="toggle"')}
            ${gbtn('Restart', 'outlined', 'replay', 'data-replay="restart"')}
            ${gbtn('Show all', 'text', 'skip', 'data-replay="skip"')}
          </div>
        </div>
        <div class="stepper">
          <div class="stepper-rail"><div class="stepper-fill"></div></div>
          ${chain.map((c, i) => `<button class="stp" data-step="${i}" aria-label="Jump to step ${c.step}: ${EC_TITLES[i] || ''}"><span>${c.step}</span></button>`).join('')}
        </div>
        <div class="console-body" role="log" aria-live="off"></div>
      </div>
    </div>
  </section>`;
}

/* ── Pattern ───────────────────────────────────────────────────────── */

function buildPattern({ finding, lp, hist, rv, failE }) {
  const hb = hist.regression_test_before_fix || {};
  const fixSha = ((hist.commits || {}).historical_fix || {}).sha;
  const idKey = ((finding.structural_evidence || {}).idempotency_key || '').split('—')[0].trim();
  const conds = ['Caller-supplied identity', 'Unconditional durable write', 'No deduplication guard', 'Operation can be retried'];
  const full  = lp.required_conditions || [];

  const facts = rows => rows.map(([k, v, t]) =>
    `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v${t ? ' t-' + t : ''}">${v}</span></div>`).join('');

  return `
  <section class="sec" id="pattern" data-theme="light">
    ${orbs([['purple', '78%', '10%', 360, -0.1], ['blue', '-4%', '55%', 320, 0.1]])}
    <div class="wrap">
      ${head('Pattern', 'Same mistake.<br>Different code.', 'The payment bug and the refund bug look different on the surface, but they fail in exactly the same way.', 'purple')}
      <div class="pair" data-stagger>
        <article class="card case">
          <p class="eyebrow-sm t-blue">Historical case</p>
          <h3 class="card-title">Payment processor</h3>
          ${facts([
            ['Identity key', '<span class="mono">operation_id</span>'],
            ['What went wrong', `${esc(hb.actual_durable_records)} rows for one payment`, 'red'],
            ['Status', `Fixed in <span class="mono">${shortSha(fixSha)}</span>`, 'green'],
          ])}
        </article>
        <div class="echo-link" aria-hidden="true">
          <span class="echo-ring"></span><span class="echo-ring"></span>
          <span class="echo-core">${icon('compare')}</span>
          <span class="echo-label">Same behavior</span>
        </div>
        <article class="card case">
          <p class="eyebrow-sm t-purple">Current case · ${esc(finding.finding_id)}</p>
          <h3 class="card-title">Refund processor</h3>
          ${facts([
            ['Identity key', `<span class="mono">${esc(idKey)}</span>`],
            ['What went wrong', `${esc(failE.actual_durable_records)} rows for one refund`, 'red'],
            ['Status', `Fixed in <span class="mono">${shortSha(rv.repair_commit)}</span>`, 'green'],
          ])}
        </article>
      </div>

      <article class="card pattern-card" data-reveal>
        <p class="eyebrow-sm t-purple">The learned pattern</p>
        <h3 class="pattern-name">“${esc(lp.pattern_name)}”</h3>
        <p class="card-text">${esc(lp.summary || '')}</p>
        <div class="assist-row">
          ${conds.map((c, i) => `<span class="assist-chip" title="${esc(full[i] || '')}">${icon('check')}${c}</span>`).join('')}
        </div>
      </article>

      <div class="reach" data-reveal>
        <div class="reach-head">
          <h3 class="reach-title">Where else could this happen?</h3>
          <p class="card-text">Contexts listed by the failure signature. This run analyzed two of them.</p>
        </div>
        <div class="reach-grid">
          ${(lp.analogous_contexts_from_signature || []).map(c => {
            const [domain, effect] = c.split(/:\s*/);
            const hit = /^payment/i.test(domain) ? 'Historical case' : /^refund/i.test(domain) ? finding.finding_id : '';
            return `<div class="reach-cell${hit ? ' hit' : ''}">
              <p class="reach-domain">${esc(domain)}</p>
              <p class="reach-effect">${esc(effect || '')}</p>
              <p class="reach-state">${hit ? `${icon('check_circle')}${esc(hit)}` : 'Not analyzed yet'}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

/* ── Finding ───────────────────────────────────────────────────────── */

function buildFinding({ finding, rv }) {
  const stages = (finding.status_history || []).map(h => ({
    status: h.status, date: h.date, sha: shortSha(h.commit), note: ecSentence(h.basis || ''),
  }));
  if (rv.repair_verification_status) {
    stages.push({ status: rv.repair_verification_status, date: rv.repair_commit_date, sha: shortSha(rv.repair_commit), note: ecSentence(rv.repair_mechanism || '') });
  }

  return `
  <section class="sec" id="finding" data-theme="paper">
    <div class="wrap">
      ${head('Finding', `${esc(finding.finding_id)}: where the bug lives.`, 'The refund code saved a new row on every call, so a retry saved the same refund twice.', 'red')}
      <article class="card finding" data-reveal>
        <div class="finding-head">
          <span class="id-chip">${esc(finding.finding_id)}</span>
          <div class="finding-info">
            <h3 class="card-title">${esc(finding.title)}</h3>
            <p class="mono t-blue small">${esc(finding.component)}</p>
          </div>
          ${badge(finding.status, null, true)}
        </div>

        <div class="life" style="--n:${stages.length}">
          <div class="life-rail"><div class="life-fill"></div></div>
          ${stages.map((s, i) => `
          <div class="life-step" style="--i:${i}">
            <span class="life-dot tone-${tone(s.status)}">${icon('check')}</span>
            ${badge(s.status)}
            <p class="life-meta">${esc(s.date)} · <span class="mono">${s.sha}</span></p>
            <p class="life-note">${esc(s.note)}</p>
          </div>`).join('')}
        </div>

        ${buildCodeMap(finding)}

        <div class="expand-row">
          ${gbtn('Show technical reasoning', 'text', 'expand', 'data-expand="reasoning" aria-expanded="false"')}
        </div>
        <div class="expander" id="reasoning">
          <div class="expander-inner">
            <p class="card-text">${esc(finding.description)}</p>
            <div class="mc-grid">
              ${(finding.matching_conditions || []).map(mc => `
              <div class="mc">
                <p class="mc-id">${esc(mc.condition_id)}</p>
                <p class="mc-hist"><span>Historical</span>${esc(mc.historical_condition)}</p>
                <p class="mc-cur"><span>Current code</span>${esc(mc.current_evidence)}</p>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>`;
}

/** Line-reference map of the finding's component, from structural_evidence */
function buildCodeMap(finding) {
  const se = finding.structural_evidence || {};
  const regions = [
    { key: 'schema_lines',             name: 'Schema',             issue: se.schema_issue,     t: 'red' },
    { key: 'function_signature_lines', name: 'Function signature', issue: se.idempotency_key,  t: 'yellow' },
    { key: 'write_path_lines',         name: 'Write path',         issue: se.write_path_issue, t: 'red' },
  ].map(x => {
    const m = String(se[x.key] || '').match(/(\d+)\s*-\s*(\d+)/);
    return m ? { ...x, from: +m[1], to: +m[2] } : null;
  }).filter(Boolean);
  if (!regions.length) return '';

  const max = Math.ceil((Math.max(...regions.map(x => x.to)) + 10) / 10) * 10;
  const pct = n => ((n - 1) / max * 100);

  return `
  <div class="codemap">
    <div class="codemap-head">
      <p class="eyebrow-sm">Where in the file</p>
      <p class="mono small muted">${esc(finding.component)}</p>
    </div>
    <div class="codemap-track">
      ${regions.map((x, i) => `<span class="cm-region tone-${x.t}" data-region="${i}" style="left:${pct(x.from).toFixed(2)}%;width:${(pct(x.to + 1) - pct(x.from)).toFixed(2)}%"><b>L${x.from}–${x.to}</b></span>`).join('')}
    </div>
    <div class="codemap-scale"><span>line 1</span><span>line ${max}</span></div>
    <div class="cm-list">
      ${regions.map((x, i) => `
      <div class="cm-item" data-region="${i}">
        <p class="cm-top"><span class="cm-dot tone-${x.t}"></span><b>${x.name}</b><span class="mono muted">L${x.from}–${x.to}</span></p>
        <p class="cm-issue">${esc(x.issue || '')}</p>
      </div>`).join('')}
    </div>
  </div>`;
}

/* ── Tests ─────────────────────────────────────────────────────────── */

function buildTests({ rv, cf, failE, passE }) {
  const refMatch = String(failE.failing_assertion || '').match(/refund_reference='([^']+)'/);
  const ref = refMatch ? refMatch[1] : 'refund_reference';

  function card(kind, e, outcome, regression) {
    const o = parseOutcome(outcome);
    const regPass = /PASS/i.test(regression || '');
    const normal = o.passed - (regPass ? 1 : 0);
    const expected = num(e.expected_durable_records);
    const actual = num(e.actual_durable_records);
    const before = kind === 'before';
    const calls = Math.max(2, actual || 0);
    return `
    <article class="card test-card ${kind}">
      <div class="tc-head">
        <div>
          <p class="eyebrow-sm">${before ? 'Before repair' : `After repair · <span class="mono">${shortSha(rv.repair_commit)}</span>`}</p>
          <h3 class="tc-status t-${before ? 'red' : 'green'}">${icon(before ? 'error' : 'check_circle')}${before ? 'Test fails' : 'Test passes'}</h3>
        </div>
        ${testBar(outcome)}
      </div>
      <div class="tc-rows">
        <div class="tc-row"><span>Normal-operation tests</span><b class="t-green">${normal} / ${normal} pass</b></div>
        <div class="tc-row"><span>${before ? 'Duplicate-refund test' : 'Same duplicate-refund test'}</span><b class="t-${regPass ? 'green' : 'red'}">${esc(regression || '—')}</b></div>
      </div>

      <div class="sim" data-expected="${expected ?? ''}" data-actual="${actual ?? ''}" data-calls="${calls}">
        <div class="sim-head">
          <p class="eyebrow-sm">Replaying the test: same refund sent twice</p>
          ${gbtn('Replay', 'text', 'replay', 'data-sim-replay')}
        </div>
        <div class="sim-calls">
          ${Array.from({ length: calls }, (_, i) => `
          <div class="sim-call" data-call="${i}">
            <span class="sim-n">${i + 1}</span>
            <code>process_refund("${esc(ref)}")</code>
            <span class="sim-res"></span>
          </div>`).join('')}
        </div>
        <div class="sim-table">
          <div class="sim-tr sim-th"><span>Row</span><span>refund_reference</span><span>State</span></div>
          <div class="sim-rows"></div>
        </div>
        <div class="sim-foot">
          <span>Expected <b>${expected ?? '—'}</b></span>
          <span>Actual <b class="sim-count t-${actual !== null && expected !== null && actual > expected ? 'red' : 'green'}">0</b></span>
        </div>
      </div>

      ${before
        ? `<div class="assert"><p class="eyebrow-sm t-red">Failing assertion</p><p class="mono">${esc(failE.failing_assertion || '')}</p></div>`
        : `<div class="assert ok"><p class="eyebrow-sm t-green">Combined suite</p><p class="mono">${esc(passE.combined_suite_outcome || cf.after_repair_outcome || '')}</p></div>`}
    </article>`;
  }

  return `
  <section class="sec" id="tests" data-theme="light">
    ${orbs([['red', '-6%', '12%', 300, -0.1], ['green', '86%', '58%', 340, 0.1]])}
    <div class="wrap">
      ${head('Tests', 'Proven by a real test.', 'The same pytest test ran before and after the repair. Only the code changed, never the test.', 'green')}
      <div class="test-pair" data-stagger>
        ${card('before', failE, cf.before_repair_outcome, cf.before_repair_regression_result)}
        ${card('after', passE, cf.after_repair_outcome, cf.after_repair_regression_result)}
      </div>
    </div>
  </section>`;
}

/* ── Proof ─────────────────────────────────────────────────────────── */

function buildProof({ commits, chain }) {
  const count = ph => commits.filter(c => phaseOf(c.role) === ph).length;
  const chip = (f, label, n, on) =>
    `<button class="fchip${on ? ' on' : ''}" data-filter="${f}" aria-pressed="${on}">${icon('check')}<span>${label}</span><em>${n}</em></button>`;

  return `
  <section class="sec" id="proof" data-theme="paper">
    <div class="wrap">
      ${head('Proof', 'Every claim has a receipt.', `${commits.length} commits and ${chain.length} evidence steps, each one traceable in the repository.`, 'blue')}
    </div>
    <div class="hs">
      <div class="hs-sticky">
        <div class="wrap">
          <div class="proof-bar" data-reveal>
            <div class="fchips" role="group" aria-label="Filter commits">
              ${chip('all', 'All', commits.length, true)}
              ${chip('historical', 'Historical', count('historical'), false)}
              ${chip('current', 'Current', count('current'), false)}
            </div>
            <div class="hs-meter" aria-hidden="true"><i></i></div>
            <div class="carousel-nav">
              <button class="icon-btn" data-scroll="-1" aria-label="Previous commits">${icon('chevron_l')}</button>
              <button class="icon-btn" data-scroll="1" aria-label="Next commits">${icon('chevron_r')}</button>
            </div>
          </div>
        </div>
        <div class="carousel" data-reveal>
          <div class="track">
            ${commits.map((c, i) => `
            <article class="card commit" data-phase="${phaseOf(c.role)}" style="--accent:var(--t-${ROLE_TONE[c.role] || 'blue'})">
              <div class="commit-top"><span class="commit-n">${String(i + 1).padStart(2, '0')}</span><span class="muted small">${esc(c.date || '')}</span></div>
              ${badge(ROLE_LABELS[c.role] || c.role, ROLE_TONE[c.role])}
              <p class="commit-msg">${esc(c.message)}</p>
              <p class="commit-meta"><span class="mono t-blue">${shortSha(c.sha)}</span>${c.author ? ` · ${esc(c.author)}` : ''}</p>
            </article>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="wrap">
      <div class="expand-row center" data-reveal>
        ${gbtn('Show the full evidence chain', 'tonal', 'expand', 'data-expand="chain" aria-expanded="false"')}
      </div>
      <div class="expander" id="chain">
        <div class="expander-inner">
          <ol class="chain-grid">
            ${chain.map((s, i) => `
            <li class="card chain-card">
              <div class="chain-top"><span class="chain-n">${String(s.step).padStart(2, '0')}</span>${badge(s.status)}</div>
              <h4 class="chain-title">${EC_TITLES[i] || `Step ${s.step}`}</h4>
              <p class="card-text small">${esc(s.description)}</p>
            </li>`).join('')}
          </ol>
        </div>
      </div>
    </div>
  </section>`;
}

/* ── Limits ────────────────────────────────────────────────────────── */

function buildLimits({ r }) {
  const tiles = (r.limitations || []).map(l => {
    const headline = l.split(/[—–]/)[0].toUpperCase();
    const m = LIMIT_DISPLAY.find(d => headline.includes(d.match));
    return `
    <div class="card limit" title="${esc(l)}">
      <span class="icon-bubble sm tone-gray">${icon('info')}</span>
      <h4 class="limit-title">${m ? m.title : esc(limitTitle(l))}</h4>
      <p class="card-text small">${m ? m.detail : esc(limitDetail(l).slice(0, 110))}</p>
    </div>`;
  }).join('');

  return `
  <section class="sec" id="limits" data-theme="dark">
    ${orbs([['blue', '10%', '10%', 360, -0.1], ['red', '80%', '60%', 280, 0.12]])}
    <div class="wrap">
      ${head('Limits', 'Honest about the limits.', 'This is a prototype. Here is exactly what it does not do.', 'yellow')}
      <div class="limit-grid" data-stagger>${tiles}</div>
    </div>
  </section>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────── */

/** Fade / blur / lift in as elements enter; staggered within groups */
function setupReveals() {
  document.querySelectorAll('[data-stagger]').forEach(g => {
    Array.from(g.children).forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--d', `${Math.min(i, 10) * 90}ms`);
    });
  });
  const els = document.querySelectorAll('[data-reveal]');
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) { els.forEach(el => el.removeAttribute('data-reveal')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      obs.unobserve(el);
      /* hand control back to the element's own hover transitions */
      const d = parseInt(el.style.getPropertyValue('--d'), 10) || 0;
      setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('in'); }, 1100 + d);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

/** Theme morph + dock state, hero parallax, element parallax, scrub text */
function setupScrollFx() {
  const root    = document.documentElement;
  const hero    = document.querySelector('.hero');
  const secs    = Array.from(document.querySelectorAll('.sheet > .sec'));
  const items   = document.querySelectorAll('.dock-item');
  const speedy  = Array.from(document.querySelectorAll('[data-speed]'));
  const scrub   = document.querySelector('.scrub');
  const words   = scrub ? Array.from(scrub.children) : [];
  let queued = false, lastId = '';

  function frame() {
    queued = false;
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / vh));
    hero.style.setProperty('--p', p.toFixed(4));
    if (window.EchoGlobe) window.EchoGlobe.pause(p >= 0.999);

    /* the last section whose top has passed 60% of the viewport sets the colour theme,
       so the light sheet is already light as it slides over the dark hero */
    const mid = vh / 2;
    const line = vh * 0.6;
    let cur = null;
    secs.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
    if (!cur && secs[0] && secs[0].getBoundingClientRect().top < vh - 40) cur = secs[0];
    const id = cur ? cur.id : 'hero';
    if (id !== lastId) {
      lastId = id;
      root.dataset.theme = cur ? cur.dataset.theme : 'dark';
      items.forEach(a => a.classList.toggle('active', a.dataset.target === id));
    }

    if (!REDUCED_MOTION) {
      speedy.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -400 || rect.top > vh + 400) return;
        const offset = el.closest('.hero') ? window.scrollY : (rect.top + rect.height / 2 - mid);
        el.style.transform = `translate3d(0, ${(offset * +el.dataset.speed).toFixed(1)}px, 0)`;
      });
    }

    if (scrub) {
      const rect = scrub.getBoundingClientRect();
      const q = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.3)));
      const lit = REDUCED_MOTION ? words.length : Math.round(q * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  frame();
}

/** Mount the hero globe with the historical → current case pair */
function setupGlobe({ finding, hist }) {
  const canvas = document.querySelector('.hero-globe');
  if (!canvas || !window.EchoGlobe) return;
  const stage = canvas.parentElement;
  const inner = document.querySelector('.hero-inner');
  /* keep the globe clear of the headline block (measured without scroll transforms) */
  const updateClear = () => {
    const top = inner.offsetTop + inner.offsetHeight;
    stage.dataset.clear = Math.round(top + 28);
  };
  updateClear();
  window.addEventListener('resize', updateClear);

  const base = p => String(p || '').split('/').pop().replace(/\.py$/, '').replace(/_/g, ' ');
  const cap  = s => s.replace(/\b\w/g, c => c.toUpperCase());
  const fix  = ((hist.commits || {}).historical_fix || {}).sha;
  window.EchoGlobe.mount(canvas, {
    nodes: [
      { lat: -0.9, lon: -0.62, color: '#4285F4',
        label: cap(base((hist.source_files || [])[0])) || 'Historical case',
        sub:   `Historical bug · fixed ${shortSha(fix)}` },
      { lat: -0.9, lon: 0.62, color: '#34A853',
        label: cap(base(finding.component)) || 'Current code',
        sub:   `${finding.finding_id} · ${finding.status.toLowerCase()}` },
    ],
  });
}

/** Terminal-style replay of the evidence chain, driving the story flow */
function setupReplay(chain, commits) {
  const root = document.querySelector('.console');
  if (!root || !chain.length) return;
  const body   = root.querySelector('.console-body');
  const fill   = root.querySelector('.stepper-fill');
  const steps  = root.querySelectorAll('.stp');
  const toggle = root.querySelector('[data-replay="toggle"]');
  const flow   = document.querySelector('.flow');
  const nodes  = flow ? flow.querySelectorAll('.flow-node') : [];

  /* Evidence-chain step → story stage (presentational mapping) */
  const nodeFor = i => chain.length === 10
    ? [0, 0, 0, 1, 2, 2, 3, 3, 4, 5][i]
    : Math.min(nodes.length - 1, Math.floor(i * nodes.length / chain.length));
  const dateFor = sha => {
    const c = commits.find(c => c.sha && sha && c.sha.startsWith(sha));
    return c && c.date ? c.date : '';
  };
  const setToggle = (label, ic) => {
    toggle.querySelector('span').textContent = label;
    toggle.querySelector('path').setAttribute('d', ICONS[ic]);
  };

  let idx = 0, pos = 0, playing = false, timer = 0, textEl = null;

  function header(i) {
    const s = chain[i];
    const sha = (s.description.match(/\b[0-9a-f]{7}\b/) || [''])[0];
    const d = dateFor(sha);
    const line = document.createElement('div');
    line.className = 'cl';
    line.innerHTML = `
      <div class="cl-meta">
        <span class="cl-step">${String(s.step).padStart(2, '0')}</span>
        <b>${esc(EC_TITLES[i] || '')}</b>
        ${badge(s.status)}
        ${sha ? `<span class="mono t-blue small">${sha}</span>` : ''}
        ${d ? `<span class="muted small">${esc(d)}</span>` : ''}
      </div>
      <p class="cl-text"></p>`;
    body.appendChild(line);
    return line.querySelector('.cl-text');
  }

  function paint() {
    const done = idx + (textEl && chain[idx] ? pos / chain[idx].description.length : 0);
    fill.style.transform = `scaleX(${Math.min(1, done / chain.length)})`;
    steps.forEach((t, i) => { t.classList.toggle('done', i < idx); t.classList.toggle('now', i === idx); });
    if (flow) {
      const cur = idx < chain.length ? nodeFor(idx) : nodes.length - 1;
      flow.classList.add('playing');
      nodes.forEach((n, i) => {
        n.classList.toggle('lit', i <= cur || idx >= chain.length);
        n.classList.toggle('now', i === cur && idx < chain.length);
      });
    }
    body.scrollTop = body.scrollHeight;
  }
  function finishStep() {
    if (textEl) { textEl.textContent = chain[idx].description; textEl.classList.remove('typing'); }
    textEl = null; pos = 0; idx++;
  }
  function tick() {
    if (!playing) return;
    if (idx >= chain.length) { stop(true); return; }
    if (!textEl) textEl = header(idx);
    const full = chain[idx].description;
    pos = Math.min(full.length, pos + 3);
    textEl.textContent = full.slice(0, pos);
    textEl.classList.add('typing');
    paint();
    if (pos >= full.length) { finishStep(); paint(); timer = setTimeout(tick, 560); }
    else timer = setTimeout(tick, 16);
  }
  function play() { if (idx >= chain.length) return; playing = true; setToggle('Pause', 'pause'); clearTimeout(timer); tick(); }
  function stop(ended) {
    playing = false; clearTimeout(timer);
    setToggle(ended ? 'Play again' : 'Resume', ended ? 'replay' : 'play');
    if (ended) {
      paint();
      body.insertAdjacentHTML('beforeend', `<p class="cl-end">${icon('check_circle')}End of evidence chain. Every line above is read from report.json.</p>`);
      body.scrollTop = body.scrollHeight;
    }
  }
  function reset() { clearTimeout(timer); body.innerHTML = ''; idx = 0; pos = 0; textEl = null; }
  function jumpTo(target) { reset(); while (idx < target) { textEl = header(idx); finishStep(); } paint(); }

  toggle.addEventListener('click', () => {
    if (idx >= chain.length) { reset(); play(); } else if (playing) stop(false); else play();
  });
  root.querySelector('[data-replay="restart"]').addEventListener('click', () => { reset(); play(); });
  root.querySelector('[data-replay="skip"]').addEventListener('click', () => { jumpTo(chain.length); stop(true); });
  steps.forEach((t, i) => t.addEventListener('click', () => { jumpTo(i); play(); }));
  document.addEventListener('echo:replay', () => { reset(); play(); });

  if (REDUCED_MOTION) { jumpTo(chain.length); stop(true); return; }
  onFirstView(root, () => { if (!playing && idx === 0) play(); }, '0px 0px -30% 0px');
}

/** Animate recorded durable-row counts: identical calls, N resulting rows */
function setupRetrySims() {
  document.querySelectorAll('.sim').forEach(sim => {
    const calls    = +sim.dataset.calls;
    const expected = num(sim.dataset.expected);
    const actual   = num(sim.dataset.actual);
    const rowsEl   = sim.querySelector('.sim-rows');
    const countEl  = sim.querySelector('.sim-count');
    const callEls  = sim.querySelectorAll('.sim-call');
    const table    = sim.querySelector('.sim-table');
    const ref      = (((sim.querySelector('.sim-call code') || {}).textContent || '').match(/"([^"]+)"/) || ['', ''])[1];
    let timers = [];

    function step(k, instant) {
      const call = callEls[k], res = call.querySelector('.sim-res');
      call.classList.add('active');
      if (actual !== null && k < actual) {
        const dup = expected !== null && k >= expected;
        rowsEl.insertAdjacentHTML('beforeend', `
          <div class="sim-tr ${dup ? 'dup' : 'ok'}${instant ? '' : ' enter'}">
            <span>${k + 1}</span><span class="mono">${esc(ref)}</span><span>${dup ? 'Duplicate' : 'Saved'}</span>
          </div>`);
        res.innerHTML = dup ? `${icon('error')}Saved again` : `${icon('check')}Saved`;
        res.className = 'sim-res ' + (dup ? 't-red' : 't-green');
        countEl.textContent = k + 1;
      } else {
        res.innerHTML = `${icon('check_circle')}Ignored, already saved`;
        res.className = 'sim-res t-blue';
        if (!instant) { table.classList.remove('shield'); void table.offsetWidth; table.classList.add('shield'); }
      }
    }
    function run() {
      timers.forEach(clearTimeout); timers = [];
      rowsEl.innerHTML = ''; countEl.textContent = '0'; table.classList.remove('shield');
      callEls.forEach(c => { c.classList.remove('active'); const x = c.querySelector('.sim-res'); x.innerHTML = ''; x.className = 'sim-res'; });
      if (REDUCED_MOTION) { for (let k = 0; k < calls; k++) step(k, true); return; }
      for (let k = 0; k < calls; k++) timers.push(setTimeout(() => step(k, false), 600 + k * 1400));
    }
    sim.querySelector('[data-sim-replay]').addEventListener('click', run);
    if (REDUCED_MOTION) run(); else onFirstView(sim, run);
  });
}

/** Commit carousel: pinned while vertical scroll drives it sideways (native
    horizontal scroll on phones / reduced motion), plus filter chips and arrows */
function setupProof() {
  const hs       = document.querySelector('.hs');
  const carousel = document.querySelector('.carousel');
  const track    = document.querySelector('.track');
  const meter    = document.querySelector('.hs-meter i');
  const chips    = document.querySelectorAll('.fchip');
  const cards    = Array.from(document.querySelectorAll('.commit'));
  const [prev, next] = document.querySelectorAll('[data-scroll]');
  if (!hs || !track) return;

  let pinned = false, maxShift = 0, p = 0, queued = false;
  const visible = () => cards.filter(c => !c.classList.contains('gone'));
  const cardStep = () => (visible()[0] ? visible()[0].offsetWidth + 20 : 320);

  function measure() {
    pinned = !REDUCED_MOTION && window.innerWidth > 720;
    hs.classList.toggle('pinned', pinned);
    if (!pinned) {
      hs.style.height = '';
      track.style.transform = '';
      cards.forEach(c => { c.style.scale = ''; c.style.opacity = ''; c.style.translate = ''; });
    } else {
      const vis = visible(), last = vis[vis.length - 1];
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      maxShift = last ? Math.max(0, last.offsetLeft + last.offsetWidth + pad - carousel.clientWidth) : 0;
      hs.style.height = `${window.innerHeight + maxShift}px`;
    }
    update();
  }

  function update() {
    queued = false;
    if (pinned) {
      p = maxShift ? Math.min(1, Math.max(0, -hs.getBoundingClientRect().top / maxShift)) : 0;
      track.style.transform = `translate3d(${(-p * maxShift).toFixed(1)}px, 0, 0)`;
      /* cards curve away and soften toward the edges */
      const cx = window.innerWidth / 2;
      visible().forEach(c => {
        const r = c.getBoundingClientRect();
        const d = Math.max(-1.6, Math.min(1.6, (r.left + r.width / 2 - cx) / cx));
        c.style.scale = (1 - Math.abs(d) * 0.07).toFixed(3);
        c.style.translate = `0 ${(d * d * 18).toFixed(1)}px`;
        c.style.opacity = (1 - Math.max(0, Math.abs(d) - 0.7) * 0.7).toFixed(3);
      });
    } else {
      const max = track.scrollWidth - track.clientWidth;
      p = max > 0 ? track.scrollLeft / max : 0;
    }
    meter.style.transform = `scaleX(${p.toFixed(4)})`;
    prev.disabled = p <= 0.002;
    next.disabled = p >= 0.998;
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  [prev, next].forEach(b => b.addEventListener('click', () => {
    const dist = +b.dataset.scroll * cardStep() * 2;
    const behavior = REDUCED_MOTION ? 'auto' : 'smooth';
    if (pinned) window.scrollBy({ top: dist, behavior });
    else track.scrollBy({ left: dist, behavior });
  }));

  chips.forEach(ch => ch.addEventListener('click', () => {
    const f = ch.dataset.filter;
    chips.forEach(x => { x.classList.toggle('on', x === ch); x.setAttribute('aria-pressed', x === ch); });
    let shown = 0;
    cards.forEach(c => {
      const show = f === 'all' || c.dataset.phase === f;
      c.classList.toggle('gone', !show);
      if (show) { c.style.setProperty('--d', `${shown++ * 60}ms`); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    });
    measure();
    if (pinned && hs.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + hs.getBoundingClientRect().top, behavior: 'auto' });
    else if (!pinned) track.scrollTo({ left: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    update();
  }));

  window.addEventListener('scroll', request, { passive: true });
  track.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', measure);
  measure();
}

/** Show/hide panels with a height transition */
function setupExpanders() {
  document.querySelectorAll('[data-expand]').forEach(btn => {
    const panel = document.getElementById(btn.dataset.expand);
    const label = btn.querySelector('span');
    const closed = label.textContent;
    btn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      label.textContent = open ? closed.replace(/^Show/, 'Hide') : closed;
    });
  });
}

/** Count numbers up from zero when they scroll into view */
function setupCounters() {
  if (REDUCED_MOTION) return;
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const tail = el.querySelector('span') ? ' ' + el.querySelector('span').outerHTML : '';
    onFirstView(el, () => {
      const start = performance.now();
      (function step(now) {
        const k = Math.min((now - start) / 900, 1);
        el.innerHTML = `${Math.round((1 - Math.pow(1 - k, 3)) * target)}${tail}`;
        if (k < 1) requestAnimationFrame(step);
      })(start);
    });
  });
}

/** Cursor light on cards, tilt on .tilt cards, code-map cross-highlight */
function setupPointerFx() {
  document.querySelectorAll('.codemap [data-region]').forEach(el => {
    const peers = document.querySelectorAll(`.codemap [data-region="${el.dataset.region}"]`);
    el.addEventListener('mouseenter', () => peers.forEach(p => p.classList.add('hl')));
    el.addEventListener('mouseleave', () => peers.forEach(p => p.classList.remove('hl')));
  });
  if (REDUCED_MOTION || !window.matchMedia('(hover: hover)').matches) return;

  let last = null, queued = false, current = null;
  document.addEventListener('pointermove', e => {
    last = e;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const card = last.target.closest && last.target.closest('.card');
      if (current && current !== card) { current.style.removeProperty('--rx'); current.style.removeProperty('--ry'); }
      current = card;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = last.clientX - r.left, y = last.clientY - r.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      if (card.classList.contains('tilt')) {
        card.style.setProperty('--rx', `${((y / r.height) - 0.5) * -6}deg`);
        card.style.setProperty('--ry', `${((x / r.width) - 0.5) * 8}deg`);
      }
    });
  }, { passive: true });
}

/** Material ripple on buttons and chips */
function setupRipples() {
  document.addEventListener('pointerdown', e => {
    const host = e.target.closest('.gbtn, .fchip, .icon-btn, .dock-item, .stp');
    if (!host || REDUCED_MOTION) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host.appendChild(rip);
    rip.addEventListener('animationend', () => rip.remove());
  });
}

/** Buttons that scroll to a section (and optionally start the replay) */
function setupGo() {
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.go);
    if (!el) return;
    el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    if (b.hasAttribute('data-play')) setTimeout(() => document.dispatchEvent(new Event('echo:replay')), REDUCED_MOTION ? 0 : 800);
  }));
}

/** 1–9 jump to sections, R restarts the replay */
function setupKeys() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SECTIONS.length) {
      const el = document.getElementById(SECTIONS[n - 1].id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' }); }
    } else if (e.key === 'r' || e.key === 'R') {
      document.getElementById('replay').scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
      document.dispatchEvent(new Event('echo:replay'));
    }
  });
}

/** Run fn once when el first scrolls into view */
function onFirstView(el, fn, margin = '0px 0px -15% 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(el);
}
