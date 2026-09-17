import { splitCritique } from '@/lib/formatting';
import { fail, ok } from '@/lib/http';
import { deleteIdea, getIdea, updateIdeaStatus } from '@/lib/ideas';
import { listDraftsForIdea } from '@/lib/drafts';
import type { IdeaStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const idea = getIdea(params.id);
    if (!idea) return ok({ error: 'Idea not found.' }, 404);
    const drafts = listDraftsForIdea(params.id).map((d) => ({ ...d, ...splitCritique(d.body) }));
    return ok({ idea, drafts });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = (await req.json()) as { status: IdeaStatus };
    updateIdeaStatus(params.id, status);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteIdea(params.id);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
