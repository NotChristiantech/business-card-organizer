import { fail, ok } from '@/lib/http';
import { listFormats } from '@/lib/drafts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ formats: listFormats(true) });
  } catch (err) {
    return fail(err);
  }
}
