import { randomUUID } from 'node:crypto';
import { fail, ok } from '@/lib/http';
import { extractVoiceSpec, listVoices, saveVoice } from '@/lib/voice';
import type { VoiceSpec } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ voices: listVoices() });
  } catch (err) {
    return fail(err);
  }
}

/** Extract a spec from samples, or save an edited spec back. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: 'extract' | 'save';
      id?: string;
      name?: string;
      sample_posts?: string;
      spec?: VoiceSpec;
    };

    if (body.action === 'extract') {
      const samples = (body.sample_posts ?? '').trim();
      if (samples.length < 200) {
        return ok({ error: 'Paste at least a few full posts — short samples produce a useless voice spec.' }, 400);
      }
      const spec = await extractVoiceSpec(samples);
      return ok({ spec });
    }

    if (body.action === 'save') {
      if (!body.spec || !body.name) return ok({ error: 'name and spec are required.' }, 400);
      const saved = saveVoice({
        id: body.id || randomUUID(),
        name: body.name,
        spec: body.spec,
        sample_posts: body.sample_posts ?? '',
        makeActive: true,
      });
      return ok({ voice: saved });
    }

    return ok({ error: 'Unknown action.' }, 400);
  } catch (err) {
    return fail(err);
  }
}
