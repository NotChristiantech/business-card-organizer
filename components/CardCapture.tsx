'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from './ContactForm';
import { ContactFormState, emptyContactForm } from '@/lib/types';

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(',');
      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CardCapture() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyContactForm);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'ready' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    const data = await fileToBase64(file);
    setImageData(data);
    setStatus('extracting');

    try {
      const res = await fetch('/api/parse-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data.base64, mediaType: data.mediaType }),
      });
      if (!res.ok) throw new Error('Extraction failed');
      const parsed = await res.json();
      setForm({ ...emptyContactForm, ...parsed });
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setError("Couldn't auto-extract the card — you can still fill it in manually below.");
      setStatus('ready');
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required before saving.');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          image: imageData?.base64,
          mediaType: imageData?.mediaType,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const contact = await res.json();
      router.push(`/contacts/${contact.id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to save contact. Please try again.');
      setStatus('ready');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Business card preview" className="mx-auto mb-4 max-h-64 rounded-md" />
        ) : (
          <p className="mb-4 text-sm text-slate-500">Take a photo of a business card or upload one.</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {previewUrl ? 'Retake / choose another photo' : '📷 Add a card photo'}
        </button>
      </div>

      {status === 'extracting' && (
        <p className="text-sm text-slate-500">Reading the card…</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(status === 'ready' || status === 'saving') && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Review &amp; edit</h2>
          <ContactForm value={form} onChange={setForm} />
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving…' : 'Save contact'}
          </button>
        </div>
      )}

      {status === 'idle' && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Or enter details manually</h2>
          <ContactForm value={form} onChange={setForm} />
          <button
            onClick={handleSave}
            className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Save contact
          </button>
        </div>
      )}
    </div>
  );
}
