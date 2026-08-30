import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'contacts.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    image_path TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    ghl_contact_id TEXT,
    ghl_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
  CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
`);

// Migration for databases created before the `source` column existed.
const hasSourceColumn = (db.pragma('table_info(contacts)') as { name: string }[]).some(
  (col) => col.name === 'source'
);
if (!hasSourceColumn) {
  db.exec(`ALTER TABLE contacts ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'`);
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  image_path: string;
  source: string;
  ghl_contact_id: string | null;
  ghl_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export default db;
