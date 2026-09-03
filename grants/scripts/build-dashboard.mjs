#!/usr/bin/env node
/**
 * Renders grants/dashboard.html from the records.
 *
 * The dashboard is a generated view — never edit it by hand, edit the records
 * and re-run. It deliberately foregrounds what ACBN *doesn't* know (unverified
 * fields, missing deadlines, ambiguous stages), because on a grant desk the
 * unanswered questions are what lose money, not the answered ones.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDir, parseDoc, GRANTS_DIR, money, daysUntil, OPEN_STAGES } from './lib.mjs';

const applications = loadDir('applications');
const funders = new Map(loadDir('funders').map((f) => [f.data.id, f.data.name]));
const orgs = new Map(loadDir('orgs').map((o) => [o.data.id, o.data.short_name ?? o.data.legal_name]));
const record = parseDoc(join(GRANTS_DIR, 'library', 'track-record.md')).data ?? {};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d == null ? null : String(d));

const STAGE_RAIL = [
  ['prospect', 'Prospect'],
  ['drafting', 'Drafting'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['awarded', 'Awarded'],
  ['reporting', 'Reporting'],
];
const STAGE_LABEL = {
  ...Object.fromEntries(STAGE_RAIL),
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

/** Attention tier drives every colour decision on the page. */
function tier(app) {
  const days = daysUntil(iso(app.deadline));
  if (!OPEN_STAGES.has(app.stage)) return 'settled';
  if (days !== null && days < 0) return 'overdue';
  if (days !== null && days <= 30) return 'urgent';
  if (app.needs_verification?.includes('stage')) return 'ambiguous';
  return 'steady';
}

const enriched = applications
  .map(({ data }) => ({
    ...data,
    deadline: iso(data.deadline),
    submitted: iso(data.submitted),
    funderName: funders.get(data.funder) ?? data.funder,
    applicantName: orgs.get(data.applicant) ?? data.applicant,
    days: daysUntil(iso(data.deadline)),
    tier: tier(data),
    unverified: data.needs_verification ?? [],
  }))
  .sort((a, b) => {
    const rank = { overdue: 0, urgent: 1, ambiguous: 2, steady: 3, settled: 4 };
    if (rank[a.tier] !== rank[b.tier]) return rank[a.tier] - rank[b.tier];
    if (a.days !== null && b.days !== null) return a.days - b.days;
    return a.days === null ? 1 : -1;
  });

const open = enriched.filter((a) => OPEN_STAGES.has(a.stage));
const needsDate = open.filter((a) => !a.deadline && a.stage !== 'prospect');
const unverifiedCount = enriched.reduce((n, a) => n + a.unverified.length, 0);
const attention = enriched.filter((a) => ['overdue', 'urgent', 'ambiguous'].includes(a.tier));
const clientWork = enriched.filter((a) => a.applicant !== 'acbn');

const railMax = Math.max(1, ...STAGE_RAIL.map(([id]) => enriched.filter((a) => a.stage === id).length));

const chip = (text, kind = 'neutral') => `<span class="chip chip--${kind}">${esc(text)}</span>`;

const deadlineChip = (app) => {
  if (app.deadline === 'rolling') return chip('Rolling — no forcing date', 'ambiguous');
  if (!app.deadline) return `<span class="chip chip--unknown">deadline unknown</span>`;
  const { days } = app;
  if (days < 0) return chip(`${app.deadline} · ${Math.abs(days)}d past`, 'overdue');
  if (days <= 30) return chip(`${app.deadline} · ${days}d left`, 'urgent');
  return chip(`${app.deadline} · ${days}d`, 'neutral');
};

const amountCell = (app) => {
  const value = app.amount_awarded ?? app.amount_requested;
  if (value == null) return `<span class="unknown">not recorded</span>`;
  const label = app.amount_awarded != null ? 'awarded' : 'requested';
  return `<span class="amount">${esc(money(value))}</span> <span class="amount__label">${label}</span>`;
};

