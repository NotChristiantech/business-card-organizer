import { fail, ok } from '@/lib/http';
import { parseSharesCsv, toSampleBlock } from '@/lib/linkedinExport';

export const dynamic = 'force-dynamic';

/**
 * Accepts the raw text of Shares.csv from a LinkedIn data export and returns
 * cleaned writing samples. The file is parsed in memory and never stored — only
 * the samples you then choose to save land in the database.
 */
export async function POST(req: Request) {
  try {
    const { csv, limit } = (await req.json()) as { csv: string; limit?: number };
    if (!csv?.trim()) return ok({ error: 'No CSV content received.' }, 400);

    const { posts, skipped } = parseSharesCsv(csv);
    if (!posts.length) {
      return ok(
        {
          error:
            `No usable posts found. Skipped ${skipped.reshares} reshare(s) with no commentary, ` +
            `${skipped.tooShort} post(s) under the length floor, ${skipped.empty} empty row(s).`,
        },
        400,
      );
    }

    return ok({
      count: posts.length,
      skipped,
      posts: posts.slice(0, limit ?? 25),
      sample_block: toSampleBlock(posts, limit ?? 25),
    });
  } catch (err) {
    return fail(err, 400);
  }
}
