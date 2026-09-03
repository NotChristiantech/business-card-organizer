#!/usr/bin/env node
/**
 * Schema and referential-integrity check for the grant records.
 *
 * Catches the failure modes that actually bite: an application pointing at a
 * funder file that doesn't exist, a stage typo that hides a record from the
 * dashboard, and — most importantly — a number being quoted while it's still
 * listed as unverified.
 */
import { loadDir, STAGES, OPEN_STAGES } from './lib.mjs';

const errors = [];
const warnings = [];

const orgs = loadDir('orgs');
const funders = loadDir('funders');
const applications = loadDir('applications');

const orgIds = new Set(orgs.map((o) => o.data.id));
const funderIds = new Set(funders.map((f) => f.data.id));

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Fields whose values can end up quoted in a submitted application. */
const QUOTABLE = new Set([
  'amount_requested',
  'amount_awarded',
  'deadline',
  'submitted',
  'decision_expected',
  'decision_date',
  'confirmation',
]);

for (const { file, data } of [...orgs, ...funders]) {
  if (!data.id) errors.push(`${file}: missing 'id'`);
}

for (const { file, data } of applications) {
  const at = (msg) => `${file}: ${msg}`;

  if (!data.id) errors.push(at("missing 'id'"));
  if (!data.program) errors.push(at("missing 'program'"));

  if (!data.applicant) errors.push(at("missing 'applicant'"));
  else if (!orgIds.has(data.applicant)) errors.push(at(`applicant '${data.applicant}' has no file in orgs/`));

  if (!data.funder) errors.push(at("missing 'funder'"));
  else if (!funderIds.has(data.funder)) errors.push(at(`funder '${data.funder}' has no file in funders/`));

  if (!STAGES.includes(data.stage)) errors.push(at(`stage '${data.stage}' is not one of: ${STAGES.join(', ')}`));

  for (const field of ['opened', 'deadline', 'submitted', 'decision_expected', 'decision_date']) {
    const value = data[field];
    if (value == null || value === 'rolling') continue;
    const asString = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    if (!DATE.test(asString)) errors.push(at(`${field} '${value}' is not YYYY-MM-DD`));
  }

  // The rule the whole system rests on: a figure we might quote to a funder
  // must stay null while it's unverified, so it can't be used by accident.
  // Only fields that end up in prose are policed — `stage` and the like are
  // legitimately both set and unconfirmed.
  for (const field of data.needs_verification ?? []) {
    if (QUOTABLE.has(field) && data[field] != null) {
      warnings.push(at(`'${field}' holds a value but is listed in needs_verification — verify it, or null it and keep the figure in the body`));
    }
  }

  if (data.stage === 'awarded' && data.amount_awarded == null) {
    warnings.push(at("stage is 'awarded' but amount_awarded is null"));
  }
  // A prospect legitimately has no date yet; anything being actively worked
  // does, and without one nothing will ever remind you about it.
  if (OPEN_STAGES.has(data.stage) && data.stage !== 'prospect' && !data.deadline) {
    warnings.push(at(`stage '${data.stage}' with no deadline — nothing will remind you about this one`));
  }
  if (/password|passwd|pwd/i.test(JSON.stringify(data))) {
    errors.push(at('front-matter looks like it contains a password — move it to grants/private/'));
  }
}

const line = (s) => console.log(s);
line(`Checked ${applications.length} applications, ${funders.length} funders, ${orgs.length} orgs.`);
if (errors.length) {
  line(`\n${errors.length} error(s):`);
  errors.forEach((e) => line(`  ✗ ${e}`));
}
if (warnings.length) {
  line(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => line(`  ! ${w}`));
}
if (!errors.length && !warnings.length) line('\nAll clean.');
process.exit(errors.length ? 1 : 0);
