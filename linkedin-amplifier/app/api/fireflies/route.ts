import { fail, ok } from '@/lib/http';
import { firefliesConfigured, listRecentMeetings } from '@/lib/fireflies';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!firefliesConfigured()) {
      return ok({ configured: false, meetings: [] });
    }
    return ok({ configured: true, meetings: await listRecentMeetings(20) });
  } catch (err) {
    return fail(err);
  }
}
