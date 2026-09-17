'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyButton, PostPreview, Spinner } from '@/components/ui';

interface QueueItem {
  id: string;
  idea_title: string;
  format_name: string;
  body: string;
  critique: string | null;
  status: string;
  scheduled_for: string | null;
  posted_at: string | null;
}

/** Groups the queue by calendar day so the week reads as a plan, not a list. */
function groupByDay(items: QueueItem[]) {
  const groups = new Map<string, QueueItem[]>();
  for (const item of items) {
    const key = item.scheduled_for
      ? new Date(item.scheduled_for).toDateString()
      : 'Unscheduled';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/drafts?status=scheduled').then((r) => r.json()),
      fetch('/api/drafts?status=approved').then((r) => r.json()),
    ])
      .then(([a, b]) => setItems([...(a.drafts ?? []), ...(b.drafts ?? [])]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function markPosted(id: string) {
    await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    });
    load();
  }

  const groups = groupByDay(items);
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Queue</h1>
        <p className="mt-1 text-sm muted">
          Approved and scheduled posts. Copy, paste into LinkedIn, mark posted — then log the numbers
          a few days later so the system learns.
        </p>
      </div>

      {loading && <Spinner label="Loading queue…" />}
      {!loading && !items.length && (
        <p className="text-sm muted">Queue is empty. Approve a draft to put it here.</p>
      )}

      {groups.map(([day, dayItems]) => (
        <div key={day} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide muted">{day}</h2>
          {dayItems.map((item) => {
            const due = item.scheduled_for && new Date(item.scheduled_for).getTime() <= now;
            return (
              <div
                key={item.id}
                className="panel"
                style={due ? { borderColor: 'var(--accent)' } : {}}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="chip">{item.format_name}</span>
                  <span className="chip">{item.idea_title}</span>
                  {item.scheduled_for && (
                    <span className="chip" style={due ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
                      {new Date(item.scheduled_for).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {due ? ' · due' : ''}
                    </span>
                  )}
                </div>
                <PostPreview body={item.body} />
                {item.critique && (
                  <p
                    className="mt-3 rounded-md p-2 text-xs"
                    style={{ background: 'var(--panel-2)', color: 'var(--warn)' }}
                  >
                    <strong>Before you post:</strong> {item.critique}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton text={item.body} label="Copy for LinkedIn" />
                  <a className="btn btn-sm" href="https://www.linkedin.com/feed/" target="_blank" rel="noreferrer">
                    Open LinkedIn ↗
                  </a>
                  <button className="btn btn-sm" onClick={() => markPosted(item.id)}>
                    Mark posted
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
