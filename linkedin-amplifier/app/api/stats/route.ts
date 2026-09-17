import { fail, ok } from '@/lib/http';
import { saveStats } from '@/lib/insights';
import { getDraft, updateDraft } from '@/lib/drafts';

export const dynamic = 'force-dynamic';

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const draft_id = String(b.draft_id ?? '');
    if (!draft_id) return ok({ error: 'draft_id is required.' }, 400);

    // Check first, so a stale draft id gives a clear 404 rather than a raw
    // foreign-key error surfacing as a 500.
    if (!getDraft(draft_id)) return ok({ error: 'Draft not found.' }, 404);

    saveStats({
      draft_id,
      impressions: num(b.impressions),
      reactions: num(b.reactions),
      comments: num(b.comments),
      reposts: num(b.reposts),
      profile_views: num(b.profile_views),
      inbound_conversations: num(b.inbound_conversations),
      notes: typeof b.notes === 'string' ? b.notes : null,
    });

    // Logging stats implies it went out, so save the extra click.
    updateDraft(draft_id, { status: 'posted' });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