const row = (app) => `
        <article class="rec rec--${app.tier}">
          <div class="rec__head">
            <h3 class="rec__program">${esc(app.program)}</h3>
            ${chip(STAGE_LABEL[app.stage] ?? app.stage, app.tier === 'settled' ? 'settled' : 'stage')}
          </div>
          <p class="rec__meta">
            <span class="rec__funder">${esc(app.funderName)}</span>
            <span class="rec__sep">·</span>
            <span class="rec__applicant${app.applicant !== 'acbn' ? ' rec__applicant--client' : ''}">${esc(app.applicantName)}</span>
          </p>
          <div class="rec__facts">
            ${deadlineChip(app)}
            ${amountCell(app)}
            ${app.confirmation ? `<span class="conf">conf. ${esc(app.confirmation)}</span>` : ''}
          </div>
          ${
            app.unverified.length
              ? `<p class="rec__unver"><span class="rec__unver-label">unverified</span>${app.unverified
                  .map((f) => `<span class="tag">${esc(f)}</span>`)
                  .join('')}</p>`
              : ''
          }
        </article>`;

const groups = [
  ['Needs attention', attention, 'Passed deadlines, due inside 30 days, or a status nobody has confirmed.'],
  ['In flight', open.filter((a) => !attention.includes(a)), 'Moving, with no date forcing action this month.'],
  ['Settled', enriched.filter((a) => !OPEN_STAGES.has(a.stage)), 'Closed, awarded or declined. Kept for the narrative and the lessons.'],
];

const today = new Date().toISOString().slice(0, 10);

