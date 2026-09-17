import { randomUUID } from 'node:crypto';
import { askForJson } from './claude';
import { getDb, nowIso } from './db';
import { splitCritique } from './formatting';

export interface FormatPerformance {
  format_id: string;
  format_name: string;
  posts: number;
  avg_impressions: number;
  avg_engagement: number;
  /** Engagement as a share of impressions — the comparable number across posts. */
  engagement_rate: number;
  inbound: number;
  weight: number;
}

export interface SourcePerformance {
  source: string;
  posts: number;
  avg_impressions: number;
  avg_engagement: number;
  inbound: number;
}

export function saveStats(input: {
  draft_id: string;
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
  profile_views: number;
  inbound_conversations: number;
  notes?: string | null;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO post_stats (id, draft_id, impressions, reactions, comments, reposts, profile_views, inbound_conversations, notes, recorded_at)
    VALUES (@id, @draft_id, @impressions, @reactions, @comments, @reposts, @profile_views, @inbound_conversations, @notes, @recorded_at)
    ON CONFLICT(draft_id) DO UPDATE SET
      impressions = excluded.impressions,
      reactions = excluded.reactions,
      comments = excluded.comments,
      reposts = excluded.reposts,
      profile_views = excluded.profile_views,
      inbound_conversations = excluded.inbound_conversations,
      notes = excluded.notes,
      recorded_at = excluded.recorded_at
  `).run({
    id: randomUUID(),
    draft_id: input.draft_id,
    impressions: input.impressions,
    reactions: input.reactions,
    comments: input.comments,
    reposts: input.reposts,
    profile_views: input.profile_views,
    inbound_conversations: input.inbound_conversations,
    notes: input.notes ?? null,
    recorded_at: nowIso(),
  });
}

/**
 * Engagement weights comments and reposts above reactions: a comment costs a
 * reader far more than a like, and correlates much better with reach and with
 * anyone actually contacting you.
 */
const ENGAGEMENT_SQL = `(s.reactions + s.comments * 4.0 + s.reposts * 6.0)`;

export function formatPerformance(): FormatPerformance[] {
  return getDb()
    .prepare(`
      SELECT d.format_id,
             COALESCE(f.name, d.format_id) AS format_name,
             COUNT(*) AS posts,
             AVG(s.impressions) AS avg_impressions,
             AVG(${ENGAGEMENT_SQL}) AS avg_engagement,
             CASE WHEN SUM(s.impressions) > 0
                  THEN SUM(${ENGAGEMENT_SQL}) / SUM(s.impressions) ELSE 0 END AS engagement_rate,
             SUM(s.inbound_conversations) AS inbound,
             COALESCE(f.weight, 1.0) AS weight
      FROM post_stats s
      JOIN drafts d ON d.id = s.draft_id
      LEFT JOIN formats f ON f.id = d.format_id
      GROUP BY d.format_id
      ORDER BY engagement_rate DESC
    `)
    .all() as FormatPerformance[];
}

export function sourcePerformance(): SourcePerformance[] {
  return getDb()
    .prepare(`
      SELECT i.source,
             COUNT(*) AS posts,
             AVG(s.impressions) AS avg_impressions,
             AVG(${ENGAGEMENT_SQL}) AS avg_engagement,
             SUM(s.inbound_conversations) AS inbound
      FROM post_stats s
      JOIN drafts d ON d.id = s.draft_id
      JOIN ideas i ON i.id = d.idea_id
      GROUP BY i.source
      ORDER BY avg_engagement DESC
    `)
    .all() as SourcePerformance[];
}

/**
 * Nudges format weights toward what actually performs, so the generator's
 * default format picks drift in the right direction.
 *
 * Deliberately gentle: weights move a fraction of the way toward the observed
 * ratio, formats with fewer than MIN_POSTS are left alone, and the range is
 * clamped. With single-digit sample sizes, a confident update is a wrong one.
 */
const MIN_POSTS = 2;
const LEARNING_RATE = 0.34;

export function reweightFormats(): { updated: number; skipped: number } {
  const db = getDb();
  const perf = formatPerformance();
  const eligible = perf.filter((p) => p.posts >= MIN_POSTS && p.engagement_rate > 0);

  if (!eligible.length) return { updated: 0, skipped: perf.length };

  const mean = eligible.reduce((acc, p) => acc + p.engagement_rate, 0) / eligible.length;
  const stmt = db.prepare(`UPDATE formats SET weight = ? WHERE id = ?`);

  let updated = 0;
  const tx = db.transaction(() => {
    for (const p of eligible) {
      const ratio = p.engagement_rate / mean;
      const target = Math.max(0.25, Math.min(3, ratio));
      const next = p.weight + (target - p.weight) * LEARNING_RATE;
      stmt.run(Number(next.toFixed(3)), p.format_id);
      updated++;
    }
  });
  tx();

  return { updated, skipped: perf.length - eligible.length };
}

export interface PostedSample {
  format_name: string;
  idea_source: string;
  hook: string;
  body: string;
  impressions: number;
  engagement: number;
  inbound: number;
}

export function postedWithStats(limit = 30): PostedSample[] {
  const rows = getDb()
    .prepare(`
      SELECT COALESCE(f.name, d.format_id) AS format_name,
             i.source AS idea_source,
             d.hook, d.body,
             s.impressions,
             ${ENGAGEMENT_SQL} AS engagement,
             s.inbound_conversations AS inbound
      FROM post_stats s
      JOIN drafts d ON d.id = s.draft_id
      JOIN ideas i ON i.id = d.idea_id
      LEFT JOIN formats f ON f.id = d.format_id
      ORDER BY s.recorded_at DESC
      LIMIT ?
    `)
    .all(limit) as PostedSample[];
  return rows.map((r) => ({ ...r, body: splitCritique(r.body).body }));
}

export async function generateDigest(): Promise<{ digest: string }> {
  const posts = postedWithStats(30);
  if (posts.length < 3) {
    return {
      digest:
        'Not enough posted-and-measured posts yet. Log stats on at least 3 posts and this turns into a real read on what is working.',
    };
  }

  const rendered = posts
    .map(
      (p, n) =>
        `[${n + 1}] format=${p.format_name} source=${p.idea_source} impressions=${p.impressions} engagement=${Math.round(p.engagement)} inbound=${p.inbound}\nHOOK: ${p.hook}\nPOST:\n${p.body.slice(0, 900)}`,
    )
    .join('\n\n---\n\n');

  const prompt = `Here are recent LinkedIn posts with their measured performance. "engagement" is a weighted score (reactions + 4x comments + 6x reposts). "inbound" counts conversations the post directly started — the metric that actually matters.

${rendered}

Analyse what is working and what is not. Be concrete and be willing to say the sample is too small for a given claim. Look at hooks, formats, topics, length, and where the ideas came from.

Return JSON:
{
  "digest": "A direct written analysis in markdown. Cover: what is clearly working, what is clearly not, what the data hints at but cannot yet support, and the two or three specific things to do differently in the next batch of posts. No preamble, no encouragement, no bullet-point padding."
}`;

  return askForJson<{ digest: string }>({
    system:
      'You are a sharp content analyst. You care about signal, you distrust small samples, and you say when the data cannot support a conclusion. You never pad with encouragement.',
    prompt,
    maxTokens: 2500,
    temperature: 0.4,
  });
}
