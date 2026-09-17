import { fail, ok } from '@/lib/http';
import { formatPerformance, generateDigest, reweightFormats, sourcePerformance } from '@/lib/insights';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    return ok({ formats: formatPerformance(), sources: sourcePerformance() });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const { action } = (await req.json()) as { action: 'digest' | 'reweight' };
    if (action === 'reweight') return ok(reweightFormats());
    if (action === 'digest') return ok(await generateDigest());
    return ok({ error: 'Unknown action.' }, 400);
  } catch (err) {
    return fail(err);
  }
}
