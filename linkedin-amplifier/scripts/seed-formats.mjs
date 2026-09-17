/**
 * Loads a format library from JSON, replacing the generic built-in shapes with
 * ones drawn from how you actually write.
 *
 * Usage:  node scripts/seed-formats.mjs [path] [--keep-builtins]
 * Default path: data/ryan-formats.json
 *
 * By default the built-in formats are deactivated, because a library where
 * most entries do not match your voice produces bad drafts — the generator
 * picks by weight, and a generic shape that scores well on paper still reads
 * like someone else. Pass --keep-builtins to leave them enabled at a reduced
 * weight instead.
 *
 * Deactivated formats are kept in the database, not deleted, so re-enabling
 * one is a single UPDATE. Existing weights on seeded formats are overwritten
 * deliberately: this file is the source of truth for them.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const keepBuiltins = args.includes('--keep-builtins');
const file = args.find((a) => !a.startsWith('--')) || path.join('data', 'ryan-formats.json');

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

let formats;
try {
  formats = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(formats) || !formats.length) {
  console.error('Expected a non-empty JSON array of format objects.');
  process.exit(1);
}

for (const f of formats) {
  for (const k of ['id', 'name', 'description', 'skeleton', 'when_to_use']) {
    if (!f[k]) {
      console.error(`Format ${f.id || '(no id)'} is missing "${k}".`);
      process.exit(1);
    }
  }
}

const dbPath = path.join('data', 'amplifier.db');
if (!fs.existsSync(dbPath)) {
  console.error('data/amplifier.db does not exist yet. Start the app once (npm run dev) first.');
  process.exit(1);
}

const db = new Database(dbPath);
const seededIds = new Set(formats.map((f) => f.id));

const upsert = db.prepare(`
  INSERT INTO formats (id, name, description, skeleton, when_to_use, tags, weight, active)
  VALUES (@id, @name, @description, @skeleton, @when_to_use, @tags, @weight, @active)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    skeleton = excluded.skeleton,
    when_to_use = excluded.when_to_use,
    tags = excluded.tags,
    weight = excluded.weight,
    active = excluded.active
`);

let touched = 0;
let sidelined = 0;

const tx = db.transaction(() => {
  for (const f of formats) {
    upsert.run({
      id: f.id,
      name: f.name,
      description: f.description,
      skeleton: f.skeleton,
      when_to_use: f.when_to_use,
      tags: f.tags ?? '',
      weight: Number.isFinite(f.weight) ? f.weight : 1.0,
      active: f.active === 0 ? 0 : 1,
    });
    touched++;
  }

  const others = db
    .prepare('SELECT id FROM formats WHERE active = 1')
    .all()
    .filter((r) => !seededIds.has(r.id));

  for (const row of others) {
    if (keepBuiltins) {
      db.prepare('UPDATE formats SET weight = 0.4 WHERE id = ?').run(row.id);
    } else {
      db.prepare('UPDATE formats SET active = 0 WHERE id = ?').run(row.id);
    }
    sidelined++;
  }
});
tx();

console.log(`Seeded ${touched} format(s) from ${file}.`);
console.log(
  keepBuiltins
    ? `Left ${sidelined} built-in format(s) active at weight 0.4.`
    : `Deactivated ${sidelined} built-in format(s). Re-enable any with: UPDATE formats SET active = 1 WHERE id = '...';`,
);

const active = db
  .prepare('SELECT name, weight FROM formats WHERE active = 1 ORDER BY weight DESC')
  .all();
console.log('\nActive formats, highest weight first:');
for (const f of active) console.log(`  ${f.weight.toFixed(2)}x  ${f.name}`);
