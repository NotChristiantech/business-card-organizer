import { v4 as uuid } from 'uuid';
import db, { Contact } from './db';

export type ContactInput = Omit<
  Contact,
  'id' | 'ghl_contact_id' | 'ghl_synced_at' | 'created_at' | 'updated_at' | 'source'
> & { source?: string };

export function createContact(input: ContactInput): Contact {
  const now = new Date().toISOString();
  const contact: Contact = {
    id: uuid(),
    source: 'manual',
    ...input,
    ghl_contact_id: null,
    ghl_synced_at: null,
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO contacts
      (id, name, title, company, email, phone, website, address, notes, image_path, source, created_at, updated_at)
     VALUES (@id, @name, @title, @company, @email, @phone, @website, @address, @notes, @image_path, @source, @created_at, @updated_at)`
  ).run(contact);

  return contact;
}

export function listContacts(query?: string): Contact[] {
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    return db
      .prepare(
        `SELECT * FROM contacts
         WHERE name LIKE ? OR company LIKE ? OR email LIKE ? OR title LIKE ?
         ORDER BY created_at DESC`
      )
      .all(like, like, like, like) as Contact[];
  }
  return db.prepare(`SELECT * FROM contacts ORDER BY created_at DESC`).all() as Contact[];
}

export function getContact(id: string): Contact | undefined {
  return db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id) as Contact | undefined;
}

export function updateContact(id: string, fields: Partial<ContactInput>): Contact | undefined {
  const existing = getContact(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...fields, updated_at: new Date().toISOString() };
  db.prepare(
    `UPDATE contacts SET
      name = @name, title = @title, company = @company, email = @email,
      phone = @phone, website = @website, address = @address, notes = @notes,
      image_path = @image_path, updated_at = @updated_at
     WHERE id = @id`
  ).run(merged);

  return getContact(id);
}

export function deleteContact(id: string): void {
  db.prepare(`DELETE FROM contacts WHERE id = ?`).run(id);
}

export function markSynced(id: string, ghlContactId: string): void {
  db.prepare(
    `UPDATE contacts SET ghl_contact_id = ?, ghl_synced_at = ? WHERE id = ?`
  ).run(ghlContactId, new Date().toISOString(), id);
}
