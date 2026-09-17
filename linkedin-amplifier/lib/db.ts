import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_FORMATS } from './formats';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'amplifier.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      spec TEXT NOT NULL,
      sample_posts TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_ref TEXT,
      source_label TEXT,
      title TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      angle TEXT,
      audience TEXT,
      score INTEGER,
      score_reason TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS formats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      skeleton TEXT NOT NULL,
      when_to_use TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      weight REAL NOT NULL DEFAULT 1.0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      format_id TEXT NOT NULL,
      voice_profile_id TEXT,
      hook TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_for TEXT,
      posted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status, scheduled_for);

    CREATE TABLE IF NOT EXISTS post_stats (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL UNIQUE REFERENCES drafts(id) ON DELETE CASCADE,
      impressions INTEGER NOT NULL DEFAULT 0,
      reactions INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      reposts INTEGER NOT NULL DEFAULT 0,
      profile_views INTEGER NOT NULL DEFAULT 0,
      inbound_conversations INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feed_sources (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'rss',
      url TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      last_fetched_at TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  seedFormats(db);

  _db = db;
  return db;
}

/**
 * Formats are seeded by stable id, so editing the library in code adds new
 * entries on next boot without clobbering weights you've earned from real
 * performance data.
 */
function seedFormats(db: Database.Database) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO formats (id, name, description, skeleton, when_to_use, tags, weight, active)
    VALUES (@id, @name, @description, @skeleton, @when_to_use, @tags, 1.0, 1)
  `);
  const tx = db.transaction(() => {
    for (const f of SEED_FORMATS) insert.run(f);
  });
  tx();
}

export function nowIso(): string {
  return new Date().toISOString();
}
