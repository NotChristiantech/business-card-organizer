/**
 * Loads a hand-authored voice profile from JSON and makes it active.
 *
 * Usage:  node scripts/seed-voice.mjs [path]
 * Default path: data/ryan-voice.json
 *
 * Use this when you already have a voice analysis you trust and do not need
 * the app to extract one from samples. A hand-authored or professionally
 * produced spec beats an extracted one — extraction is the fallback, not the
 * goal.
 *
 * File format: { "name": "...", "spec": { ...VoiceSpec } }
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || path.join('data', 'ryan-voice.json');

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

const { name, spec } = payload;
if (!name || !spec) {
  console.error('Expected an object with "name" and "spec" keys.');
  process.exit(1);
}

// Fail loudly on a malformed spec rather than letting a half-empty one become
// the active constraint on every future draft.
const REQUIRED = [
  'summary',
  'tone',
  'sentenceRhythm',
  'vocabulary',
  'hookPatterns',
  'structuralHabits',
  'pointOfView',
  'formatting',
  'neverDo',
];
const missing = REQUIRED.filter((k) => spec[k] === undefined);
if (missing.length) {
  console.error(`Spec is missing required field(s): ${missing.join(', ')}`);
  process.exit(1);
}
if (!spec.vocabulary?.favors || !spec.vocabulary?.avoids) {
  console.error('Spec.vocabulary must contain both "favors" and "avoids".');
  process.exit(1);
}

const dbPath = path.join('data', 'amplifier.db');
if (!fs.existsSync(dbPath)) {
  console.error('data/amplifier.db does not exist yet. Start the app once (npm run dev) first.');
  process.exit(1);
}

const db = new Database(dbPath);
const now = new Date().toISOString();

const existing = db.prepare('SELECT id FROM voice_profiles WHERE name = ?').get(name);
const id = existing?.id ?? randomUUID();

const tx = db.transaction(() => {
  if (existing) {
    db.prepare(
      'UPDATE voice_profiles SET spec = ?, updated_at = ? WHERE id = ?',
    ).run(JSON.stringify(spec), now, id);
  } else {
    db.prepare(
      `INSERT INTO voice_profiles (id, name, spec, sample_posts, is_active, created_at, updated_at)
       VALUES (?, ?, ?, '', 0, ?, ?)`,
    ).run(id, name, JSON.stringify(spec), now, now);
  }
  db.prepare('UPDATE voice_profiles SET is_active = 0').run();
  db.prepare('UPDATE voice_profiles SET is_active = 1 WHERE id = ?').run(id);
});
tx();

console.log(`${existing ? 'Updated' : 'Created'} voice profile "${name}" and made it active.`);
console.log(`  ${spec.tone.length} tone markers, ${spec.hookPatterns.length} hook patterns, ${spec.neverDo.length} never-do rules.`);
