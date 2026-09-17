'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CopyButton, ErrorNote, PostPreview, Spinner } from '@/components/ui';
import type { Format, Idea } from '@/lib/types';

interface DraftView {
  id: string;
  idea_id: string;
  idea_title: string;
  idea_source: string;
  format_name: string;
  hook: string;
  body: string;
  critique: string | null;
  status: string;
  scheduled_for: string | null;
}

export default function DraftsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <DraftsInner />
    </Suspense>
  );
}

function DraftsInner() {
  const ideaId = useSearchParams().get('idea');
  const [drafts, setDrafts] = useState<DraftView[]>([]);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [formats, setFormats] = useState<Format[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [direction, setDirection] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const url = ideaId ? `/api/ideas/${ideaId}` : '/api/drafts?status=draft';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setDrafts(d.drafts ?? []);
        if (d.idea) setIdea(d.idea);
      })
      .catch((e) => setError(String(e)));
  }, [ideaId]);

  useEffect(() => {
    load();
    fetch('/api/formats')
      .then((r) => r.json())
      .then((d) => {
        setFormats(d.formats ?? []);
        // Pre-select the three highest-weighted formats: the ones that have
        // actually earned it once you have performance data.
        setSelected((d.formats ?? []).slice(0, 3).map((f: Format) => f.id));
      });
  }, [load]);

  async function generate() {
    if (!ideaId) return;
    setBusy('Writing drafts…');
    setError(null);
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idea_id: ideaId, format_ids: selected, direction }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.usedVoice) {
        setError('No voice profile is active — drafts used a generic register. Set one up under Voice.');
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{idea ? idea.title : 'Drafts'}</h1>
        <p className="mt-1 text-sm muted">
          {idea ? idea.angle || idea.raw_text : 'Everything written but not yet approved.'}
        </p>
      </div>

      {ideaId && (
        <div className="panel space-y-4">
          <div>
            <label className="label">Formats to try ({selected.length} selected)</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => {
                const on = selected.includes(f.id);
                return (
                  <button
                    key={f.id}
                    className="btn btn-sm"
                    title={f.when_to_use}
                    style={on ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)' } : {}}
                    onClick={() =>
                      setSelected((s) => (on ? s.filter((x) => x !== f.id) : [...s, f.id]))
                    }
                  >
                    {f.name}
                    {f.weight !== 1 && <span className="muted"> {f.weight.toFixed(1)}×</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs muted">
              Hover a format to see when it works. Multipliers reflect what has actually performed for you.
            </p>
          </div>
          <div>
            <label className="label">Extra direction (optional)</label>
            <input
              className="input"
              placeholder="e.g. keep it under 120 words, lead with the number, no story"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={generate} disabled={!!busy || !selected.length}>
              Write {selected.length} draft{selected.length === 1 ? '' : 's'}
            </button>
            {busy && <Spinner label={busy} />}
          </div>
          <ErrorNote message={error} />
        </div>
      )}

      {!drafts.length && !busy && (
        <p className="text-sm muted">
          {ideaId ? 'No drafts for this idea yet.' : 'No open drafts. Start from an idea.'}
        </p>
      )}

      <div className="space-y-4">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} onPatch={patch} onDelete={remove} showIdea={!ideaId} />
        ))}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onPatch,
  onDelete,
  showIdea,
}: {
  draft: DraftView;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  showIdea: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.body);
  const [when, setWhen] = useState('');

  useEffect(() => setText(draft.body), [draft.body]);

  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}>
          {draft.format_name}
        </span>
        {showIdea && <span className="chip">{draft.idea_title}</span>}
        <span className="chip">{draft.body.length} chars</span>
        <span className="ml-auto chip">{draft.status}</span>
      </div>

      {editing ? (
        <textarea
          className="input text-sm"
          rows={Math.min(24, text.split('\n').length + 3)}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <PostPreview body={draft.body} />
      )}

      {draft.critique && !editing && (
        <p className="mt-3 rounded-md p-2 text-xs" style={{ background: 'var(--panel-2)', color: 'var(--warn)' }}>
          <strong>Model&apos;s own caveat:</strong> {draft.critique}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onPatch(draft.id, { body: text, hook: text.split('\n')[0] });
                setEditing(false);
              }}
            >
              Save edits
            </button>
            <button className="btn btn-sm" onClick={() => { setText(draft.body); setEditing(false); }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <CopyButton text={draft.body} />
            <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>
            {draft.status === 'draft' && (
              <button className="btn btn-sm" onClick={() => onPatch(draft.id, { status: 'approved' })}>
                Approve
              </button>
            )}
            <input
              className="input btn-sm w-auto"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <button
              className="btn btn-sm"
              disabled={!when}
              onClick={() => onPatch(draft.id, { status: 'scheduled', scheduled_for: new Date(when).toISOString() })}
            >
              Schedule
            </button>
            <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => onDelete(draft.id)}>
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
