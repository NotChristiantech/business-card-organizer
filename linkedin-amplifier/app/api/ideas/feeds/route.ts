import { fail, ok } from '@/lib/http';
import { insertIdeas, mineFeedItems } from '@/lib/ideas';
import { getDb, nowIso } from '@/lib/db';
import { fetchFeed } from '@/lib/rss';
import type { FeedItem } from '@/lib/rss';
import type { FeedSource } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Pulls every active feed, mines the combined headlines in one pass. */
export async function POST(req: Request) {
  try {
    const { expertise } = (await req.json().catch(() => ({}))) as { expertise?: string };
    const db = getDb();
    const sources = db
      .prepare(`SELECT * FROM feed_sources WHERE active = 1`)
      .all() as FeedSource[];

    if (!sources.length) return ok({ error: 'No feeds configured yet. Add one first.' }, 400);

    const items: FeedItem[] = [];
    const errors: string[] = [];
    for (const s of sources) {
      try {
        items.push(...(await fetchFeed(s.url, 10)));
        db.prepare(`UPDATE feed_sources SET last_fetched_at = ? WHERE id = ?`).run(nowIso(), s.id);
      } catch (err) {
        errors.push(`${s.label}: ${(err as Error).message}`);
      }
    }

    if (!items.length) {
      return ok({ error: `No feed items fetched. ${errors.join(' | ')}` }, 502);
    }

    const mined = await mineFeedItems({ items, expertise });
    const created = insertIdeas(mined, { source: 'rss', source_label: `${sources.length} feed(s)` });
    return ok({ ideas: created, scanned: items.length, errors });
  } catch (err) {
    return fail(err);
  }
}
