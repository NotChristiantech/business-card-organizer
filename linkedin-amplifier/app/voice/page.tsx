'use client';

import { useEffect, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/ui';
import type { VoiceProfile, VoiceSpec } from '@/lib/types';

export default function VoicePage() {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [name, setName] = useState('My voice');
  const [samples, setSamples] = useState('');
  const [spec, setSpec] = useState<VoiceSpec | null>(null);
  const [specText, setSpecText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/voice')
      .then((r) => r.json())
      .then((d) => {
        setVoices(d.voices ?? []);
        const active = (d.voices ?? []).find((v: VoiceProfile) => v.is_active);
        if (active) {
          setName(active.name);
          setSamples(active.sample_posts);
          setSpec(active.spec);
          setSpecText(JSON.stringify(active.spec, null, 2));
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function extract() {
    setBusy('Reading your samples…');
    setError(null);
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'extract', sample_posts: samples }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSpec(data.spec);
      setSpecText(JSON.stringify(data.spec, null, 2));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy('Saving…');
    setError(null);
    try {
      // The spec is hand-editable as JSON — the extraction is a starting point,
      // and your corrections are usually better than the model's guesses.
      const parsed = JSON.parse(specText) as VoiceSpec;
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          id: voices.find((v) => v.is_active)?.id,
          name,
          spec: parsed,
          sample_posts: samples,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSpec(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(
        e instanceof SyntaxError ? `The spec is not valid JSON: ${e.message}` : (e as Error).message,
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voice profile</h1>
        <p className="mt-1 text-sm muted">
          Paste 10–20 posts you wrote — or wish you had written. The extracted spec becomes a hard
          constraint on every draft. Edit it by hand; your corrections beat the model&apos;s guesses.
        </p>
      </div>

      <div className="panel space-y-4">
        <div>
          <label className="label">Profile name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Writing samples ({samples.length.toLocaleString()} chars)</label>
          <textarea
            className="input font-mono text-xs"
            rows={12}
            placeholder={'Paste full posts, separated by a line of dashes:\n\nFirst post text...\n\n---\n\nSecond post text...'}
            value={samples}
            onChange={(e) => setSamples(e.target.value)}
          />
          <p className="mt-1 text-xs muted">
            More is better, but quality matters more than volume. Include the posts that sound most
            like you at your best.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={extract} disabled={!!busy || samples.length < 200}>
            {spec ? 'Re-extract from samples' : 'Extract voice spec'}
          </button>
          {busy && <Spinner label={busy} />}
        </div>
        <ErrorNote message={error} />
      </div>

      {spec && (
        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Voice spec</h2>
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs" style={{ color: 'var(--good)' }}>Saved</span>}
              <button className="btn btn-sm btn-primary" onClick={save} disabled={!!busy}>
                Save &amp; activate
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SpecCard title="Summary">{spec.summary}</SpecCard>
            <SpecCard title="Tone">{spec.tone?.join(' · ')}</SpecCard>
            <SpecCard title="Never do">{spec.neverDo?.join(' · ')}</SpecCard>
            <SpecCard title="Avoids">{spec.vocabulary?.avoids?.join(' · ')}</SpecCard>
          </div>

          <div>
            <label className="label">Full spec (editable JSON)</label>
            <textarea
              className="input font-mono text-xs"
              rows={20}
              value={specText}
              onChange={(e) => setSpecText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SpecCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ background: 'var(--panel-2)' }}>
      <div className="mb-1 text-[11px] uppercase tracking-wide muted">{title}</div>
      <div className="text-sm">{children || <span className="muted">—</span>}</div>
    </div>
  );
}
