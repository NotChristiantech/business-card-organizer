import { fail, ok } from '@/lib/http';
import { developManualIdea, insertIdeas } from '@/lib/ideas';
import { getActiveVoice } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { note, expertise, develop } = (await req.json()) as {
      note: string;
      expertise?: string;
      develop?: boolean;
    };
    if (!note?.trim()) return ok({ error: 'Write something first.' }, 400);

    // Quick-capture skips the model entirely: when you have a thought at 11pm
    // you want it stored in 200ms, not after an API round trip.
    if (!develop) {
      const created = insertIdeas(
        [
          {
            title: note.trim().slice(0, 80),
            raw_text: note.trim(),
            angle: '',
            audience: '',
            score: 5,
            score_reason: 'Captured raw, not yet developed.',
          },
        ],
        { source: 'manual' },
      );
      return ok({ ideas: created });
    }

    const mined = await developManualIdea({
      note: note.trim(),
      expertise,
      voice: getActiveVoice()?.spec,
    });
    return ok({ ideas: insertIdeas([mined], { source: 'manual' }) });
  } catch (err) {
    return fail(err);
  }
}
