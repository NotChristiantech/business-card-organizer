import { fail, ok } from '@/lib/http';
import { generateDrafts, insertDrafts, listFormats } from '@/lib/drafts';
import { getIdea, updateIdeaStatus } from '@/lib/ideas';
import { getActiveVoice } from '@/lib/voice';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const { idea_id, format_ids, direction, count } = (await req.json()) as {
      idea_id: string;
      format_ids?: string[];
      direction?: string;
      count?: number;
    };

    const idea = getIdea(idea_id);
    if (!idea) return ok({ error: 'Idea not found.' }, 404);

    const all = listFormats(true);
    let chosen = format_ids?.length ? all.filter((f) => format_ids.includes(f.id)) : [];

    // No explicit choice: take the highest-weighted formats, which drift toward
    // whatever has actually performed for you.
    if (!chosen.length) chosen = all.slice(0, Math.min(count ?? 3, all.length));
    if (!chosen.length) return ok({ error: 'No formats available.' }, 500);

    const voice = getActiveVoice();
    const variants = await generateDrafts({
      idea,
      formats: chosen,
      voiceSpec: voice?.spec ?? null,
      extraDirection: direction,
    });
    if (!variants.length) return ok({ error: 'The model returned no drafts. Try again.' }, 502);

    // Guard against the model echoing a format id we did not ask for.
    const valid = new Set(chosen.map((f) => f.id));
    for (const v of variants) {
      if (!valid.has(v.format_id)) v.format_id = chosen[0].id;
    }

    const created = insertDrafts(variants, { idea_id, voice_profile_id: voice?.id ?? null });
    updateIdeaStatus(idea_id, 'developed');

    return ok({ drafts: created, usedVoice: Boolean(voice) });
  } catch (err) {
    return fail(err);
  }
}
