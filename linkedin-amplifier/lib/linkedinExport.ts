/**
 * Importer for LinkedIn's official data export.
 *
 * LinkedIn has no API for reading your own posts, but every member can request
 * a full data archive (Settings -> Data Privacy -> Get a copy of your data),
 * which contains Shares.csv: every post you have published, with its text.
 * That file is the only reliable, ToS-compliant way to get real writing
 * samples into the voice profile.
 *
 * Expected columns (LinkedIn has renamed these over the years, so matching is
 * fuzzy): Date, ShareLink, ShareCommentary, SharedUrl, MediaUrl, Visibility.
 */

export interface ImportedPost {
  date: string | null;
  text: string;
  chars: number;
}

export interface ImportResult {
  posts: ImportedPost[];
  skipped: { reshares: number; tooShort: number; empty: number };
}

/**
 * RFC 4180 CSV parser. Post text routinely contains commas, quotes and hard
 * line breaks inside quoted fields, so splitting on commas silently corrupts
 * roughly every other row.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Normalise line endings first so CRLF files don't leave stray \r in fields.
  const text = input.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length));
}

function findColumn(header: string[], candidates: string[]): number {
  const norm = header.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  for (const cand of candidates) {
    const idx = norm.indexOf(cand);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Trailing hashtag blocks and bare URLs are noise for voice analysis. */
function cleanPostText(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

// Below roughly this length a post is almost always a congratulation or a
// one-line reshare note, which carries no voice signal. Punchy real posts do
// exist just above it, so the floor is deliberately low rather than tidy.
const MIN_CHARS = 100;

export function parseSharesCsv(csv: string, opts?: { minChars?: number }): ImportResult {
  const minChars = opts?.minChars ?? MIN_CHARS;
  const rows = parseCsv(csv);
  if (!rows.length) return { posts: [], skipped: { reshares: 0, tooShort: 0, empty: 0 } };

  const header = rows[0];
  const textIdx = findColumn(header, ['sharecommentary', 'commentary', 'text', 'postcontent']);
  const dateIdx = findColumn(header, ['date', 'createdat', 'time']);
  const sharedUrlIdx = findColumn(header, ['sharedurl', 'sharedlink']);

  if (textIdx === -1) {
    throw new Error(
      `Could not find a post-text column in this CSV. Found: ${header.join(', ')}. ` +
        'Make sure this is Shares.csv from your LinkedIn data export.',
    );
  }

  const skipped = { reshares: 0, tooShort: 0, empty: 0 };
  const posts: ImportedPost[] = [];

  for (const row of rows.slice(1)) {
    const raw = (row[textIdx] ?? '').trim();
    if (!raw) {
      // A row with a shared URL but no commentary is a bare reshare — it
      // contains none of your writing, so it would poison the voice sample.
      if (sharedUrlIdx !== -1 && (row[sharedUrlIdx] ?? '').trim()) skipped.reshares++;
      else skipped.empty++;
      continue;
    }

    const text = cleanPostText(raw);
    if (text.length < minChars) {
      skipped.tooShort++;
      continue;
    }

    posts.push({
      date: dateIdx !== -1 ? (row[dateIdx] ?? '').trim() || null : null,
      text,
      chars: text.length,
    });
  }

  // Longest first: the substantial posts carry far more voice signal than
  // one-line congratulations, and the sample budget is finite.
  posts.sort((a, b) => b.chars - a.chars);
  return { posts, skipped };
}

/** Joins selected posts into the dashed-separator format the extractor expects. */
export function toSampleBlock(posts: ImportedPost[], limit = 25): string {
  return posts
    .slice(0, limit)
    .map((p) => p.text)
    .join('\n\n---\n\n');
}
