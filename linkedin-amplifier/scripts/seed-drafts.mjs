/**
 * Loads finished posts from JSON straight into the queue as approved drafts.
 *
 * Usage:  node scripts/seed-drafts.mjs [path]
 * Default path: data/next-7-posts.json
 *
 * Each entry creates the idea it came from and the draft itself, so the data
 * model stays honest — a draft always has a parent idea, and the Performance
 * page can still group by source later.
 *
 * File format: an array of
 *   { "title": "...", "format_id": "rk-reflection", "hook": "...",
 *     "body": "...", "note": "optional caveat shown in the UI" }
 *
 * Re-running skips any draft whose hook already exists, so you can append to
 * the file and seed again.
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || path.join('data', 'next-7-posts.json');

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

let posts;
try {
  posts = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(posts) || !posts.length) {
  console.error('Expected a non-empty JSON array of post objects.');
  process.exit(1);
}

const dbPath = path.join('data', 'amplifier.db');
if (!fs.existsSync(dbPath)) {
  console.error('data/amplifier.db does not exist yet. Start the app once (npm run dev) first.');
  process.exit(1);
}

const db = new Database(dbPath);
const now = new Date().toISOString();

const activeVoice = db.prepare('SELECT id FROM voice_profiles WHERE is_active = 1').get();
const knownFormats = new Set(db.prepare('SELECT id FROM formats').all().map((r) => r.id));

const hookExists = db.prepare('SELECT 1 FROM drafts WHERE hook = ?');
const insertIdea = db.prepare(`
  INSERT INTO ideas (id, source, source_ref, source_label, title, raw_text, angle, audience, score, score_reason, status, created_at)
  VALUES (?, 'manual', NULL, 'Seeded batch', ?, ?, NULL, NULL, 8, 'Written directly, not generated.', 'developed', ?)
`);
const insertDraft = db.prepare(`
  INSERT INTO drafts (id, idea_id, format_id, voice_profile_id, hook, body, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?)
`);

let added = 0;
let skipped = 0;
const warnings = [];

const tx = db.transaction(() => {
  for (const p of posts) {
    if (!p?.hook || !p?.body || !p?.format_id) {
      warnings.push(`Skipped an entry missing hook, body or format_id.`);
      skipped++;
      continue;
    }
    if (hookExists.get(p.hook)) {
      skipped++;
      continue;
    }
    if (!knownFormats.has(p.format_id)) {
      warnings.push(`Format "${p.format_id}" is not in the library — seed formats first.`);
      skipped++;
      continue;
    }

    const ideaId = randomUUID();
    insertIdea.run(ideaId, p.title ?? p.hook.slice(0, 70), p.body.slice(0, 400), now);

    // The note rides along as the critique so it shows in the UI next to the
    // draft, the same way a generated draft's self-critique does.
    const body = p.note ? `${p.body}\n\n<!--critique:${p.note}-->` : p.body;
    insertDraft.run(randomUUID(), ideaId, p.format_id, activeVoice?.id ?? null, p.hook, body, now, now);
    added++;
  }
});
tx();

for (const w of warnings) console.warn(`  ! ${w}`);
console.log(`Seeded ${added} approved draft(s); skipped ${skipped}.`);
if (!activeVoice) console.warn('  ! No active voice profile — drafts were linked to none.');
console.log('Open the app and go to Queue to copy and schedule them.');
