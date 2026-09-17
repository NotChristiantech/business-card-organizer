import { randomUUID } from 'node:crypto';
import { fail, ok } from '@/lib/http';
import { getDb } from '@/lib/db';
import type { FeedSource } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const feeds = getDb().prepare(`SELECT * FROM feed_sources ORDER BY label`).all() as FeedSource[];
    return ok({ feeds });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const { url, label } = (await req.json()) as { url: string; label?: string };
    if (!url?.trim()) return ok({ error: 'A feed URL is required.' }, 400);

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return ok({ error: 'That is not a valid URL.' }, 400);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ok({ error: 'Feed URLs must be http or https.' }, 400);
    }

    getDb()
      .prepare(
        `INSERT OR IGNORE INTO feed_sources (id, kind, url, label, active) VALUES (?, 'rss', ?, ?, 1)`,
      )
      .run(randomUUID(), parsed.toString(), label?.trim() || parsed.hostname);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return ok({ error: 'id is required.' }, 400);
    getDb().prepare(`DELETE FROM feed_sources WHERE id = ?`).run(id);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
