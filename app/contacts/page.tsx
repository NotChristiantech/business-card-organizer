'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Contact } from '@/lib/db';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/cards?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setContacts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Contacts</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, company, title, or email…"
        className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && contacts.length === 0 && (
        <p className="text-sm text-slate-500">
          No contacts yet.{' '}
          <Link href="/" className="underline">
            Add your first card
          </Link>
          .
        </p>
      )}

      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id}>
            <Link
              href={`/contacts/${c.id}`}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 hover:border-slate-400"
            >
              <div>
                <p className="font-medium">{c.name || 'Unnamed contact'}</p>
                <p className="text-sm text-slate-500">
                  {[c.title, c.company].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.source !== 'manual' && !c.ghl_contact_id && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    Needs review ({c.source})
                  </span>
                )}
                {c.ghl_contact_id && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                    Synced to GHL
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
