'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorNote, ScoreBadge, Spinner } from '@/components/ui';
import type { FeedSource, Idea } from '@/lib/types';

interface Meeting { id: string; title: string; date: string | null }

export default function IdeasPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tab, setTab] = useState<'capture' | 'meetings' | 'feeds'>('capture');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expertise, setExpertise] = useState('');

  const load = useCallback(() => {
    fetch('/api/ideas')
      .then((r) => r.json())
      .then((d) => setIdeas(d.ideas ?? []))
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    load();
    // Expertise steers every mining prompt, so it is worth persisting locally.
    setExpertise(localStorage.getItem('amplifier.expertise') ?? '');
  }, [load]);

  function saveExpertise(v: string) {
    setExpertise(v);
    localStorage.setItem('amplifier.expertise', v);
  }

  async function run(label: string, url: string, body: unknown) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const n = data.ideas?.length ?? 0;
      setNotice(data.message ?? `${n} idea${n === 1 ? '' : 's'} added.`);
      load();
      return data;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const active = ideas.filter((i) => i.status !== 'archived');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Idea inbox</h1>
        <p className="mt-1 text-sm muted">
          Raw material in, post-worthy ideas out. Ideas that score low are usually right to ignore.
        </p>
      </div>

      <div className="panel">
        <label className="label">Your expertise (steers every import)</label>
        <input
          className="input"
          placeholder="e.g. B2B sales automation for home service companies"
          value={expertise}
          onChange={(e) => saveExpertise(e.target.value)}
        />
      </div>

      <div className="flex gap-1">
        {(['capture', 'meetings', 'feeds'] as const).map((t) => (
          <button
            key={t}
            className="btn btn-sm"
            style={t === tab ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
            onClick={() => setTab(t)}
          >
            {t === 'capture' ? 'Quick capture' : t === 'meetings' ? 'Meetings' : 'News feeds'}
          </button>
        ))}
      </div>

      {tab === 'capture' && <CaptureTab busy={busy} expertise={expertise} onRun={run} />}
      {tab === 'meetings' && <MeetingsTab busy={busy} expertise={expertise} onRun={run} />}
      {tab === 'feeds' && <FeedsTab busy={busy} expertise={expertise} onRun={run} />}

      {busy && <Spinner label={busy} />}
      <ErrorNote message={error} />
      {notice && <p className="text-sm" style={{ color: 'var(--good)' }}>{notice}</p>}

      <div className="space-y-3">
        <h2 className="font-semibold">
          {active.length} idea{active.length === 1 ? '' : 's'} waiting
        </h2>
        {!active.length && <p className="text-sm muted">Nothing yet. Capture a thought or import a meeting.</p>}
        {active.map((idea) => (
          <div key={idea.id} className="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreBadge score={idea.score} />
                  <span className="chip">{idea.source}</span>
                  {idea.source_label && <span className="chip">{idea.source_label}</span>}
                  {idea.status === 'developed' && (
                    <span className="chip" style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>
                      drafted
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-medium">{idea.title}</h3>
                <p className="mt-1 text-sm muted">{idea.raw_text}</p>
                {idea.angle && (
                  <p className="mt-2 text-sm">
                    <span className="muted">Angle: </span>
                    {idea.angle}
                  </p>
                )}
                {idea.score_reason && <p className="mt-1 text-xs muted">{idea.score_reason}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => router.push(`/drafts?idea=${idea.id}`)}>
                  Write posts
                </button>
                <button className="btn btn-sm" onClick={() => setStatus(idea.id, 'archived')}>
                  Archive
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type RunFn = (label: string, url: string, body: unknown) => Promise<unknown>;

function CaptureTab({ busy, expertise, onRun }: { busy: string | null; expertise: string; onRun: RunFn }) {
  const [note, setNote] = useState('');
  return (
    <div className="panel space-y-3">
      <label className="label">Capture a thought</label>
      <textarea
        className="input"
        rows={3}
        placeholder="Something a client said, a thing you keep explaining, an argument you want to make…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="btn"
          disabled={!!busy || !note.trim()}
          onClick={async () => {
            await onRun('Saving…', '/api/ideas/manual', { note, develop: false });
            setNote('');
          }}
        >
          Save raw
        </button>
        <button
          className="btn btn-primary"
          disabled={!!busy || !note.trim()}
          onClick={async () => {
            await onRun('Sharpening…', '/api/ideas/manual', { note, expertise, develop: true });
            setNote('');
          }}
        >
          Save &amp; sharpen
        </button>
      </div>
      <p className="text-xs muted">
        &quot;Save raw&quot; is instant and skips the model — use it when you just need the thought out of your head.
      </p>
    </div>
  );
}

function MeetingsTab({ busy, expertise, onRun }: { busy: string | null; expertise: string; onRun: RunFn }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    fetch('/api/fireflies')
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured);
        setMeetings(d.meetings ?? []);
      })
      .catch(() => setConfigured(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="panel">
        <h3 className="mb-2 font-medium">From Fireflies</h3>
        {configured === false && (
          <p className="text-sm muted">
            Set <code>FIREFLIES_API_KEY</code> in <code>.env.local</code> to pull meetings automatically.
            Until then, paste a transcript below — it works identically.
          </p>
        )}
        {configured && !meetings.length && <p className="text-sm muted">No recent meetings found.</p>}
        <div className="space-y-2">
          {meetings.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-md p-2" style={{ background: 'var(--panel-2)' }}>
              <div className="min-w-0">
                <div className="truncate text-sm">{m.title}</div>
                <div className="text-xs muted">{m.date ? new Date(m.date).toLocaleDateString() : ''}</div>
              </div>
              <button
                className="btn btn-sm shrink-0"
                disabled={!!busy}
                onClick={() => onRun(`Mining "${m.title}"…`, '/api/fireflies/transcript', { id: m.id, expertise })}
              >
                Mine
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel space-y-3">
        <h3 className="font-medium">Or paste a transcript</h3>
        <input className="input" placeholder="Meeting label" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="input font-mono text-xs"
          rows={8}
          placeholder="Paste the transcript here. Any format works."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button
          className="btn btn-primary"
          disabled={!!busy || !transcript.trim()}
          onClick={async () => {
            await onRun('Mining transcript…', '/api/ideas/transcript', { title, transcript, expertise });
            setTranscript('');
          }}
        >
          Mine for ideas
        </button>
        <p className="text-xs muted">
          Client names and identifying details are stripped during mining — ideas are stored anonymised.
        </p>
      </div>
    </div>
  );
}

function FeedsTab({ busy, expertise, onRun }: { busy: string | null; expertise: string; onRun: RunFn }) {
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const load = useCallback(() => {
    fetch('/api/feeds').then((r) => r.json()).then((d) => setFeeds(d.feeds ?? []));
  }, []);
  useEffect(load, [load]);

  async function add() {
    await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, label }),
    });
    setUrl('');
    setLabel('');
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="panel space-y-4">
      <div>
        <h3 className="mb-2 font-medium">RSS sources</h3>
        {!feeds.length && <p className="text-sm muted">No feeds yet. Add the publications you actually read.</p>}
        <div className="space-y-2">
          {feeds.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-md p-2" style={{ background: 'var(--panel-2)' }}>
              <div className="min-w-0">
                <div className="truncate text-sm">{f.label}</div>
                <div className="truncate text-xs muted">{f.url}</div>
              </div>
              <button className="btn btn-sm shrink-0" onClick={() => remove(f.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[2fr,1fr,auto]">
        <input className="input" placeholder="https://example.com/feed.xml" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="input" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn" onClick={add} disabled={!url.trim()}>Add feed</button>
      </div>

      <button
        className="btn btn-primary"
        disabled={!!busy || !feeds.length}
        onClick={() => onRun('Scanning feeds…', '/api/ideas/feeds', { expertise })}
      >
        Scan feeds for angles
      </button>
      <p className="text-xs muted">
        Only items where you have a genuinely distinct angle become ideas. Expect most headlines to be discarded.
      </p>
    </div>
  );
}
