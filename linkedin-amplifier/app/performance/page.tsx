'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/ui';
import { splitCritique } from '@/lib/formatting';
import type { FormatPerformance, SourcePerformance } from '@/lib/insights';

interface PostedDraft {
  id: string;
  idea_title: string;
  format_name: string;
  body: string;
  posted_at: string | null;
  stats: {
    impressions: number;
    reactions: number;
    comments: number;
    reposts: number;
    profile_views: number;
    inbound_conversations: number;
  } | null;
}

export default function PerformancePage() {
  const [posted, setPosted] = useState<PostedDraft[]>([]);
  const [formats, setFormats] = useState<FormatPerformance[]>([]);
  const [sources, setSources] = useState<SourcePerformance[]>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/drafts?status=posted').then((r) => r.json()).then((d) => setPosted(d.drafts ?? []));
    fetch('/api/insights').then((r) => r.json()).then((d) => {
      setFormats(d.formats ?? []);
      setSources(d.sources ?? []);
    });
  }, []);

  useEffect(load, [load]);

  async function act(action: 'digest' | 'reweight', label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (action === 'digest') setDigest(data.digest);
      else setDigest(`Reweighted ${data.updated} format(s). ${data.skipped} skipped for thin data.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const unlogged = posted.filter((p) => !p.stats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="mt-1 text-sm muted">
          LinkedIn does not expose personal-post analytics to any API, so these numbers are entered by
          hand. Fifteen seconds per post is the price of the whole feedback loop working.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={!!busy} onClick={() => act('digest', 'Analysing…')}>
          What&apos;s working?
        </button>
        <button className="btn" disabled={!!busy} onClick={() => act('reweight', 'Reweighting…')}>
          Reweight formats
        </button>
        {busy && <Spinner label={busy} />}
      </div>
      <ErrorNote message={error} />

      {digest && (
        <div className="panel whitespace-pre-wrap text-sm leading-relaxed">{digest}</div>
      )}

      {!!unlogged.length && (
        <div className="space-y-3">
          <h2 className="font-semibold">
            {unlogged.length} posted, awaiting numbers
          </h2>
          {unlogged.map((p) => (
            <StatsForm key={p.id} draft={p} onSaved={load} />
          ))}
        </div>
      )}

      {!!formats.length && (
        <div className="panel">
          <h2 className="mb-3 font-semibold">By format</h2>
          <Table
            head={['Format', 'Posts', 'Avg impressions', 'Engagement rate', 'Inbound', 'Weight']}
            rows={formats.map((f) => [
              f.format_name,
              String(f.posts),
              Math.round(f.avg_impressions).toLocaleString(),
              `${(f.engagement_rate * 100).toFixed(2)}%`,
              String(f.inbound),
              `${f.weight.toFixed(2)}×`,
            ])}
          />
        </div>
      )}

      {!!sources.length && (
        <div className="panel">
          <h2 className="mb-3 font-semibold">By idea source</h2>
          <Table
            head={['Source', 'Posts', 'Avg impressions', 'Avg engagement', 'Inbound']}
            rows={sources.map((s) => [
              s.source,
              String(s.posts),
              Math.round(s.avg_impressions).toLocaleString(),
              Math.round(s.avg_engagement).toLocaleString(),
              String(s.inbound),
            ])}
          />
          <p className="mt-3 text-xs muted">
            If meeting-sourced posts outperform news-sourced ones, that is the single most useful thing
            this table can tell you — it means your own material beats commentary.
          </p>
        </div>
      )}

      {!!posted.filter((p) => p.stats).length && (
        <div className="space-y-3">
          <h2 className="font-semibold">Logged posts</h2>
          {posted
            .filter((p) => p.stats)
            .map((p) => (
              <div key={p.id} className="panel">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="chip">{p.format_name}</span>
                  <span className="chip">{p.idea_title}</span>
                  {p.posted_at && (
                    <span className="chip">{new Date(p.posted_at).toLocaleDateString()}</span>
                  )}
                </div>
                <p className="text-sm muted">{splitCritique(p.body).body.split('\n')[0]}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs muted">
                  <span>{p.stats!.impressions.toLocaleString()} impressions</span>
                  <span>{p.stats!.reactions} reactions</span>
                  <span>{p.stats!.comments} comments</span>
                  <span>{p.stats!.reposts} reposts</span>
                  <span style={{ color: p.stats!.inbound_conversations ? 'var(--good)' : undefined }}>
                    {p.stats!.inbound_conversations} inbound
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function StatsForm({ draft, onSaved }: { draft: PostedDraft; onSaved: () => void }) {
  const [values, setValues] = useState({
    impressions: '',
    reactions: '',
    comments: '',
    reposts: '',
    profile_views: '',
    inbound_conversations: '',
  });
  const [saving, setSaving] = useState(false);

  const FIELDS: [keyof typeof values, string][] = [
    ['impressions', 'Impressions'],
    ['reactions', 'Reactions'],
    ['comments', 'Comments'],
    ['reposts', 'Reposts'],
    ['profile_views', 'Profile views'],
    ['inbound_conversations', 'Inbound convos'],
  ];

  async function save() {
    setSaving(true);
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ draft_id: draft.id, ...values }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip">{draft.format_name}</span>
        <span className="chip">{draft.idea_title}</span>
      </div>
      <p className="mb-3 text-sm muted">{splitCritique(draft.body).body.split('\n')[0]}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              className="input"
              type="number"
              min={0}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-primary mt-3" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Log stats'}
      </button>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-2 text-left text-xs font-medium uppercase tracking-wide muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
              {r.map((cell, j) => (
                <td key={j} className="py-2 pr-4">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
