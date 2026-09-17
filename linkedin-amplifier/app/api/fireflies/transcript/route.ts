import { fail, ok } from '@/lib/http';
import { getTranscriptText } from '@/lib/fireflies';
import { insertIdeas, mineTranscript } from '@/lib/ideas';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Fetch one meeting from Fireflies and mine it in a single call. */
export async function POST(req: Request) {
  try {
    const { id, expertise } = (await req.json()) as { id: string; expertise?: string };
    if (!id) return ok({ error: 'A meeting id is required.' }, 400);

    const { title, text } = await getTranscriptText(id);
    if (!text.trim()) return ok({ error: 'That meeting has no transcript text.' }, 400);

    const mined = await mineTranscript({ title, transcript: text, expertise });
    if (!mined.length) {
      return ok({ ideas: [], message: `Nothing in "${title}" cleared the bar.` });
    }

    return ok({
      ideas: insertIdeas(mined, { source: 'fireflies', source_ref: id, source_label: title }),
    });
  } catch (err) {
    return fail(err);
  }
}
