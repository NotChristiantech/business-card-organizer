import { fail, ok } from '@/lib/http';
import { insertIdeas, mineTranscript } from '@/lib/ideas';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { title, transcript, expertise, source_ref } = (await req.json()) as {
      title?: string;
      transcript: string;
      expertise?: string;
      source_ref?: string;
    };
    if (!transcript?.trim()) return ok({ error: 'No transcript provided.' }, 400);

    const label = title?.trim() || 'Pasted transcript';
    const mined = await mineTranscript({ title: label, transcript, expertise });
    if (!mined.length) {
      return ok({ ideas: [], message: 'Nothing in this transcript cleared the bar. That is a normal outcome.' });
    }

    return ok({
      ideas: insertIdeas(mined, {
        source: 'fireflies',
        source_ref: source_ref ?? null,
        source_label: label,
      }),
    });
  } catch (err) {
    return fail(err);
  }
}
