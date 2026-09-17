import { splitCritique, withCritique } from '@/lib/formatting';
import { fail, ok } from '@/lib/http';
import { deleteDraft, getDraft, updateDraft } from '@/lib/drafts';
import type { DraftStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const draft = getDraft(params.id);
    if (!draft) return ok({ error: 'Draft not found.' }, 404);
    return ok({ draft: { ...draft, ...splitCritique(draft.body) } });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as {
      body?: string;
      hook?: string;
      status?: DraftStatus;
      scheduled_for?: string | null;
    };

    // The UI edits the visible text; re-attach the stored critique so editing a
    // draft does not silently throw away the model's own caveat about it.
    if (patch.body !== undefined) {
      const existing = getDraft(params.id);
      const critique = existing ? splitCritique(existing.body).critique : null;
      patch.body = withCritique(patch.body, critique);
    }

    updateDraft(params.id, patch);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteDraft(params.id);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
