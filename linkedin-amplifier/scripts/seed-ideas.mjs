/**
 * Seeds the idea inbox from a local JSON file.
 *
 * Usage:  node scripts/seed-ideas.mjs [path]
 * Default path: data/starter-ideas.json  (git-ignored — your material stays
 * on your machine and out of the repository).
 *
 * File format: an array of objects
 *   { "title": "...", "raw_text": "...", "angle": "...",
 *     "audience": "...", "score": 8, "score_reason": "..." }
 *
 * Re-running is safe: an idea whose title already exists is skipped, so you can
 * append to the file and seed again without creating duplicates.
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || path.join('data', 'starter-ideas.json');

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  console.error('Create it, or pass a path: node scripts/seed-ideas.mjs my-ideas.json');
  process.exit(1);
}

let ideas;
try {
  ideas = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(ideas)) {
  console.error('Expected the file to contain a JSON array of idea objects.');
  process.exit(1);
}

const dbPath = path.join('data', 'amplifier.db');
if (!fs.existsSync(dbPath)) {
  console.error('data/amplifier.db does not exist yet. Start the app once (npm run dev) first.');
  process.exit(1);
}

const db = new Database(dbPath);
const now = new Date().toISOString();

const exists = db.prepare('SELECT 1 FROM ideas WHERE title = ?');
const insert = db.prepare(`
  INSERT INTO ideas (id, source, source_ref, source_label, title, raw_text, angle, audience, score, score_reason, status, created_at)
  VALUES (?, 'manual', NULL, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
`);

let added = 0;
let skipped = 0;

const tx = db.transaction(() => {
  for (const idea of ideas) {
    if (!idea?.title || !idea?.raw_text) {
      console.warn(`Skipping an entry with no title or raw_text.`);
      skipped++;
      continue;
    }
    if (exists.get(idea.title)) {
      skipped++;
      continue;
    }
    insert.run(
      randomUUID(),
      idea.source_label ?? 'Seeded',
      idea.title,
      idea.raw_text,
      idea.angle ?? null,
      idea.audience ?? null,
      Number.isFinite(idea.score) ? Math.round(idea.score) : 5,
      idea.score_reason ?? null,
      now,
    );
    added++;
  }
});
tx();

console.log(`Seeded ${added} idea(s); skipped ${skipped} (duplicate or invalid).`);
console.log('Open the app and go to Ideas to see them.');
