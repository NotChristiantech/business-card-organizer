import Link from 'next/link';
import { Stat } from '@/components/ui';
import { getDb } from '@/lib/db';
import { getActiveVoice } from '@/lib/voice';

export const dynamic = 'force-dynamic';

interface Counts {
  ideas: number;
  drafts: number;
  queued: number;
  posted: number;
  unlogged: number;
}

function loadCounts(): Counts {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    ideas: one(`SELECT COUNT(*) AS n FROM ideas WHERE status = 'new'`),
    drafts: one(`SELECT COUNT(*) AS n FROM drafts WHERE status = 'draft'`),
    queued: one(`SELECT COUNT(*) AS n FROM drafts WHERE status IN ('approved','scheduled')`),
    posted: one(`SELECT COUNT(*) AS n FROM drafts WHERE status = 'posted'`),
    unlogged: one(
      `SELECT COUNT(*) AS n FROM drafts d
       LEFT JOIN post_stats s ON s.draft_id = d.id
       WHERE d.status = 'posted' AND s.id IS NULL`,
    ),
  };
}

export default function Dashboard() {
  const counts = loadCounts();
  const voice = getActiveVoice();

  const nextUp: { href: string; label: string; why: string } = !voice
    ? { href: '/voice', label: 'Set up your voice', why: 'Nothing else works well until drafts sound like you.' }
    : counts.unlogged > 0
      ? { href: '/performance', label: `Log stats on ${counts.unlogged} post${counts.unlogged === 1 ? '' : 's'}`, why: 'The feedback loop is the whole point — without numbers it cannot learn.' }
      : counts.queued > 0
        ? { href: '/queue', label: 'Publish from the queue', why: 'You have approved posts waiting to go out.' }
        : counts.drafts > 0
          ? { href: '/drafts', label: 'Review your drafts', why: 'Approve the good ones, discard the rest.' }
          : counts.ideas > 0
            ? { href: '/ideas', label: 'Turn an idea into posts', why: 'You have material waiting.' }
            : { href: '/ideas', label: 'Import a meeting', why: 'Your own calls are the best source of things worth saying.' };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm muted">
          {voice ? (
            <>
              Voice profile: <span style={{ color: 'var(--text)' }}>{voice.name}</span>
            </>
          ) : (
            <span style={{ color: 'var(--warn)' }}>No voice profile yet — drafts will sound generic.</span>
          )}
        </p>
      </div>

      <Link href={nextUp.href} className="panel block transition-colors hover:border-[var(--accent)]">
        <div className="text-xs uppercase tracking-wide muted">Next up</div>
        <div className="mt-1 text-lg font-medium" style={{ color: 'var(--accent)' }}>
          {nextUp.label} →
        </div>
        <div className="mt-1 text-sm muted">{nextUp.why}</div>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={counts.ideas} label="Ideas waiting" />
        <Stat value={counts.drafts} label="Open drafts" />
        <Stat value={counts.queued} label="In queue" />
        <Stat value={counts.posted} label="Posted" />
      </div>

      <div className="panel">
        <h2 className="mb-3 font-semibold">How this works</h2>
        <ol className="space-y-2 text-sm muted">
          <li>
            <strong style={{ color: 'var(--text)' }}>1. Voice</strong> — paste your best posts once. Every
            draft is then constrained by how you actually write.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>2. Ideas</strong> — mine your meetings, scan your feeds,
            capture stray thoughts. Most raw material gets rejected, which is correct.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>3. Drafts</strong> — each idea is poured into proven post
            shapes. Pick the variant that works, edit it, discard the rest.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>4. Queue</strong> — approve, schedule, copy, publish.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>5. Performance</strong> — log the numbers. Formats that
            earn engagement get picked more often next time.
          </li>
        </ol>
      </div>
    </div>
  );
}
