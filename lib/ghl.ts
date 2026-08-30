import { Contact } from './db';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

export function isGhlConfigured(): boolean {
  return Boolean(process.env.GHL_PRIVATE_TOKEN && process.env.GHL_LOCATION_ID);
}

/**
 * Upserts the contact into GoHighLevel and tags it so a GHL workflow can pick
 * it up. Keep-in-touch emails and "hasn't responded" follow-up reminders are
 * built as workflows inside GHL, not duplicated here.
 */
export async function syncContactToGhl(contact: Contact): Promise<{ id: string }> {
  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    throw new Error('GHL_PRIVATE_TOKEN / GHL_LOCATION_ID are not set — GHL sync is disabled.');
  }

  const [firstName, ...rest] = contact.name.trim().split(/\s+/);
  const body = {
    locationId,
    firstName: firstName || contact.name,
    lastName: rest.join(' '),
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    companyName: contact.company || undefined,
    address1: contact.address || undefined,
    website: contact.website || undefined,
    tags: ['business-card-scan'],
    source: 'Business Card Organizer',
    customFields: contact.title
      ? [{ key: 'job_title', field_value: contact.title }]
      : undefined,
  };

  const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GHL sync failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const id = data?.contact?.id ?? data?.id;
  if (!id) throw new Error('GHL sync succeeded but no contact id was returned.');

  return { id };
}
