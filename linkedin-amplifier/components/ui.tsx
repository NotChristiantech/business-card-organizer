'use client';

import { useState } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm muted">
      <span
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
      {label ?? 'Working…'}
    </span>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>
      {message}
    </p>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 8 ? 'var(--good)' : score >= 6 ? 'var(--warn)' : 'var(--muted)';
  return (
    <span className="chip" style={{ color, borderColor: color }}>
      {score}/10
    </span>
  );
}

/** Copy button that confirms in place — the main publishing affordance. */
export function CopyButton({ text, label = 'Copy post' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back for plain http://host.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className={`btn btn-sm ${copied ? '' : 'btn-primary'}`} onClick={copy}>
      {copied ? '✓ Copied' : label}
    </button>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="panel">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide muted">{label}</div>
    </div>
  );
}

/** LinkedIn truncates around 210 characters; showing the cut point is useful. */
export function PostPreview({ body }: { body: string }) {
  const TRUNCATE_AT = 210;
  const isLong = body.length > TRUNCATE_AT;
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {isLong ? (
        <>
          {body.slice(0, TRUNCATE_AT)}
          <span
            className="mx-1 rounded px-1 text-[10px] uppercase tracking-wide"
            style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}
            title="LinkedIn shows roughly this much before the see-more fold"
          >
            fold
          </span>
          {body.slice(TRUNCATE_AT)}
        </>
      ) : (
        body
      )}
    </div>
  );
}
