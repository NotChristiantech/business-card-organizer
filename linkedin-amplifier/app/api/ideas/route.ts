import { fail, ok } from '@/lib/http';
import { listIdeas } from '@/lib/ideas';
import type { IdeaStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const status = new URL(req.url).searchParams.get('status') as IdeaStatus | null;
    return ok({ ideas: listIdeas(status ?? undefined) });
  } catch (err) {
    return fail(err);
  }
}
