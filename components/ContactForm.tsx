'use client';

import { ContactFormState } from '@/lib/types';

const FIELDS: { key: keyof ContactFormState; label: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes', multiline: true },
];

export default function ContactForm({
  value,
  onChange,
}: {
  value: ContactFormState;
  onChange: (next: ContactFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELDS.map(({ key, label, multiline }) => (
        <div key={key} className={multiline ? 'sm:col-span-2' : ''}>
          <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
          {multiline ? (
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          ) : (
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
