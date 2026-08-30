'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContactForm from '@/components/ContactForm';
import { ContactFormState, emptyContactForm } from '@/lib/types';
import { Contact } from '@/lib/db';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyContactForm);
  const [status, setStatus] = useState<'idle' | 'saving' | 'syncing'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((res) => res.json())
      .then((data: Contact) => {
        setContact(data);
        setForm({
          name: data.name,
          title: data.title,
          company: data.company,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
          notes: data.notes,
        });
      });
  }, [id]);

  async function handleSave() {
    setStatus('saving');
    const res = await fetch(`/api/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setContact(updated);
    setStatus('idle');
    setMessage('Saved.');
  }

  async function handleDelete() {
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    await fetch(`/api/cards/${id}`, { method: 'DELETE' });
    router.push('/contacts');
  }

  async function handleSyncGhl() {
    setStatus('syncing');
    setMessage(null);
    const res = await fetch(`/api/cards/${id}/sync-ghl`, { method: 'POST' });
    const data = await res.json();
    setStatus('idle');
    if (res.ok) {
      setMessage('Synced to GoHighLevel.');
      setContact((c) => (c ? { ...c, ghl_contact_id: data.ghlContactId } : c));
    } else {
      setMessage(`Sync failed: ${data.error}`);
    }
  }

  if (!contact) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{contact.name || 'Unnamed contact'}</h1>
        <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
          Delete
        </button>
      </div>

      {contact.image_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={contact.image_path} alt={contact.name} className="max-h-56 rounded-md border" />
      )}

      <div className="rounded-lg border bg-white p-4">
        <ContactForm value={form} onChange={setForm} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          <a
            href={`/api/cards/${id}/vcard`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Share as vCard
          </a>
          <button
            onClick={handleSyncGhl}
            disabled={status === 'syncing'}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {status === 'syncing'
              ? 'Syncing…'
              : contact.ghl_contact_id
                ? 'Re-sync to GoHighLevel'
                : 'Sync to GoHighLevel'}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        {contact.ghl_synced_at && (
          <p className="mt-1 text-xs text-slate-400">
            Last synced {new Date(contact.ghl_synced_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