const html = `<title>ACBN Grant Pipeline</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
  :root {
    --ground: #f4f7f6;
    --surface: #ffffff;
    --surface-sunk: #eef3f2;
    --ink: #0e1e1c;
    --ink-soft: #47605c;
    --ink-faint: #7d918e;
    --line: #dbe5e3;
    --line-strong: #c3d2cf;
    --accent: #0b6e63;
    --accent-soft: #d9ecE8;
    --urgent: #a8600c;
    --urgent-soft: #fbeeda;
    --overdue: #a3312a;
    --overdue-soft: #fbe6e3;
    --ambiguous: #5b4bab;
    --ambiguous-soft: #e9e6f8;
    --display: "Bricolage Grotesque", "Trebuchet MS", sans-serif;
    --body: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0b1413;
      --surface: #121e1c;
      --surface-sunk: #0f1a19;
      --ink: #e7efed;
      --ink-soft: #9db1ad;
      --ink-faint: #6f8481;
      --line: #22302e;
      --line-strong: #31423f;
      --accent: #4cbfae;
      --accent-soft: #113330;
      --urgent: #e0a054;
      --urgent-soft: #33260f;
      --overdue: #e58179;
      --overdue-soft: #351917;
      --ambiguous: #a99ce8;
      --ambiguous-soft: #221e3a;
    }
  }
  :root[data-theme="dark"] {
    --ground: #0b1413;
    --surface: #121e1c;
    --surface-sunk: #0f1a19;
    --ink: #e7efed;
    --ink-soft: #9db1ad;
    --ink-faint: #6f8481;
    --line: #22302e;
    --line-strong: #31423f;
    --accent: #4cbfae;
    --accent-soft: #113330;
    --urgent: #e0a054;
    --urgent-soft: #33260f;
    --overdue: #e58179;
    --overdue-soft: #351917;
    --ambiguous: #a99ce8;
    --ambiguous-soft: #221e3a;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--body);
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 40px 24px 72px; display: flex; flex-direction: column; gap: 40px; }

  /* ---- masthead ---- */
  .masthead { display: flex; flex-direction: column; gap: 10px; }
  .eyebrow {
    font-family: var(--mono); font-size: 11px; letter-spacing: .13em;
    text-transform: uppercase; color: var(--accent);
  }
  h1 {
    font-family: var(--display); font-weight: 800; font-size: clamp(30px, 5vw, 44px);
    line-height: 1.05; margin: 0; letter-spacing: -.02em; text-wrap: balance;
  }
  .standfirst { margin: 0; color: var(--ink-soft); max-width: 62ch; }

  /* ---- tiles ---- */
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 3px; overflow: hidden; }
  .tile { background: var(--surface); padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
  .tile__num { font-family: var(--display); font-weight: 700; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; }
  .tile__num--flag { color: var(--urgent); }
  .tile__label { font-size: 12px; color: var(--ink-soft); }
  .tile__note { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: .02em; }

  /* ---- pipeline rail ---- */
  .rail { display: flex; gap: 2px; align-items: flex-end; }
  .rail__step { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .rail__bar { background: var(--surface-sunk); border-top: 3px solid var(--line-strong); position: relative; }
  .rail__fill { background: var(--accent-soft); border-top: 3px solid var(--accent); margin-top: -3px; }
  .rail__n { font-family: var(--display); font-weight: 700; font-size: 19px; font-variant-numeric: tabular-nums; }
  .rail__n--zero { color: var(--ink-faint); font-weight: 600; }
  .rail__label { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-soft); overflow-wrap: break-word; }

  /* ---- sections ---- */
  section { display: flex; flex-direction: column; gap: 14px; }
  h2 { font-family: var(--display); font-weight: 600; font-size: 19px; margin: 0; letter-spacing: -.01em; }
  .section__intro { margin: -8px 0 0; color: var(--ink-soft); font-size: 13.5px; max-width: 62ch; }
  .stack { display: flex; flex-direction: column; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 3px; overflow: hidden; }

  /* ---- record ---- */
  .rec { background: var(--surface); padding: 16px 18px 16px 22px; display: flex; flex-direction: column; gap: 7px; position: relative; }
  .rec::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: transparent; }
  .rec--overdue::before { background: var(--overdue); }
  .rec--urgent::before { background: var(--urgent); }
  .rec--ambiguous::before { background: var(--ambiguous); }
  .rec--steady::before { background: var(--line-strong); }
  .rec__head { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .rec__program { font-family: var(--display); font-weight: 600; font-size: 16.5px; margin: 0; letter-spacing: -.01em; }
  .rec__meta { margin: 0; font-size: 13px; color: var(--ink-soft); display: flex; gap: 7px; flex-wrap: wrap; }
  .rec__funder { color: var(--ink); font-weight: 500; }
  .rec__sep { color: var(--ink-faint); }
  .rec__applicant--client { color: var(--accent); font-weight: 500; }
  .rec__facts { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
  .amount { font-family: var(--mono); font-weight: 500; font-variant-numeric: tabular-nums; }
  .amount__label { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; }
  .conf { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }

  /* Unknowns are rendered, not blank — the whole point of the page. */
  .unknown, .chip--unknown {
    font-family: var(--mono); font-size: 11px; color: var(--ink-faint);
    background: repeating-linear-gradient(-45deg, transparent, transparent 4px, var(--surface-sunk) 4px, var(--surface-sunk) 8px);
    padding: 2px 7px; border: 1px dashed var(--line-strong); border-radius: 2px;
  }
  .rec__unver { margin: 2px 0 0; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .rec__unver-label { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-faint); }
  .tag { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft); background: var(--surface-sunk); border: 1px solid var(--line); padding: 1px 6px; border-radius: 2px; }

  .chip { font-family: var(--mono); font-size: 11px; padding: 2px 8px; border-radius: 2px; white-space: nowrap; border: 1px solid transparent; }
  .chip--neutral { background: var(--surface-sunk); color: var(--ink-soft); border-color: var(--line); }
  .chip--stage { background: var(--accent-soft); color: var(--accent); border-color: transparent; text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }
  .chip--settled { background: var(--surface-sunk); color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }
  .chip--urgent { background: var(--urgent-soft); color: var(--urgent); }
  .chip--overdue { background: var(--overdue-soft); color: var(--overdue); }
  .chip--ambiguous { background: var(--ambiguous-soft); color: var(--ambiguous); }

  .legend { display: flex; gap: 18px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }
  .legend span { display: flex; align-items: center; gap: 6px; }
  .legend__key { color: var(--ink-faint); text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
  .legend i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }

  footer { border-top: 1px solid var(--line); padding-top: 18px; color: var(--ink-faint); font-size: 12.5px; display: flex; flex-direction: column; gap: 6px; }
  footer code { font-family: var(--mono); color: var(--ink-soft); }
  @media (max-width: 620px) {
    .rail__label { font-size: 9px; }
    .wrap { padding: 28px 16px 56px; gap: 32px; }
  }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Afro-Caribbean Business Network · generated ${today}</p>
    <h1>Grant Pipeline</h1>
    <p class="standfirst">
      ${enriched.length} applications across ${funders.size} funders and ${orgs.size} applicant organizations.
      Generated from <code>grants/applications/</code> — edit the records, not this page.
      Values shown as <span class="unknown">not recorded</span> are genuinely unknown, never guessed.
    </p>
  </header>

  <div class="tiles">
    <div class="tile">
      <span class="tile__num">${open.length}</span>
      <span class="tile__label">Open applications</span>
      <span class="tile__note">prospect → under review</span>
    </div>
    <div class="tile">
      <span class="tile__num ${attention.length ? 'tile__num--flag' : ''}">${attention.length}</span>
      <span class="tile__label">Need attention now</span>
      <span class="tile__note">overdue, due ≤30d, or unconfirmed</span>
    </div>
    <div class="tile">
      <span class="tile__num ${unverifiedCount ? 'tile__num--flag' : ''}">${unverifiedCount}</span>
      <span class="tile__label">Unverified fields</span>
      <span class="tile__note">must not be quoted to a funder</span>
    </div>
    <div class="tile">
      <span class="tile__num">${money(record.total_awarded) ?? '—'}</span>
      <span class="tile__label">Secured to date, ${record.award_count ?? '?'} awards</span>
      <span class="tile__note">deck-sourced · unverified</span>
    </div>
  </div>

  <section>
    <h2>Where the work sits</h2>
    <p class="section__intro">Stages in order. An application only earns the next stage when something real happens — a draft exists, a portal accepts it, a funder replies.</p>
    <div class="rail">
      ${STAGE_RAIL.map(([id, label]) => {
        const n = enriched.filter((a) => a.stage === id).length;
        const h = 8 + Math.round((n / railMax) * 52);
        return `<div class="rail__step">
          <span class="rail__n ${n ? '' : 'rail__n--zero'}">${n}</span>
          <div class="rail__bar" style="height:${h}px">${n ? `<div class="rail__fill" style="height:100%"></div>` : ''}</div>
          <span class="rail__label">${esc(label)}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="legend">
      <span class="legend__key">edge marks below</span>
      <span><i style="background:var(--overdue)"></i> deadline passed</span>
      <span><i style="background:var(--urgent)"></i> due within 30 days</span>
      <span><i style="background:var(--ambiguous)"></i> status unconfirmed</span>
      <span><i style="background:var(--line-strong)"></i> in flight</span>
    </div>
  </section>

  ${groups
    .filter(([, list]) => list.length)
    .map(
      ([title, list, intro]) => `<section>
    <h2>${esc(title)} <span class="tile__note">${list.length}</span></h2>
    <p class="section__intro">${esc(intro)}</p>
    <div class="stack">${list.map(row).join('')}</div>
  </section>`
    )
    .join('\n')}

  <footer>
    <p>${clientWork.length} of ${enriched.length} applications are written for partner organizations rather than ACBN itself — shown in <span style="color:var(--accent)">teal</span>.</p>
    <p>${needsDate.length} active application${needsDate.length === 1 ? ' has' : 's have'} no deadline recorded, so nothing will prompt you about ${needsDate.length === 1 ? 'it' : 'them'}.</p>
    <p>Regenerate with <code>node grants/scripts/build-dashboard.mjs</code>. Check integrity with <code>node grants/scripts/validate.mjs</code>.</p>
  </footer>
</div>`;

const out = join(GRANTS_DIR, 'dashboard.html');
writeFileSync(out, html);
console.log(`Wrote ${out}`);
console.log(`  ${enriched.length} applications · ${open.length} open · ${attention.length} needing attention · ${unverifiedCount} unverified fields`);
