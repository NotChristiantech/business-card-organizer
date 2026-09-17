import { splitCritique } from '@/lib/formatting';
import { fail, ok } from '@/lib/http';
import { getStatsFor, listDrafts } from '@/lib/drafts';
import type { DraftStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const status = new URL(req.url).searchParams.get('status') as DraftStatus | null;
    const drafts = listDrafts(status ?? undefined).map((d) => ({
      ...d,
      ...splitCritique(d.body),
      stats: getStatsFor(d.id),
    }));
    return ok({ drafts });
  } catch (err) {
    return fail(err);
  }
}
